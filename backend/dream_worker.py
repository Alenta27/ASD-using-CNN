"""
Python worker to extract DREAM features for a single patient
Called from Node.js with patient_id as argument
Returns JSON to stdout
"""

import sys
import json
from dream_feature_extractor import DREAMFeatureExtractor

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Missing patient_id argument',
            'usage': 'python dream_worker.py <patient_id>'
        }))
        sys.exit(1)
    
    patient_id = sys.argv[1]
    
    # Normalize patient ID
    if not patient_id.startswith('DREAM_'):
        patient_id = f"DREAM_{patient_id}"
    
    try:
        extractor = DREAMFeatureExtractor()
        features = extractor.get_patient_features(patient_id)
        
        if not features:
            # Return zeros if no data found
            result = {
                'success': False,
                'message': 'No data found for this patient',
                'participantId': patient_id,
                'sessionDate': 'N/A',
                'averageJointVelocity': 0,
                'headGazeVariance': 0,
                'totalDisplacementRatio': 0,
                'eyeGazeConsistency': 0,
                'adosCommunicationScore': 0,
                'adosTotalScore': 0,
                'ageMonths': 0,
                'therapyCondition': 'Unknown'
            }
        else:
            result = {
                'success': True,
                **features
            }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'patient_id': patient_id
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
