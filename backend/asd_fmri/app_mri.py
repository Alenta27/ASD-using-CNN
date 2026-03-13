"""
Flask Web Application for MRI-based ASD Detection
This application provides a web interface for uploading NIfTI MRI scans
and predicting ASD diagnosis using a trained SVM model.
"""

import os
import numpy as np
import joblib
import pickle
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from nilearn import datasets, connectome
from nilearn.maskers import NiftiLabelsMasker
import traceback

# ============================================================
# CONFIGURATION
# ============================================================

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Configuration
UPLOAD_FOLDER = 'mri_uploads'
ALLOWED_EXTENSIONS = {'gz', 'nii'}  # .nii.gz files
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================================
# LOAD MODEL AND PREPROCESSING TOOLS
# ============================================================

print("="*70)
print("INITIALIZING MRI-BASED ASD DETECTION APPLICATION")
print("="*70)

# Global variables for model and preprocessing tools
model = None
scaler = None
masker = None
correlation_measure = None

MODEL_FILENAME = 'asd_mri_model_new.pkl'
SCALER_FILENAME = 'scaler.pkl'
TRAINING_DATASET_INFO = 'ABIDE dataset (Stanford, UCLA, Caltech, Oregon, Michigan)'

# Set dynamically at startup from loaded model
EXPECTED_FEATURES = None


def load_serialized_model(model_path):
    """Load model with joblib first, then fallback to pickle for compatibility."""
    try:
        return joblib.load(model_path), 'joblib'
    except Exception:
        with open(model_path, 'rb') as f:
            return pickle.load(f), 'pickle'


def compute_class_probabilities(model_obj, features_2d, prediction_value):
    """Return (control_probability, asd_probability) using available model APIs."""
    if hasattr(model_obj, 'predict_proba'):
        probs = model_obj.predict_proba(features_2d)[0]
        if len(probs) >= 2:
            return float(probs[0]), float(probs[1])

    if hasattr(model_obj, 'decision_function'):
        decision = float(np.ravel(model_obj.decision_function(features_2d))[0])
        asd_prob = float(1.0 / (1.0 + np.exp(-decision)))
        return float(1.0 - asd_prob), asd_prob

    asd_prob = 1.0 if int(prediction_value) == 1 else 0.0
    return float(1.0 - asd_prob), float(asd_prob)

def initialize_model():
    """Load the trained model, scaler, and preprocessing tools."""
    global model, scaler, masker, correlation_measure
    
    try:
        # Load model and scaler
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base_dir, MODEL_FILENAME)
        scaler_path = os.path.join(base_dir, SCALER_FILENAME)
        
        print(f"\n[1/3] Loading trained model from: {model_path}")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        model, loader_used = load_serialized_model(model_path)
        print(f"  ✓ Model loaded successfully using {loader_used}")
        print(f"  ✓ Training data: {TRAINING_DATASET_INFO}")

        # Detect how many features the model actually expects
        global EXPECTED_FEATURES
        if hasattr(model, 'n_features_in_'):
            EXPECTED_FEATURES = int(model.n_features_in_)
        elif hasattr(model, 'support_vectors_'):
            EXPECTED_FEATURES = int(model.support_vectors_.shape[1])
        else:
            EXPECTED_FEATURES = 1128  # fallback default
        print(f"  ✓ Model expects {EXPECTED_FEATURES} input features")

        print(f"\n[2/3] Loading scaler from: {scaler_path}")
        if os.path.exists(scaler_path):
            candidate_scaler = joblib.load(scaler_path)
            scaler_features = getattr(candidate_scaler, 'n_features_in_', None)
            if scaler_features is not None and scaler_features != EXPECTED_FEATURES:
                print(f"  ⚠ Scaler expects {scaler_features} features but model expects {EXPECTED_FEATURES}.")
                print(f"  ⚠ Scaler is incompatible — skipping it. Retrain with train_abide2_model.py to fix.")
                scaler = None
            else:
                scaler = candidate_scaler
                print("  ✓ Scaler loaded and verified compatible")
        else:
            scaler = None
            print("  ⚠ Scaler file not found. Using model without external scaler.")
        
        # Load atlas and initialize preprocessing tools
        print("\n[3/3] Initializing preprocessing tools...")
        atlas = datasets.fetch_atlas_harvard_oxford('cort-maxprob-thr25-2mm')
        atlas_filename = atlas.maps
        masker = NiftiLabelsMasker(labels_img=atlas_filename, standardize=True)
        correlation_measure = connectome.ConnectivityMeasure(kind='correlation')
        print("  ✓ Harvard-Oxford Atlas loaded")
        print("  ✓ Preprocessing tools initialized")
        
        print("\n" + "="*70)
        print("✅ APPLICATION READY TO ACCEPT REQUESTS")
        print("="*70)
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR during initialization: {e}")
        print(traceback.format_exc())
        return False

