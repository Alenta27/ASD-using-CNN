"""
Train and Save MRI-based ASD Classification Model
This script trains an SVM model on fMRI connectivity data and saves it for deployment.
"""

import pandas as pd
import os
import numpy as np
from nilearn import datasets, connectome
from nilearn.maskers import NiftiLabelsMasker
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
from datetime import datetime

# Change to the script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("="*70)
print("MRI-BASED ASD CLASSIFICATION MODEL TRAINING")
print("="*70)
print(f"Working directory: {os.getcwd()}\n")

# --- Step 1: Load participant data ---
print("[1/7] Loading participant data...")
participants_path = os.path.join('..', 'ds000212', 'participants.tsv')
participants_df = pd.read_csv(participants_path, sep='\t')
print(f"  ✓ Loaded {len(participants_df)} participants")

# Prepare lists to collect features and labels
features = []
labels = []

# --- Step 2: Load atlas ---
print("\n[2/7] Loading Harvard-Oxford Cortical Atlas...")
atlas = datasets.fetch_atlas_harvard_oxford('cort-maxprob-thr25-2mm')
atlas_filename = atlas.maps
masker = NiftiLabelsMasker(labels_img=atlas_filename, standardize=True)
correlation_measure = connectome.ConnectivityMeasure(kind='correlation')
print("  ✓ Atlas loaded successfully")

# --- Step 3: Process all participants ---
print("\n[3/7] Processing fMRI scans and extracting connectivity features...")
preprocessed_data_path = os.path.join('..', 'ds000212', 'derivatives', 'preprocessed_data')

for idx, row in participants_df.iterrows():
    subject_id = row['participant_id']
    diagnosis = row['diagnosis']
    print(f"  Processing {subject_id} ({diagnosis})...", end=" ")

    # Find the functional MRI scan
    scan_filename = f"{subject_id}_task-pixar_run-001_swrf_bold.nii.gz"
    scan_path = os.path.join(preprocessed_data_path, subject_id, scan_filename)

    try:
        # Extract time series
        time_series = masker.fit_transform(scan_path)

        # Compute connectivity matrix
        correlation_matrix = correlation_measure.fit_transform([time_series])[0]

        # Store the upper triangle of the matrix as features
        upper_triangle = correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)]
        features.append(upper_triangle)
        labels.append(1 if diagnosis == 'ASD' else 0)  # 1 for ASD, 0 for Control

        print(f"✓ Shape: {correlation_matrix.shape}")

    except FileNotFoundError:
        print(f"✗ File not found: {scan_path}")
    except Exception as e:
        print(f"✗ Error: {e}")

# --- Step 4: Convert to numpy arrays ---
print("\n[4/7] Preparing dataset...")
features = np.array(features)
labels = np.array(labels)

print(f"  Total subjects processed: {len(features)}")
print(f"  Features shape: {features.shape}")
print(f"  ASD subjects: {np.sum(labels)}")
print(f"  Control subjects: {len(labels) - np.sum(labels)}")

if len(features) == 0:
    print("\n❌ ERROR: No features collected. Check data paths.")
    exit(1)

# --- Step 5: Split data and scale features ---
print("\n[5/7] Splitting data and scaling features...")
X_train, X_test, y_train, y_test = train_test_split(
    features, 
    labels, 
    test_size=0.2,
    random_state=42,
    stratify=labels
)

print(f"  Training set: {len(X_train)} samples")
print(f"  Testing set: {len(X_test)} samples")

# Scale features (important for SVM)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("  ✓ Features scaled using StandardScaler")

# --- Step 6: Train SVM model ---
print("\n[6/7] Training Support Vector Machine model...")
model = SVC(
    kernel='rbf',
    C=1.0,
    gamma='scale',
    probability=True,  # Enable probability estimates for confidence scores
    random_state=42
)

print("  Fitting model to training data...")
model.fit(X_train_scaled, y_train)
print("  ✓ Model training completed!")

# Evaluate model
y_pred = model.predict(X_test_scaled)
accuracy = accuracy_score(y_test, y_pred)

print("\n" + "-"*70)
print("MODEL PERFORMANCE")
print("-"*70)
print(f"\n📊 Accuracy: {accuracy:.2%}")
print(f"   Correctly classified: {int(accuracy * len(y_test))}/{len(y_test)} samples")
print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Control', 'ASD']))

cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(f"                Predicted Control  Predicted ASD")
print(f"Actual Control        {cm[0][0]:3d}              {cm[0][1]:3d}")
print(f"Actual ASD            {cm[1][0]:3d}              {cm[1][1]:3d}")

# --- Step 7: Save model and scaler ---
print("\n[7/7] Saving model and scaler...")

model_filename = 'asd_svm_model.pkl'
scaler_filename = 'scaler.pkl'

joblib.dump(model, model_filename)
joblib.dump(scaler, scaler_filename)

print(f"  ✓ Model saved: {model_filename}")
print(f"  ✓ Scaler saved: {scaler_filename}")

# Save model metadata
metadata = {
    'training_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'n_samples': len(features),
    'n_features': features.shape[1],
    'n_asd': int(np.sum(labels)),
    'n_control': int(len(labels) - np.sum(labels)),
    'accuracy': float(accuracy),
    'model_type': 'SVM with RBF kernel',
    'atlas': 'Harvard-Oxford Cortical (25% threshold, 2mm)',
    'connectivity_measure': 'Pearson Correlation'
}

metadata_filename = 'model_metadata.txt'
with open(metadata_filename, 'w') as f:
    f.write("MRI-BASED ASD CLASSIFICATION MODEL METADATA\n")
    f.write("="*70 + "\n\n")
    for key, value in metadata.items():
        f.write(f"{key}: {value}\n")

print(f"  ✓ Metadata saved: {metadata_filename}")

print("\n" + "="*70)
print("✅ MODEL TRAINING AND SAVING COMPLETED SUCCESSFULLY!")
print("="*70)
print("\nYou can now use the following files for deployment:")
print(f"  • {model_filename}")
print(f"  • {scaler_filename}")
print(f"  • {metadata_filename}")
print("\nNext step: Run 'python app_mri.py' to start the web application.")