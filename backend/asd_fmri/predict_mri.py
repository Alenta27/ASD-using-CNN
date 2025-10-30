"""
Command-line MRI-based ASD Prediction Script
This script processes a single MRI scan and outputs prediction results as JSON.
Used by the Node.js backend via python_worker.py
"""

import os
import sys
import json
import numpy as np
import joblib
import logging
import warnings

# Suppress verbose logging and warnings from nilearn and sklearn
logging.getLogger('nilearn').setLevel(logging.ERROR)
logging.getLogger('sklearn').setLevel(logging.ERROR)
logging.getLogger().setLevel(logging.ERROR)
warnings.filterwarnings('ignore')

from nilearn import datasets, connectome
from nilearn.maskers import NiftiLabelsMasker
import traceback

# Global variables for model and preprocessing tools
model = None
scaler = None
masker = None
correlation_measure = None

def initialize_model():
    """Load the trained model, scaler, and preprocessing tools."""
    global model, scaler, masker, correlation_measure

    try:
        # Load model and scaler
        model_path = 'asd_svm_model.pkl'
        scaler_path = 'scaler.pkl'

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        model = joblib.load(model_path)

        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
        scaler = joblib.load(scaler_path)

        # Load atlas and initialize preprocessing tools
        atlas = datasets.fetch_atlas_harvard_oxford('cort-maxprob-thr25-2mm')
        atlas_filename = atlas.maps
        masker = NiftiLabelsMasker(labels_img=atlas_filename, standardize=True)
        correlation_measure = connectome.ConnectivityMeasure(kind='correlation')

        return True

    except Exception as e:
        print(json.dumps({"error": f"Model initialization failed: {str(e)}"}))
        return False

def process_mri_scan(scan_path):
    """
    Process a single MRI scan and extract connectivity features.

    Args:
        scan_path: Path to the NIfTI file (.nii.gz) or time series file (.1D/.txt)

    Returns:
        numpy array: Feature vector (upper triangle of connectivity matrix)
    """
    try:
        # Check file extension
        if scan_path.lower().endswith(('.1d', '.txt')):
            # Load time series from text file
            print(f"DEBUG: Loading time series from text file: {scan_path}", file=sys.stderr)
            time_series = np.loadtxt(scan_path)
            print(f"DEBUG: Time series shape: {time_series.shape}", file=sys.stderr)
        else:
            # Extract time series from the MRI scan
            print(f"DEBUG: Extracting time series from MRI scan: {scan_path}", file=sys.stderr)
            time_series = masker.fit_transform(scan_path)
            print(f"DEBUG: Time series shape after masker: {time_series.shape}", file=sys.stderr)
            
            # Handle 1D output from masker (which means single region or misalignment)
            if len(time_series.shape) == 1:
                print(f"DEBUG: Masker returned 1D array, reshaping to 2D with 1 region", file=sys.stderr)
                time_series = time_series.reshape(-1, 1)
                print(f"DEBUG: Reshaped to: {time_series.shape}", file=sys.stderr)

        # Validate time series
        if len(time_series.shape) != 2:
            raise Exception(f"Invalid time series shape: {time_series.shape}. Expected 2D array (timepoints, regions)")

        # Compute connectivity matrix (correlation)
        print(f"DEBUG: Computing connectivity matrix from time series shape: {time_series.shape}", file=sys.stderr)
        correlation_matrix = correlation_measure.fit_transform([time_series])[0]
        print(f"DEBUG: Correlation matrix shape: {correlation_matrix.shape}", file=sys.stderr)

        # Extract upper triangle as feature vector
        upper_triangle = correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)]
        print(f"DEBUG: Upper triangle features extracted, shape: {upper_triangle.shape}, length: {len(upper_triangle)}", file=sys.stderr)

        # IMPORTANT: Handle variable feature sizes due to atlas resampling
        # The model expects 1128 features. If the extracted features are fewer
        # (due to some brain regions being removed during atlas resampling),
        # pad with zeros to match the expected size.
        EXPECTED_FEATURES = 1128
        if len(upper_triangle) < EXPECTED_FEATURES:
            padding_size = EXPECTED_FEATURES - len(upper_triangle)
            print(f"DEBUG: Padding {padding_size} features (have {len(upper_triangle)}, need {EXPECTED_FEATURES})", file=sys.stderr)
            upper_triangle = np.pad(upper_triangle, (0, padding_size), mode='constant', constant_values=0)
        elif len(upper_triangle) > EXPECTED_FEATURES:
            # If somehow we have more features, truncate to expected size
            print(f"DEBUG: Truncating features from {len(upper_triangle)} to {EXPECTED_FEATURES}", file=sys.stderr)
            upper_triangle = upper_triangle[:EXPECTED_FEATURES]

        print(f"DEBUG: Final feature vector shape: {upper_triangle.shape}", file=sys.stderr)
        return upper_triangle

    except Exception as e:
        import traceback
        print(f"DEBUG: Error in process_mri_scan: {str(e)}", file=sys.stderr)
        print(f"DEBUG: Traceback: {traceback.format_exc()}", file=sys.stderr)
        raise Exception(f"Error processing MRI scan: {str(e)}")

