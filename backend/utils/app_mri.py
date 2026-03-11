from flask import Flask, request, jsonify
from flask_cors import CORS # 1. Import CORS
import os
import joblib
import numpy as np
import werkzeug.utils
from pathlib import Path
import nibabel as nib

from nilearn import datasets
from nilearn.maskers import NiftiLabelsMasker
from nilearn.connectome import ConnectivityMeasure

app = Flask(__name__)
CORS(app) # 2. Initialize CORS for your app

# --- Load the saved model, scaler, and atlas ---
backend_dir = Path(__file__).parent.parent
asd_fmri_dir = backend_dir / 'asd_fmri'
model = joblib.load(asd_fmri_dir / 'asd_svm_model.pkl')
scaler = joblib.load(asd_fmri_dir / 'scaler.pkl')
atlas = datasets.fetch_atlas_harvard_oxford('cort-maxprob-thr25-2mm')

# --- Create the tools for feature extraction ---
masker = NiftiLabelsMasker(
    labels_img=atlas.maps, 
    standardize=True, 
    memory='nilearn_cache',
    resampling_target='labels'  # Resample data to match atlas, not vice versa
)
correlation_measure = ConnectivityMeasure(kind='correlation')

# Expected number of features based on 48 regions
EXPECTED_FEATURES = 1128  # 48 * 47 / 2

def process_new_scan(scan_path):
    try:
        # First, validate the input file
        print(f"Loading MRI file: {scan_path}")
        img = nib.load(scan_path)
        img_shape = img.shape
        print(f"MRI image shape: {img_shape}")
        
        # REJECT 3D structural MRI scans - they cannot be used for connectivity analysis
        if len(img_shape) == 3:
            print("ERROR: This is a 3D structural MRI (T1/MPRAGE/anatomical)")
            return None, ("⚠️ Structural MRI Detected\n\n"
                         "This appears to be a structural/anatomical MRI scan (like T1-weighted MPRAGE). "
                         "This tool requires functional MRI (fMRI) scans with time-series data.\n\n"
                         "Please upload a 4D resting-state or task-based fMRI scan (typically named rest.nii.gz, bold.nii.gz, or similar).")
        
        # Check if it's a 4D functional MRI (should have time dimension)
        if len(img_shape) != 4:
            print(f"Error: Expected 4D functional MRI (x, y, z, time), got {len(img_shape)}D")
            return None, f"Expected 4D fMRI scan with time-series data. Got {len(img_shape)}D image."
        
        n_timepoints = img_shape[3]
        print(f"Number of timepoints: {n_timepoints}")
        
        # Require sufficient timepoints for reliable correlation (training data had ~150+)
        if n_timepoints < 50:
            print(f"Error: Insufficient timepoints ({n_timepoints}). Need at least 50 for reliable correlation analysis.")
            return None, (f"The fMRI scan has only {n_timepoints} timepoints. "
                         f"Reliable connectivity analysis requires at least 50 timepoints. "
                         f"The model was trained on scans with ~150+ timepoints.")
        
        # Extract time series from the scan
        time_series = masker.fit_transform(scan_path)
        
        # Debug: Check the shape of time_series
        print(f"Time series shape: {time_series.shape}")
        
        # Validate time series dimensions
        if time_series.ndim != 2:
            print(f"Error: Expected 2D time series, got {time_series.ndim}D")
            return None, "Failed to extract valid time series from the MRI scan."
        
        # Compute connectivity matrix
        correlation_matrix = correlation_measure.fit_transform([time_series])[0]
        
        # Get the number of regions
        n_regions = correlation_matrix.shape[0]
        expected_regions = 48
        
        print(f"Extracted {n_regions} regions, expected {expected_regions}")
        
        upper_triangle_indices = np.triu_indices(correlation_matrix.shape[0], k=1)
        feature_vector = correlation_matrix[upper_triangle_indices]
        
        # Check for NaN values BEFORE padding - this indicates data quality issues
        nan_count = np.isnan(feature_vector).sum()
        if nan_count > 0:
            print(f"ERROR: Found {nan_count} NaN values in connectivity matrix!")
            return None, (f"Data quality issue: {nan_count} invalid correlations detected. "
                         f"This usually means the scan has insufficient signal or preprocessing issues. "
                         f"Please ensure the fMRI scan is properly preprocessed.")
        
        # Check if we have the right number of features
        if len(feature_vector) != EXPECTED_FEATURES:
            print(f"Warning: Got {len(feature_vector)} features, expected {EXPECTED_FEATURES}")
            # Pad with zeros if we have fewer features
            if len(feature_vector) < EXPECTED_FEATURES:
                padded_vector = np.zeros(EXPECTED_FEATURES)
                padded_vector[:len(feature_vector)] = feature_vector
                feature_vector = padded_vector
                print(f"Padded features to {EXPECTED_FEATURES}")
            else:
                # Truncate if we have more
                feature_vector = feature_vector[:EXPECTED_FEATURES]
                print(f"Truncated features to {EXPECTED_FEATURES}")
        
        return feature_vector.reshape(1, -1), None
    except Exception as e:
        error_msg = str(e)
        print(f"Error during MRI processing: {error_msg}")
        import traceback
        traceback.print_exc()
        return None, f"MRI processing failed: {error_msg}"

@app.route('/predict_mri', methods=['POST'])
def predict():
    if 'mri_scan' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['mri_scan']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = werkzeug.utils.secure_filename(file.filename)
    upload_folder = 'temp_uploads'
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    features, error_message = process_new_scan(filepath)

    if features is not None:
        try:
            scaled_features = scaler.transform(features)
            prediction = model.predict(scaled_features)
            probabilities = model.predict_proba(scaled_features)[0]
            
            # probabilities[0] = Control probability, probabilities[1] = ASD probability
            control_prob = float(probabilities[0])
            asd_prob = float(probabilities[1])
            
            diagnosis = "ASD" if prediction[0] == 1 else "Control"
            confidence = float(max(probabilities))
            
            os.remove(filepath)
            
            return jsonify({
                'diagnosis': diagnosis,
                'confidence': confidence,
                'asd_probability': asd_prob,
                'control_probability': control_prob
            })
        except Exception as e:
            print(f"Prediction error: {e}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({'error': f'Prediction failed: {str(e)}'}), 500
    else:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': error_message or 'Failed to process MRI scan'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)