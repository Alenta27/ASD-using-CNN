# 🚀 Quick Start Guide - MRI ASD Detection Web App

## Three Simple Steps

### 1️⃣ Install Dependencies (One-time setup)

```bash
cd d:\ASD\backend\asd_fmri
pip install -r requirements.txt
```

**Wait for installation to complete** (~2-3 minutes)

---

### 2️⃣ Train the Model (One-time setup)

```bash
python train_and_save_model.py
```

**What happens:**
- Processes 40 fMRI scans
- Trains SVM classifier
- Saves model files
- Takes ~5-10 minutes

**You'll see:**
```
✅ MODEL TRAINING AND SAVING COMPLETED SUCCESSFULLY!
```

---

### 3️⃣ Start the Web Application

```bash
python app_mri.py
```

**You'll see:**
```
✅ APPLICATION READY TO ACCEPT REQUESTS
Server will run on: http://localhost:5002
```

**Then open your browser:**
```
http://localhost:5002
```

---

## 🎯 Using the Web Interface

1. **Click** the upload area
2. **Select** a `.nii.gz` MRI scan file
3. **Click** "Analyze MRI Scan"
4. **Wait** 30-60 seconds
5. **View** the diagnosis and confidence score

---

## 📋 Test Files

You can test with any preprocessed fMRI scan from:
```
d:\ASD\backend\ds000212\derivatives\preprocessed_data\
```

Example test file:
```
sub-pixar001\sub-pixar001_task-pixar_run-001_swrf_bold.nii.gz
```

---

## ⚠️ Important Notes

- **Port**: Runs on 5002 (won't conflict with other apps)
- **Endpoint**: `/predict_mri` (unique name)
- **Template**: `mri_screener.html` (unique name)
- **Processing Time**: 30-60 seconds per scan
- **File Format**: Only `.nii` or `.nii.gz` files

---

## 🆘 Quick Troubleshooting

**Problem**: "Model not initialized"  
**Solution**: Run step 2 first (`python train_and_save_model.py`)

**Problem**: "Module not found"  
**Solution**: Run step 1 first (`pip install -r requirements.txt`)

**Problem**: Port already in use  
**Solution**: Stop other Flask apps or change port in `app_mri.py`

---

## ✅ Success Indicators

You know it's working when you see:

1. ✅ Model files created: `asd_svm_model.pkl`, `scaler.pkl`
2. ✅ Server message: "APPLICATION READY TO ACCEPT REQUESTS"
3. ✅ Web page loads at `http://localhost:5002`
4. ✅ File upload and analysis works

---

## 🎉 That's It!

Your MRI-based ASD detection web application is now running!

**Need more details?** See `README_MRI_WEB_APP.md`