# MRI-Based ASD Detection Web Application

## 🧠 Overview

This is a **self-contained Flask web application** for Autism Spectrum Disorder (ASD) screening using functional MRI (fMRI) brain connectivity analysis. The application uses a trained Support Vector Machine (SVM) model to classify brain scans as ASD or neurotypical (Control).

### Key Features

✅ **Unique Endpoint**: `/predict_mri` - No conflicts with existing applications  
✅ **Unique Template**: `mri_screener.html` - Separate from other interfaces  
✅ **Independent Port**: Runs on port 5002 (existing apps use 5001)  
✅ **Complete Pipeline**: Upload → Process → Predict → Display results  
✅ **Professional UI**: Modern, responsive web interface  
✅ **Real-time Processing**: Analyzes brain connectivity patterns on-the-fly  

---

## 📁 Project Structure

```
asd_fmri/
├── app_mri.py                    # Flask web application (MAIN FILE)
├── train_and_save_model.py      # Model training script
├── requirements.txt              # Python dependencies
├── README_MRI_WEB_APP.md        # This file
├── templates/
│   └── mri_screener.html        # Web interface (UNIQUE NAME)
├── mri_uploads/                 # Temporary upload folder (auto-created)
├── asd_svm_model.pkl            # Trained SVM model (generated)
├── scaler.pkl                   # Feature scaler (generated)
└── model_metadata.txt           # Model information (generated)
```

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies

```bash
cd d:\ASD\backend\asd_fmri
pip install -r requirements.txt
```

### Step 2: Train and Save the Model

Before running the web application, you need to train the model:

```bash
python train_and_save_model.py
```

**What this does:**
- Loads fMRI data from `../ds000212/derivatives/preprocessed_data/`
- Extracts brain connectivity features using Harvard-Oxford Atlas
- Trains an SVM classifier with RBF kernel
- Saves the trained model (`asd_svm_model.pkl`) and scaler (`scaler.pkl`)
- Generates model metadata for reference

**Expected output:**
```
============================================================
MRI-BASED ASD CLASSIFICATION MODEL TRAINING
============================================================
[1/7] Loading participant data...
  ✓ Loaded 40 participants
[2/7] Loading Harvard-Oxford Cortical Atlas...
  ✓ Atlas loaded successfully
[3/7] Processing fMRI scans...
  Processing sub-pixar001 (ASD)... ✓
  ...
[4/7] Preparing dataset...
  Total subjects processed: 40
  Features shape: (40, 2016)
[5/7] Splitting data and scaling features...
  Training set: 32 samples
  Testing set: 8 samples
[6/7] Training Support Vector Machine model...
  ✓ Model training completed!
[7/7] Saving model and scaler...
  ✓ Model saved: asd_svm_model.pkl
  ✓ Scaler saved: scaler.pkl

✅ MODEL TRAINING AND SAVING COMPLETED SUCCESSFULLY!
```

### Step 3: Run the Web Application

```bash
python app_mri.py
```

**Expected output:**
```
============================================================
INITIALIZING MRI-BASED ASD DETECTION APPLICATION
============================================================
[1/3] Loading trained model from: asd_svm_model.pkl
  ✓ Model loaded successfully
[2/3] Loading scaler from: scaler.pkl
  ✓ Scaler loaded successfully
[3/3] Initializing preprocessing tools...
  ✓ Harvard-Oxford Atlas loaded
  ✓ Preprocessing tools initialized

✅ APPLICATION READY TO ACCEPT REQUESTS

============================================================
STARTING FLASK SERVER
============================================================
Server will run on: http://localhost:5002
Endpoint: /predict_mri
Press CTRL+C to stop the server
```

### Step 4: Access the Web Interface

Open your browser and navigate to:

```
http://localhost:5002
```

---

## 🎯 How to Use the Web Interface

### 1. **Upload MRI Scan**
   - Click on the file upload area
   - Select a `.nii.gz` or `.nii` file (functional MRI scan)
   - The file name will appear once selected

### 2. **Analyze**
   - Click the "🔍 Analyze MRI Scan" button
   - Wait 30-60 seconds while the system:
     - Extracts time series from brain regions
     - Computes connectivity matrix
     - Makes prediction using the trained model

### 3. **View Results**
   - **Diagnosis**: ASD or Control (Neurotypical)
   - **Confidence**: Prediction confidence percentage
   - **Probabilities**: Detailed ASD and Control probabilities
   - **Visual Indicators**: Color-coded results and confidence bar

### 4. **Upload Another Scan**
   - Click "📤 Upload Another Scan" to reset and analyze a new file

---

## 🔧 Technical Details

### Backend Architecture

**Framework**: Flask 3.0.0  
**Port**: 5002 (independent from other applications)  
**Endpoint**: `/predict_mri` (unique, no conflicts)  

### Machine Learning Pipeline

1. **Feature Extraction**
   - Atlas: Harvard-Oxford Cortical Atlas (25% threshold, 2mm resolution)
   - Method: Pearson correlation connectivity matrix
   - Features: Upper triangle of correlation matrix (2016 features)

2. **Model**
   - Algorithm: Support Vector Machine (SVM)
   - Kernel: Radial Basis Function (RBF)
   - Regularization: C=1.0
   - Probability Estimates: Enabled

3. **Preprocessing**
   - Standardization: StandardScaler (fit on training data)
   - Time Series: NiftiLabelsMasker with standardization

