"""
DREAM Dataset Feature Extraction Pipeline
Extracts behavioral metrics from DREAM dataset JSON files for CORTEXA system
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DREAMFeatureExtractor:
    """
    Extracts kinematic, gaze, and clinical features from DREAM dataset
    """
    
    def __init__(self, dataset_path: str = r"D:\ASD\data\dream_dataset\extracted"):
        self.dataset_path = Path(dataset_path)
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset path not found: {dataset_path}")
    
    def load_json_file(self, file_path: Path) -> Optional[Dict]:
        """Load and validate a DREAM JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            logger.error(f"Error loading {file_path}: {e}")
            return None
    
    def calculate_joint_velocity(self, skeleton_data: Dict) -> float:
        """
        Calculate average joint velocity from skeleton tracking data
        Returns: Average velocity in m/s
        """
        try:
            velocities = []
            
            # Joint names to track
            joints = ['hand_left', 'hand_right', 'elbow_left', 'elbow_right', 
                     'wrist_left', 'wrist_right', 'head']
            
            for joint in joints:
                if joint not in skeleton_data:
                    continue
                    
                joint_data = skeleton_data[joint]
                x = np.array([v for v in joint_data['x'] if v is not None])
                y = np.array([v for v in joint_data['y'] if v is not None])
                z = np.array([v for v in joint_data['z'] if v is not None])
                
                if len(x) < 2:
                    continue
                
                # Calculate 3D displacement between consecutive frames
                dx = np.diff(x)
                dy = np.diff(y)
                dz = np.diff(z)
                
                # 3D velocity magnitude
                velocity = np.sqrt(dx**2 + dy**2 + dz**2)
                velocities.extend(velocity)
            
            if len(velocities) == 0:
                return 0.0
            
            # Return average velocity
            avg_velocity = float(np.mean(velocities))
            return round(avg_velocity, 6)
            
        except Exception as e:
            logger.error(f"Error calculating joint velocity: {e}")
            return 0.0
    
    def calculate_head_gaze_variance(self, head_gaze: Dict) -> float:
        """
        Calculate variance in head gaze direction
        Returns: Variance of head gaze vector
        """
        try:
            rx = np.array([v for v in head_gaze['rx'] if v is not None])
            ry = np.array([v for v in head_gaze['ry'] if v is not None])
            rz = np.array([v for v in head_gaze['rz'] if v is not None])
            
            if len(rx) < 2:
                return 0.0
            
            # Calculate variance for each dimension
            var_x = np.var(rx)
            var_y = np.var(ry)
            var_z = np.var(rz)
            
            # Combined variance (mean of component variances)
            total_variance = float(np.mean([var_x, var_y, var_z]))
            
            return round(total_variance, 6)
            
        except Exception as e:
            logger.error(f"Error calculating head gaze variance: {e}")
            return 0.0
    
    def calculate_eye_gaze_consistency(self, eye_gaze: Dict) -> float:
        """
        Calculate eye gaze consistency (inverse of variance)
        Returns: Consistency score (0-1)
        """
        try:
            rx = np.array([v for v in eye_gaze['rx'] if v is not None])
            ry = np.array([v for v in eye_gaze['ry'] if v is not None])
            rz = np.array([v for v in eye_gaze['rz'] if v is not None])
            
            if len(rx) < 2:
                return 0.0
            
            # Calculate standard deviation
            std_x = np.std(rx)
            std_y = np.std(ry)
            std_z = np.std(rz)
            
            # Consistency is inverse of variability, normalized
            avg_std = np.mean([std_x, std_y, std_z])
            consistency = 1.0 / (1.0 + avg_std)  # Higher = more consistent
            
            return round(float(consistency), 6)
            
        except Exception as e:
            logger.error(f"Error calculating eye gaze consistency: {e}")
            return 0.0
    
    def calculate_displacement_ratio(self, skeleton_data: Dict) -> float:
        """
        Calculate total displacement ratio (movement extent)
        Returns: Ratio of total path length to straight-line distance
        """
        try:
            # Use hand positions for displacement analysis
            joints = ['hand_left', 'hand_right']
            ratios = []
            
            for joint in joints:
                if joint not in skeleton_data:
                    continue
                    
                joint_data = skeleton_data[joint]
                x = np.array([v for v in joint_data['x'] if v is not None])
                y = np.array([v for v in joint_data['y'] if v is not None])
                z = np.array([v for v in joint_data['z'] if v is not None])
                
                if len(x) < 2:
                    continue
                
                # Total path length (sum of all displacements)
                dx = np.diff(x)
                dy = np.diff(y)
                dz = np.diff(z)
                path_segments = np.sqrt(dx**2 + dy**2 + dz**2)
                total_path = np.sum(path_segments)
                
                # Straight-line distance (start to end)
                straight_line = np.sqrt(
                    (x[-1] - x[0])**2 + 
                    (y[-1] - y[0])**2 + 
                    (z[-1] - z[0])**2
                )
                
                if straight_line > 0:
                    ratio = total_path / straight_line
                    ratios.append(ratio)
            
            if len(ratios) == 0:
                return 0.0
            
            # Return average ratio
            avg_ratio = float(np.mean(ratios))
            return round(avg_ratio, 6)
            
        except Exception as e:
            logger.error(f"Error calculating displacement ratio: {e}")
            return 0.0
    
    def extract_ados_scores(self, ados_data: Dict) -> Tuple[int, int]:
        """
        Extract ADOS communication and total scores
        Returns: (communication_score, total_score)
        """
        try:
            # Use preTest scores if available, otherwise postTest
            scores = ados_data.get('preTest') or ados_data.get('postTest')
            
            if not scores:
                return 0, 0
            
            communication = int(scores.get('communication', 0))
            total = int(scores.get('total', 0))
            
            return communication, total
            
        except Exception as e:
            logger.error(f"Error extracting ADOS scores: {e}")
            return 0, 0
    
    def extract_features_from_file(self, file_path: Path) -> Optional[Dict]:
        """
        Extract all features from a single DREAM JSON file
        """
        data = self.load_json_file(file_path)
        
        if not data:
            return None
        
        try:
            # Extract participant info
            participant = data.get('participant', {})
            participant_id = participant.get('id', 'unknown')
            age_months = participant.get('ageInMonths', 0)
            
            # Extract condition/therapy
            condition = data.get('condition', 'Unknown')
            
            # Extract session date from filename
            filename = file_path.stem
            parts = filename.split('_')
            session_date = parts[-2] if len(parts) > 2 else 'unknown'
            
            # Calculate kinematic features
            skeleton = data.get('skeleton', {})
            avg_joint_velocity = self.calculate_joint_velocity(skeleton)
            displacement_ratio = self.calculate_displacement_ratio(skeleton)
            
            # Calculate gaze features
            head_gaze = data.get('head_gaze', {})
            eye_gaze = data.get('eye_gaze', {})
            head_gaze_variance = self.calculate_head_gaze_variance(head_gaze)
            eye_gaze_consistency = self.calculate_eye_gaze_consistency(eye_gaze)
            
            # Extract clinical scores
            ados = data.get('ados', {})
            communication_score, total_score = self.extract_ados_scores(ados)
            
            features = {
                'participantId': f"DREAM_{participant_id}",
                'sessionDate': session_date,
                'averageJointVelocity': avg_joint_velocity,
                'totalDisplacementRatio': displacement_ratio,
                'headGazeVariance': head_gaze_variance,
                'eyeGazeConsistency': eye_gaze_consistency,
                'adosCommunicationScore': communication_score,
                'adosTotalScore': total_score,
                'ageMonths': age_months,
                'therapyCondition': condition,
                'filePath': str(file_path),
                'processedAt': datetime.now().isoformat()
            }
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features from {file_path}: {e}")
            return None
    
    def extract_all_features(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Extract features from all JSON files in the dataset
        Args:
            limit: Maximum number of files to process (None for all)
        Returns: List of feature dictionaries
        """
        all_features = []
        json_files = list(self.dataset_path.rglob("*.json"))
        
        logger.info(f"Found {len(json_files)} JSON files in dataset")
        
        if limit:
            json_files = json_files[:limit]
            logger.info(f"Processing limited to {limit} files")
        
        for idx, file_path in enumerate(json_files):
            if idx % 50 == 0:
                logger.info(f"Processing file {idx + 1}/{len(json_files)}")
            
            features = self.extract_features_from_file(file_path)
            if features:
                all_features.append(features)
        
        logger.info(f"Successfully extracted features from {len(all_features)} files")
        return all_features
    
    def get_patient_features(self, patient_id: str) -> Optional[Dict]:
        """
        Get features for a specific patient (latest session)
        Args:
            patient_id: Patient identifier (e.g., "DREAM_10")
        Returns: Feature dictionary or None
        """
        # Extract numeric ID from patient_id
        numeric_id = patient_id.replace('DREAM_', '')
        user_folder = self.dataset_path / f"User {numeric_id}"
        
        if not user_folder.exists():
            logger.warning(f"User folder not found: {user_folder}")
            return None
        
        json_files = list(user_folder.glob("*.json"))
        
        if not json_files:
            logger.warning(f"No JSON files found for user {numeric_id}")
            return None
        
        # Sort by filename to get latest session
        json_files.sort(reverse=True)
        latest_file = json_files[0]
        
        logger.info(f"Extracting features from {latest_file.name}")
        return self.extract_features_from_file(latest_file)
    
    def export_to_csv(self, features: List[Dict], output_path: str):
        """Export extracted features to CSV file"""
        df = pd.DataFrame(features)
        df.to_csv(output_path, index=False)
        logger.info(f"Exported {len(features)} records to {output_path}")
        return output_path


def main():
    """Test the feature extractor"""
    extractor = DREAMFeatureExtractor()
    
    # Test with a single patient
    logger.info("Testing feature extraction for User 10...")
    features = extractor.get_patient_features("DREAM_10")
    
    if features:
        print("\n" + "="*60)
        print("EXTRACTED FEATURES:")
        print("="*60)
        for key, value in features.items():
            print(f"{key:30s}: {value}")
        print("="*60)
    else:
        print("Failed to extract features")


if __name__ == "__main__":
    main()
