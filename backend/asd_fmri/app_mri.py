"""
Flask Web Application for MRI-based ASD Detection
This application provides a web interface for uploading NIfTI MRI scans
and predicting ASD diagnosis using a trained SVM model.
"""

import os
import numpy as np
import joblib
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

def initialize_model():
    """Load the trained model, scaler, and preprocessing tools."""
    global model, scaler, masker, correlation_measure
    
    try:
        # Load model and scaler
        model_path = 'asd_svm_model.pkl'
        scaler_path = 'scaler.pkl'
        
        print(f"\n[1/3] Loading trained model from: {model_path}")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        model = joblib.load(model_path)
        print("  ✓ Model loaded successfully")
        
        print(f"\n[2/3] Loading scaler from: {scaler_path}")
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
        scaler = joblib.load(scaler_path)
        print("  ✓ Scaler loaded successfully")
        
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
    try:
        # Extract time series from the MRI scan
        time_series = masker.fit_transform(scan_path)
        
        # Compute connectivity matrix (correlation)
        correlation_matrix = correlation_measure.fit_transform([time_series])[0]
        
        # Extract upper triangle as feature vector
        upper_triangle = correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)]
        
        return upper_triangle
        
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
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        
        # Get probability estimates
        probabilities = model.predict_proba(features_scaled)[0]
        
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
    
    # Check if file is present in request
    if 'mri_file' not in request.files:
        return jsonify({
            "error": "No MRI file provided. Please upload a .nii.gz file."
        }), 400
    
    file = request.files['mri_file']
    
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
            "diagnosis": result['diagnosis'],
            "confidence": result['confidence'],
            "asd_probability": result['asd_probability'],
            "control_probability": result['control_probability'],
            "message": f"Analysis complete. Diagnosis: {result['diagnosis']} with {result['confidence']:.1%} confidence."
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
        print("  • asd_svm_model.pkl")
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