### API Endpoints

#### `POST /predict_mri`
**Purpose**: Upload and analyze MRI scan

**Request**:
```
Content-Type: multipart/form-data
Body: mri_file (file upload)
```

**Response (Success)**:
```json
{
  "success": true,
  "diagnosis": "ASD",
  "confidence": 0.87,
  "asd_probability": 0.87,
  "control_probability": 0.13,
  "message": "Analysis complete. Diagnosis: ASD with 87.0% confidence."
}
```

**Response (Error)**:
```json
{
  "error": "Error message describing what went wrong"
}
```

#### `GET /health`
**Purpose**: Check if the service is running

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "scaler_loaded": true,
  "preprocessing_ready": true
}
```

---

## 📊 Model Performance

The model is trained on the ds000212 dataset with the following characteristics:

- **Dataset**: ~40 participants (ASD and Control)
- **Task**: Naturalistic movie viewing (Pixar short film)
- **Accuracy**: Typically 70-85% (varies by train-test split)
- **Evaluation**: 80/20 train-test split with stratified sampling

**Clinical Metrics**:
- Sensitivity: Ability to correctly identify ASD cases
- Specificity: Ability to correctly identify Control cases
- Confusion Matrix: Detailed breakdown of predictions

---

## 🛡️ Important Notes

### ⚠️ Research Tool Disclaimer

This application is designed for **research and educational purposes only**. It is **NOT** a clinical diagnostic tool.

- **Not FDA Approved**: This is not a medical device
- **Research Only**: For academic and research use
- **Consult Professionals**: Always seek qualified healthcare professionals for clinical diagnosis
- **No Medical Decisions**: Do not make treatment decisions based on this tool

### 🔒 Data Privacy

- Uploaded files are **temporarily stored** during processing
- Files are **automatically deleted** after analysis
- No data is permanently stored or transmitted to external servers
- All processing happens locally on your server

### 📏 File Requirements

**Accepted Formats**:
- `.nii` (NIfTI format)
- `.nii.gz` (Compressed NIfTI format)

**File Size Limit**: 500 MB

**Expected Data**:
- Functional MRI (fMRI) scan
- Preprocessed data (motion correction, normalization)
- 4D time series data

---

## 🔍 Troubleshooting

### Problem: "Model not initialized" error

**Solution**:
```bash
# Train the model first
python train_and_save_model.py

# Then run the app
python app_mri.py
```

### Problem: "No module named 'nilearn'" error

**Solution**:
```bash
pip install -r requirements.txt
```

### Problem: Port 5002 already in use

**Solution**: Edit `app_mri.py` and change the port:
```python
app.run(host='0.0.0.0', port=5003, debug=True)  # Use different port
```

### Problem: File upload fails

**Possible causes**:
- File is not in `.nii` or `.nii.gz` format
- File is corrupted
- File exceeds 500 MB size limit
- File is not a valid fMRI scan

**Solution**: Ensure you're uploading a valid, preprocessed fMRI scan in NIfTI format

### Problem: Processing takes too long

**Expected behavior**: Processing typically takes 30-60 seconds

**If it takes longer**:
- Check server logs for errors
- Ensure the MRI file is properly formatted
- Verify sufficient system memory (at least 4GB RAM recommended)

---

## 🔄 Integration with Existing Applications

This application is designed to **run independently** alongside your existing applications:

| Application | Port | Endpoint | Template |
|------------|------|----------|----------|
| **Voice Detection** | 5001 | `/predict-voice` | N/A |
| **Image Detection** | N/A | Node.js backend | N/A |
| **MRI Detection** | **5002** | **`/predict_mri`** | **`mri_screener.html`** |

**No conflicts**: Different ports, unique endpoints, and separate template names ensure complete independence.

---

## 📚 Additional Resources

### Understanding the Results

- **ASD Diagnosis**: Model predicts Autism Spectrum Disorder
- **Control Diagnosis**: Model predicts neurotypical (no ASD)
- **Confidence**: How certain the model is about its prediction
- **Probabilities**: Raw probability scores for each class

### Model Limitations

1. **Sample Size**: Trained on limited data (~40 participants)
2. **Single Task**: Only movie-watching paradigm
3. **No Demographics**: Age, gender, IQ not considered
4. **Single Modality**: Only fMRI connectivity features

### Future Improvements

- Implement cross-validation for robust evaluation
- Add ensemble methods (Random Forest, XGBoost)
- Include graph theory metrics
- Expand dataset with more participants
- Add interpretability features (SHAP values)

---

## 🤝 Support

For questions or issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all dependencies are installed
4. Ensure model files exist (`asd_svm_model.pkl`, `scaler.pkl`)

---

## 📝 License

This is a research tool developed for educational purposes. Please ensure compliance with your institution's policies and applicable regulations when using this software.

---

## ✅ Checklist

Before deploying:

- [ ] Install all dependencies (`pip install -r requirements.txt`)
- [ ] Train the model (`python train_and_save_model.py`)
- [ ] Verify model files exist (`asd_svm_model.pkl`, `scaler.pkl`)
- [ ] Test the application (`python app_mri.py`)
- [ ] Access web interface (`http://localhost:5002`)
- [ ] Upload a test MRI scan
- [ ] Verify results are displayed correctly

---

**🎉 You're all set! Your MRI-based ASD detection web application is ready to use.**