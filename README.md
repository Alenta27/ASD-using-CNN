### MRI ASD Screener — Flask + HTML/JS

An end-to-end, standalone web application for rapid screening of Autism Spectrum Disorder (ASD) from MRI scans. The backend exposes a simple HTTP API that accepts a `.nii.gz` brain scan, extracts a connectivity-based feature vector with Nilearn, scales it, and feeds it into a pre-trained scikit-learn SVM. The frontend is a minimal HTML/JavaScript page that lets users upload a scan and view the prediction.

> Important: This tool is for research and educational purposes only and is not a medical device. It must not be used for clinical diagnosis or patient management.

---

### Features
- **Single-Endpoint Inference**: `POST /predict_mri` accepts a `.nii.gz` MRI file and returns a JSON prediction: `"ASD Detected"` or `"Control"`.
- **Pretrained Model**: Loads `asd_svm_model.pkl` (scikit-learn SVM) and `scaler.pkl` for feature normalization.
- **Connectivity Features**: Uses Nilearn to compute a brain connectivity matrix, which is vectorized into a model-ready feature vector.
- **Simple Frontend**: A single HTML page (`mri_screener.html`) with a file input that calls the backend and displays the result.

---

### Tech Stack
- **Python** (3.9+ recommended)
- **Flask** (REST API)
- **scikit-learn** (SVM model + preprocessing)
- **Nilearn** (neuroimaging utilities and connectivity features)
- **NumPy / SciPy** (numerics)
- **HTML / JavaScript** (minimal UI)

---

### Repository Layout
The key artifacts referenced below:

- `app_mri.py` — Flask application that loads the SVM model and scaler, exposes `/predict_mri`.
- `asd_svm_model.pkl` — Pre-trained scikit-learn SVM model (not included).
- `scaler.pkl` — Pre-fitted scaler (e.g., `StandardScaler`) (not included).
- `mri_screener.html` — Minimal frontend to upload `.nii.gz` files and show predictions.
- `requirements.txt` — Python dependencies for the backend.

You may keep `asd_svm_model.pkl` and `scaler.pkl` in the same directory as `app_mri.py` unless you have customized paths in the code.

---

### Setup and Usage

1) Clone the repository
```bash
git clone <your-repo-url>.git
cd <repo>
```

2) Create and activate a virtual environment (Windows PowerShell)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3) Install dependencies
```bash
pip install -r requirements.txt
```

4) Place model artifacts
- Copy `asd_svm_model.pkl` and `scaler.pkl` into the same directory as `app_mri.py` (or update the paths in `app_mri.py` if you store them elsewhere).

5) Run the backend API
```bash
python app_mri.py
```
- By default, Flask serves at `http://127.0.0.1:5000/` unless configured otherwise.

6) Open the frontend
- Option A: Open `mri_screener.html` directly in your browser (ensure its JavaScript points to the correct backend URL).
- Option B: Serve it via a static server (optional) and access it at `http://localhost:<port>/`.

7) Test the API (optional)
```bash
curl -X POST http://127.0.0.1:5000/predict_mri \
  -F "file=@/path/to/scan.nii.gz" \
  -H "Accept: application/json"
```
Expected JSON response:
```json
{ "prediction": "ASD Detected" }
```
or
```json
{ "prediction": "Control" }
```

---

### API Reference

- **Endpoint**: `POST /predict_mri`
- **Content-Type**: `multipart/form-data`
- **Form field**: `file` (the uploaded `.nii.gz` MRI file)
- **Response (200)**: `{"prediction": "ASD Detected" | "Control"}`
- **Common errors**:
  - `400` if the file is missing or not a `.nii.gz`
  - `500` if processing fails (e.g., unreadable image, shape mismatch)

---

### How It Works (Connectivity Features)

At a high level:

1. **Load Image**: The backend loads the uploaded `.nii.gz` NIfTI image.
2. **Time-Series Extraction**: Using Nilearn, the brain volume is reduced to regional time series. This typically involves applying a predefined atlas or mask (e.g., an atlas of parcels/ROIs) and averaging voxel signals within each region across time.
3. **Connectivity Matrix**: Pairwise statistical dependencies (e.g., Pearson correlation or partial correlation) are computed between regional time series, producing a symmetric connectivity matrix.
4. **Vectorization**: The upper triangle of the connectivity matrix (excluding the diagonal) is flattened to form a 1D feature vector.
5. **Scaling**: The feature vector is transformed with the pre-fitted `scaler.pkl` to match the training distribution.
6. **Classification**: The scaled features are fed into the pre-trained SVM (`asd_svm_model.pkl`). The predicted class is mapped to `"ASD Detected"` or `"Control"` and returned as JSON.

Note: Exact atlas choice, preprocessing (e.g., detrending, filtering, confound regression), and connectivity metric should match what was used to train the model to avoid domain shift.

---

### Requirements
Your `requirements.txt` should include, at minimum, compatible versions of:

- Flask
- scikit-learn
- nilearn
- nibabel
- numpy
- scipy

Pin versions used in your environment to ensure reproducible installs.

---

### Security & Privacy
- Uploaded scans are processed in-memory or via temporary files and not retained by default. Review `app_mri.py` if you need stricter data handling.
- Do not expose this API publicly without proper authentication, rate limiting, and logging.

---

### Limitations
- Research-only; performance depends on training data and preprocessing pipeline alignment.
- Model generalization may degrade on scans with different acquisition protocols or preprocessing.

---

### License
Specify your license here (e.g., MIT, Apache-2.0). If omitted, the repository is not implicitly open source.

---

### Acknowledgments
- Built with Nilearn and scikit-learn. Please cite their respective projects if you publish results.


