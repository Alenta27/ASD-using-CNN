"""Test MRI Pipeline Setup"""
print('Testing MRI Pipeline Initialization...\n')

from pathlib import Path
import joblib
from nilearn import datasets
from nilearn.maskers import NiftiLabelsMasker
from nilearn.connectome import ConnectivityMeasure

print('✓ All imports successful')

backend_dir = Path('backend')
asd_fmri_dir = backend_dir / 'asd_fmri'
model = joblib.load(asd_fmri_dir / 'asd_svm_model.pkl')
scaler = joblib.load(asd_fmri_dir / 'scaler.pkl')
print('✓ Model and scaler loaded')

atlas = datasets.fetch_atlas_harvard_oxford('cort-maxprob-thr25-2mm')
print('✓ Harvard-Oxford Atlas loaded')

masker = NiftiLabelsMasker(labels_img=atlas.maps, standardize=True)
print('✓ NiftiLabelsMasker initialized')

correlation_measure = ConnectivityMeasure(kind='correlation')
print('✓ ConnectivityMeasure initialized')

print(f'\nModel Details:')
print(f'  - Type: {type(model).__name__}')
print(f'  - Features expected: {model.n_features_in_}')
print(f'  - Probability enabled: {hasattr(model, "predict_proba")}')

print('\n🎉 COMPLETE! All systems ready for MRI analysis!')
