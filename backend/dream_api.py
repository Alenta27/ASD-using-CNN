"""
DREAM Dataset Analysis API Server
Flask REST API for serving DREAM dataset feature extraction
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
from dream_feature_extractor import DREAMFeatureExtractor
import os
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Initialize feature extractor
try:
    extractor = DREAMFeatureExtractor()
    logger.info("✅ DREAM Feature Extractor initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize feature extractor: {e}")
    extractor = None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'DREAM Analysis API is running',
        'extractor_status': 'ready' if extractor else 'error'
    })


@app.route('/api/dream-analysis', methods=['GET'])
def get_dream_analysis():
    """
    Get DREAM dataset analysis for a patient
    Query params:
        - patient_id: Patient identifier (e.g., "DREAM_10" or just "10")
    """
    if not extractor:
        return jsonify({
            'error': 'Feature extractor not initialized',
            'message': 'Dataset path may be incorrect'
        }), 500
    
    patient_id = request.args.get('patient_id', '')
    
    if not patient_id:
        return jsonify({
            'error': 'Missing patient_id parameter',
            'example': '/api/dream-analysis?patient_id=10'
        }), 400
    
    # Normalize patient ID
    if not patient_id.startswith('DREAM_'):
        patient_id = f"DREAM_{patient_id}"
    
    try:
        logger.info(f"Fetching features for patient: {patient_id}")
        features = extractor.get_patient_features(patient_id)
        
        if not features:
            # Return sample data if no real data found
            logger.warning(f"No data found for {patient_id}, returning sample data")
            return jsonify({
                'message': 'No data found for this patient',
                'patient_id': patient_id,
                'data': {
                    'joint_velocity': 0,
                    'gaze_variance': 0,
                    'communication_score': 0,
                    'ados_score': 0,
                    'displacement_ratio': 0,
                    'session_date': 'N/A'
                }
            }), 404
        
        # Format response
        response = {
            'patient_id': features['participantId'],
            'session_date': features['sessionDate'],
            'data': {
                'joint_velocity': features['averageJointVelocity'],
                'gaze_variance': features['headGazeVariance'],
                'communication_score': features['adosCommunicationScore'],
                'ados_score': features['adosTotalScore'],
                'displacement_ratio': features['totalDisplacementRatio'],
                'eye_gaze_consistency': features.get('eyeGazeConsistency', 0),
                'age_months': features.get('ageMonths', 0),
                'therapy_condition': features.get('therapyCondition', 'Unknown')
            }
        }
        
        logger.info(f"✅ Successfully extracted features for {patient_id}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/dream-analysis/batch', methods=['GET'])
def get_batch_analysis():
    """
    Get analysis for multiple patients or all available data
    Query params:
        - limit: Maximum number of records to return (default: 100)
    """
    if not extractor:
        return jsonify({'error': 'Feature extractor not initialized'}), 500
    
    try:
        limit = request.args.get('limit', 100, type=int)
        logger.info(f"Extracting features for up to {limit} files...")
        
        features = extractor.extract_all_features(limit=limit)
        
        # Format response
        response = {
            'total_records': len(features),
            'data': []
        }
        
        for feature in features:
            response['data'].append({
                'patient_id': feature['participantId'],
                'session_date': feature['sessionDate'],
                'joint_velocity': feature['averageJointVelocity'],
                'gaze_variance': feature['headGazeVariance'],
                'communication_score': feature['adosCommunicationScore'],
                'ados_score': feature['adosTotalScore'],
                'displacement_ratio': feature['totalDisplacementRatio'],
                'age_months': feature.get('ageMonths', 0),
                'therapy_condition': feature.get('therapyCondition', 'Unknown')
            })
        
        logger.info(f"✅ Extracted {len(features)} feature records")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error processing batch request: {e}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/api/dream-analysis/export', methods=['POST'])
def export_features():
    """
    Export all features to CSV file
    Returns: Path to created CSV file
    """
    if not extractor:
        return jsonify({'error': 'Feature extractor not initialized'}), 500
    
    try:
        limit = request.json.get('limit', None) if request.json else None
        output_path = request.json.get('output_path', 'dream_features.csv') if request.json else 'dream_features.csv'
        
        logger.info(f"Exporting features to CSV...")
        features = extractor.extract_all_features(limit=limit)
        
        csv_path = extractor.export_to_csv(features, output_path)
        
        return jsonify({
            'success': True,
            'message': f'Exported {len(features)} records',
            'file_path': csv_path,
            'total_records': len(features)
        })
        
    except Exception as e:
        logger.error(f"Error exporting features: {e}")
        return jsonify({
            'error': 'Export failed',
            'message': str(e)
        }), 500


@app.route('/api/dream-analysis/available-patients', methods=['GET'])
def get_available_patients():
    """
    Get list of available patient IDs in the dataset
    """
    if not extractor:
        return jsonify({'error': 'Feature extractor not initialized'}), 500
    
    try:
        dataset_path = Path(extractor.dataset_path)
        user_folders = [d for d in dataset_path.iterdir() if d.is_dir() and d.name.startswith('User ')]
        
        patients = []
        for folder in sorted(user_folders):
            user_id = folder.name.replace('User ', '')
            patient_id = f"DREAM_{user_id}"
            
            # Count JSON files
            json_count = len(list(folder.glob('*.json')))
            
            patients.append({
                'patient_id': patient_id,
                'user_id': user_id,
                'sessions_count': json_count
            })
        
        return jsonify({
            'total_patients': len(patients),
            'patients': patients
        })
        
    except Exception as e:
        logger.error(f"Error getting patient list: {e}")
        return jsonify({
            'error': 'Failed to get patient list',
            'message': str(e)
        }), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': [
            '/api/health',
            '/api/dream-analysis?patient_id=10',
            '/api/dream-analysis/batch?limit=100',
            '/api/dream-analysis/available-patients',
            '/api/dream-analysis/export'
        ]
    }), 404


if __name__ == '__main__':
    port = int(os.environ.get('DREAM_API_PORT', 5001))
    logger.info(f"🚀 Starting DREAM Analysis API on port {port}")
    logger.info(f"📊 Dataset path: {extractor.dataset_path if extractor else 'Not initialized'}")
    app.run(host='0.0.0.0', port=port, debug=True)
