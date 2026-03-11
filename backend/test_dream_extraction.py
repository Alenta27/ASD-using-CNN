"""
Test script for DREAM feature extraction
"""

import sys
from dream_feature_extractor import DREAMFeatureExtractor
import json

def test_single_patient():
    """Test extraction for a single patient"""
    print("="*60)
    print("Testing DREAM Feature Extraction")
    print("="*60)
    
    try:
        extractor = DREAMFeatureExtractor()
        print(f"✅ Feature extractor initialized")
        print(f"📁 Dataset path: {extractor.dataset_path}")
        print()
        
        # Test with User 10
        patient_id = "DREAM_10"
        print(f"🔍 Extracting features for {patient_id}...")
        
        features = extractor.get_patient_features(patient_id)
        
        if features:
            print("✅ Features extracted successfully!\n")
            print("📊 EXTRACTED METRICS:")
            print(f"   Participant ID: {features['participantId']}")
            print(f"   Session Date: {features['sessionDate']}")
            print(f"   Average Joint Velocity: {features['averageJointVelocity']:.4f} m/s")
            print(f"   Head Gaze Variance: {features['headGazeVariance']:.6f}")
            print(f"   Eye Gaze Consistency: {features['eyeGazeConsistency']:.6f}")
            print(f"   Total Displacement Ratio: {features['totalDisplacementRatio']:.4f}")
            print(f"   ADOS Communication Score: {features['adosCommunicationScore']}")
            print(f"   ADOS Total Score: {features['adosTotalScore']}")
            print(f"   Age (months): {features['ageMonths']}")
            print(f"   Therapy Condition: {features['therapyCondition']}")
            print()
            print("="*60)
            return True
        else:
            print("❌ No features extracted")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_available_patients():
    """Test listing available patients"""
    print("\n" + "="*60)
    print("Available Patients in Dataset")
    print("="*60)
    
    try:
        extractor = DREAMFeatureExtractor()
        dataset_path = extractor.dataset_path
        
        user_folders = [d for d in dataset_path.iterdir() if d.is_dir() and d.name.startswith('User ')]
        
        print(f"Found {len(user_folders)} patients\n")
        
        for folder in sorted(user_folders)[:10]:  # Show first 10
            user_id = folder.name.replace('User ', '')
            json_count = len(list(folder.glob('*.json')))
            print(f"   DREAM_{user_id}: {json_count} sessions")
        
        print(f"   ... and {len(user_folders) - 10} more")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error listing patients: {e}")

def test_worker_output():
    """Test the worker script output format"""
    print("\n" + "="*60)
    print("Testing Worker Script Output Format")
    print("="*60)
    
    try:
        extractor = DREAMFeatureExtractor()
        features = extractor.get_patient_features("DREAM_10")
        
        if features:
            # Format as worker would output
            output = {
                'success': True,
                **features
            }
            print(json.dumps(output, indent=2))
        else:
            print(json.dumps({
                'success': False,
                'message': 'No data found'
            }, indent=2))
            
    except Exception as e:
        print(json.dumps({
            'error': str(e)
        }, indent=2))

if __name__ == "__main__":
    success = test_single_patient()
    test_available_patients()
    
    if success:
        test_worker_output()
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Tests failed")
        sys.exit(1)