# Initialize on startup
initialization_success = initialize_model()

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension."""
    # Check for .nii.gz or .nii
    return filename.endswith('.nii.gz') or filename.endswith('.nii')

def process_mri_scan(scan_path):
    """
    Process a single MRI scan and extract connectivity features.

    Args:
        scan_path: Path to the NIfTI file (.nii.gz)

    Returns:
        numpy array: Feature vector (upper triangle of connectivity matrix)
    """
    import nibabel as nib
    try:
        img = nib.load(scan_path)
        img_shape = img.shape

        # Reject structural/anatomical 3D MRI — cannot compute connectivity
        if len(img_shape) == 3:
            raise ValueError(
                "Structural MRI detected (3D image). "
                "This tool requires a 4D resting-state fMRI scan (e.g. rest.nii.gz or bold.nii.gz). "
                "Anatomical files like anat.nii.gz cannot be used for connectivity analysis."
            )
        if len(img_shape) != 4:
            raise ValueError(
                f"Unexpected image dimensions: {len(img_shape)}D. Expected a 4D fMRI scan."
            )
        n_timepoints = img_shape[3]
        if n_timepoints < 50:
            raise ValueError(
                f"Only {n_timepoints} time points found. At least 50 are required for reliable "
                f"connectivity analysis. Ensure you upload a full resting-state fMRI scan."
            )

        # Extract time series from the fMRI scan
        time_series = masker.fit_transform(scan_path)

        if time_series.ndim == 1:
            time_series = time_series.reshape(-1, 1)

        # Compute connectivity matrix (correlation)
        correlation_matrix = correlation_measure.fit_transform([time_series])[0]

        # Extract upper triangle as feature vector
        upper_triangle = correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)]

        # Align feature vector length to what the model expects
        n_expected = EXPECTED_FEATURES or 1128
        if len(upper_triangle) < n_expected:
            upper_triangle = np.pad(upper_triangle, (0, n_expected - len(upper_triangle)), mode='constant')
        elif len(upper_triangle) > n_expected:
            upper_triangle = upper_triangle[:n_expected]

        return upper_triangle

    except ValueError:
        raise  # re-raise user-facing validation errors as-is
    except Exception as e:
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
        # Reshape features for prediction
        features = features.reshape(1, -1)
        
        # Scale features if a standalone scaler is available
        features_input = scaler.transform(features) if scaler is not None else features
        
        # Make prediction
        prediction = int(model.predict(features_input)[0])

        # Get probability estimates (model API dependent)
        control_probability, asd_probability = compute_class_probabilities(model, features_input, prediction)
        
        # Interpret results
        diagnosis = "ASD" if prediction == 1 else "Control"
        prediction_label = "ASD Detected" if prediction == 1 else "No ASD Detected"
        confidence = asd_probability if prediction == 1 else control_probability
        
        return {
            "prediction": prediction_label,
            "diagnosis": diagnosis,
            "confidence": float(confidence),
            "asd_probability": float(asd_probability),
            "control_probability": float(control_probability)
        }
        
    except Exception as e:
        raise Exception(f"Error making prediction: {str(e)}")

# ============================================================
# ROUTES
# ============================================================

@app.route('/')
def home():
    """Serve the main page."""
    return render_template('mri_screener.html')

@app.route('/predict_mri', methods=['POST'])
def predict_mri():
    """
    Unique endpoint for MRI-based ASD prediction.
    Accepts a .nii.gz file and returns diagnosis prediction.
    """
    # Check if model is loaded
    if not initialization_success or model is None:
        return jsonify({
            "error": "Model not initialized. Please check server logs."
        }), 500
    
    # Check if file is present in request (support multiple field names for compatibility)
    upload_key = None
    for candidate_key in ('mri_file', 'mri_scan', 'file'):
        if candidate_key in request.files:
            upload_key = candidate_key
            break

    if upload_key is None:
        return jsonify({
            "error": "No MRI file provided. Please upload using mri_file, mri_scan, or file field."
        }), 400
    
    file = request.files[upload_key]
    
    # Check if file is selected
    if file.filename == '':
        return jsonify({
            "error": "No file selected. Please choose a file to upload."
        }), 400
    
    # Check file extension
    if not allowed_file(file.filename):
        return jsonify({
            "error": "Invalid file format. Please upload a .nii or .nii.gz file."
        }), 400
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        print(f"\n📁 Processing uploaded file: {filename}")
        
        # Process MRI scan and extract features
        print("  [1/3] Extracting connectivity features...")
        features = process_mri_scan(filepath)
        print(f"  ✓ Extracted {len(features)} features")
        
        # Make prediction
        print("  [2/3] Making prediction...")
        result = predict_asd(features)
        print(f"  ✓ Prediction: {result['diagnosis']} (confidence: {result['confidence']:.2%})")
        
        # Clean up uploaded file
        print("  [3/3] Cleaning up...")
        os.remove(filepath)
        print("  ✓ Temporary file removed")
        
        print(f"✅ Request completed successfully\n")
        
        # Return prediction result
        return jsonify({
            "success": True,
            "prediction": result['prediction'],
            "diagnosis": result['diagnosis'],
            "confidence": result['confidence'],
            "asd_probability": result['asd_probability'],
            "control_probability": result['control_probability'],
            "dataset": TRAINING_DATASET_INFO,
            "message": f"Analysis complete. {result['prediction']} with {result['confidence']:.1%} confidence."
        })
        
    except Exception as e:
        print(f"❌ Error processing request: {e}")
        print(traceback.format_exc())
        
        # Clean up file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({
            "error": f"An error occurred during processing: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the service is running."""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "preprocessing_ready": masker is not None and correlation_measure is not None
    })

# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == '__main__':
    if not initialization_success:
        print("\n⚠️  WARNING: Application started but model initialization failed.")
        print("Please ensure the following files exist:")
        print(f"  • {MODEL_FILENAME}")
        print("  • scaler.pkl")
        print("\nRun 'python train_and_save_model.py' to generate these files.\n")
    
    print("\n" + "="*70)
    print("STARTING FLASK SERVER")
    print("="*70)
    print("Server will run on: http://localhost:5002")
    print("Endpoint: /predict_mri")
    print("Press CTRL+C to stop the server")
    print("="*70 + "\n")
    
    # Run on port 5002 to avoid conflicts with existing applications
    app.run(host='0.0.0.0', port=5002, debug=True)