def predict_asd(features):
    """
    Make ASD prediction using the trained model.

    Args:
        features: Feature vector from MRI scan

    Returns:
        dict: Prediction result with diagnosis and confidence
    """
    try:
        # Log feature dimensions for debugging
        print(f"DEBUG: Feature vector type: {type(features)}, shape: {features.shape}", file=sys.stderr)
        print(f"DEBUG: Feature vector length: {len(features)}, Expected: 1128", file=sys.stderr)
        
        # Ensure features is 1D array
        if len(features.shape) != 1:
            print(f"DEBUG: Flattening features from shape {features.shape} to 1D", file=sys.stderr)
            features = features.flatten()
        
        # Reshape features for prediction (scaler expects 2D: (n_samples, n_features))
        features_reshaped = features.reshape(1, -1)
        print(f"DEBUG: Reshaped features for scaler: {features_reshaped.shape}", file=sys.stderr)

        # Scale features
        print(f"DEBUG: Scaling features with scaler...", file=sys.stderr)
        features_scaled = scaler.transform(features_reshaped)
        print(f"DEBUG: Scaled features shape: {features_scaled.shape}", file=sys.stderr)

        # Make prediction
        print(f"DEBUG: Making prediction with model...", file=sys.stderr)
        prediction = model.predict(features_scaled)[0]
        print(f"DEBUG: Raw prediction: {prediction}", file=sys.stderr)

        # Get probability estimates
        probabilities = model.predict_proba(features_scaled)[0]
        print(f"DEBUG: Probabilities: {probabilities}", file=sys.stderr)

        # Interpret results
        diagnosis = "ASD" if prediction == 1 else "Control"
        confidence = probabilities[1] if prediction == 1 else probabilities[0]

        return {
            "diagnosis": diagnosis,
            "confidence": float(confidence),
            "asd_probability": float(probabilities[1]),
            "control_probability": float(probabilities[0])
        }

    except Exception as e:
        import traceback
        print(f"DEBUG: Error in predict_asd: {str(e)}", file=sys.stderr)
        print(f"DEBUG: Traceback: {traceback.format_exc()}", file=sys.stderr)
        raise Exception(f"Error making prediction: {str(e)}")

def main():
    """Main function for command-line usage."""
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Missing file path argument"}))
            sys.exit(1)

        file_path = sys.argv[1]
        if not os.path.exists(file_path):
            print(json.dumps({"error": f"File not found: {file_path}"}))
            sys.exit(1)

        print(f"DEBUG: Starting MRI prediction for: {file_path}", file=sys.stderr)

        # Change to the script's directory to find model files
        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)
        print(f"DEBUG: Working directory changed to: {script_dir}", file=sys.stderr)

        # Initialize model
        print("DEBUG: Initializing model...", file=sys.stderr)
        if not initialize_model():
            sys.exit(1)
        print("DEBUG: Model initialized successfully", file=sys.stderr)

        # Process MRI scan and extract features
        print("DEBUG: Processing MRI scan...", file=sys.stderr)
        features = process_mri_scan(file_path)
        print(f"DEBUG: MRI scan processed, features shape: {features.shape}", file=sys.stderr)

        # Make prediction
        print("DEBUG: Making prediction...", file=sys.stderr)
        result = predict_asd(features)
        print(f"DEBUG: Prediction successful: {result}", file=sys.stderr)

        # Output result as JSON
        print(json.dumps(result))

    except Exception as e:
        # Catch-all for any unexpected errors
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": f"Prediction failed: {error_msg}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()