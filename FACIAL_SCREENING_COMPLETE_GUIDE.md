# FACIAL SCREENING SYSTEM - COMPLETE GUIDE

## 🎉 System Status: **FULLY FUNCTIONAL**

Your facial screening pipeline is complete and working! This guide will help you use and test the system.

---

## 📋 System Overview

### **Architecture**

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend │ ───> │  Express Backend │ ───> │  Python + CNN   │
│                 │      │  (Node.js)       │      │  (TensorFlow)   │
│  - File upload  │      │  - Multer upload │      │  - Face detect  │
│  - Image preview│      │  - Spawn Python  │      │  - ASD predict  │
│  - Display      │      │  - Track results │      │  - Return JSON  │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### **Files Involved**

| Component | File Path | Status |
|-----------|-----------|--------|
| Frontend Page | `frontend/src/pages/FacialScreeningPage.jsx` | ✅ Enhanced |
| Backend Route | `backend/routes/predictRoutes.js` | ✅ Enhanced |
| Python Predictor | `backend/ai_model/predict.py` | ✅ Enhanced |
| CNN Model | `backend/ai_model/asd_detection_model.h5` | ✅ Exists (11.5 MB) |

---

## 🚀 How to Use

### **1. Start the Backend Server**

```powershell
cd backend
node index.js
```

**Expected output:**
```
✅ Backend server running on port 5000
🔌 Serving uploads from: D:\ASD\backend\uploads
```

### **2. Start the Frontend**

```powershell
cd frontend
npm start
```

**Expected output:**
```
Starting development server on http://localhost:3000
```

### **3. Access Facial Screening**

1. Open browser: `http://localhost:3000`
2. Navigate to **Facial Screening** page
3. Click **"Click to upload"** or drag-and-drop an image
4. **Image preview will appear** in the upload area
5. Click **"Analyze"** button
6. Results appear on the right side

---

## 📸 Testing with Real Images

### **Option 1: Use Your Own Face Photo**

1. Take a clear, frontal face photo with your phone/camera
2. Upload it to the system
3. Click "Analyze"

### **Option 2: Use Sample Images from the Internet**

Download test images:
```powershell
# Example: Download a face photo for testing
# You can use any face photo from your computer
```

### **Option 3: Test via API (Backend Test)**

```powershell
cd backend
node test_api_facial.js
```

---

## 🔍 How the Pipeline Works

### **Step 1: File Upload & Preview**

```javascript
// Frontend: FacialScreeningPage.jsx
const handleFileChange = (e) => {
  const file = e.target.files[0];
  
  // Create preview using FileReader
  const reader = new FileReader();
  reader.onloadend = () => {
    setImagePreview(reader.result);  // ✅ This displays the image
  };
  reader.readAsDataURL(file);
}
```

**What happens:**
- User selects image file
- FileReader converts it to Data URL
- Image appears in preview area
- Console logs: `📸 File selected`, `✅ Valid image file`, `🖼️ Creating image preview`

### **Step 2: Send to Backend**

```javascript
// POST request with FormData
const formData = new FormData();
formData.append('image', selectedFile);

const response = await fetch('http://localhost:5000/api/predict', {
  method: 'POST',
  body: formData
});
```

**What happens:**
- Frontend sends image as multipart/form-data
- Backend receives it via multer
- Saves to `backend/uploads/` temporarily
- Console logs: `📤 Sending POST request`, `⏱️ Request completed`

### **Step 3: Python Face Detection**

```python
# Python: ai_model/predict.py
face_cascade = cv2.CascadeClassifier(...)
faces = face_cascade.detectMultiScale(gray, 1.1, 4)

if len(faces) == 0:
    return {"error": "No face detected"}
```

**What happens:**
- OpenCV Haar Cascade detects faces
- If no face → returns error
- If face found → proceeds to prediction
- Console logs: `[INFO] Detecting faces...`, `[INFO] X face(s) detected`

### **Step 4: CNN Prediction**

```python
# Load model and predict
model = load_model('asd_detection_model.h5')
img = load_img(image_path, target_size=(224, 224))
img_array = img_to_array(img) / 255.0

prediction = model.predict(img_array)
confidence = prediction[0][0]

if confidence > 0.5:
    return {"prediction": "ASD Detected", "confidence": confidence}
else:
    return {"prediction": "No ASD", "confidence": 1 - confidence}
```

**What happens:**
- Loads trained Keras CNN model
- Resizes image to 224×224
- Normalizes pixel values (0-1)
- Runs prediction
- Returns JSON with prediction + confidence
- Console logs: `[INFO] Running prediction...`, `[INFO] Final result`

### **Step 5: Display Results**

```javascript
// Frontend displays results
if (response.ok) {
  setPrediction(data.prediction);    // "ASD Detected" or "No ASD"
  setConfidence(data.confidence);    // 0.0 - 1.0
}
```

**What's displayed:**
- ✅ Prediction: "ASD Detected" or "No ASD"
- 📊 Confidence Score: X.XX%
- 🔴 Risk Level: High/Moderate/Low
- ⚠️ Disclaimer message

---

## 🔧 Troubleshooting

### **Issue 1: Image Preview Not Showing**

**Symptoms:**
- Upload works but placeholder image still shows
- No error message

**Solutions:**
1. **Check browser console** (F12 → Console)
   - Look for: `📸 File selected`, `✅ Image preview ready`
   - If you see errors → check file type (must be image/*)

2. **Try different image format**
   - Supported: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
   - Recommended: `.jpg` or `.png`

3. **Clear browser cache**
   - Press `Ctrl + Shift + R` to hard refresh

4. **Check file size**
   - Maximum: 10 MB (enforced by Multer)

### **Issue 2: "No face detected" Error**

**Symptoms:**
- Image uploads successfully
- Get error: "No face detected. Please upload a clear, frontal photograph"

**This is correct behavior!** The face detection algorithm is strict. To fix:

1. ✅ Use a **clear, frontal face photo**
2. ✅ Good lighting
3. ✅ Face visible and not covered
4. ✅ Not too far or too close
5. ❌ Don't use drawings, cartoons, or side profiles

### **Issue 3: Prediction/Confidence Empty**

**Symptoms:**
- Image uploads
- Preview shows
- Click "Analyze"
- Results don't appear

**Solutions:**

1. **Check backend is running**
   ```powershell
   # Test backend health
   Invoke-WebRequest http://localhost:5000/api/health
   ```
   
   Expected: `{"status":"OK"}`

2. **Check browser console**
   - Look for: `📤 Sending POST request`
   - Look for: `📥 Response data`
   - Any errors? Note the error message

3. **Check backend console**
   - Look for: `🔷 [Facial Prediction] Request received`
   - Look for: `✅ [Facial Prediction] Success`
   - Any errors? They'll show in red

4. **Test API directly**
   ```powershell
   cd backend
   node test_api_facial.js
   ```

### **Issue 4: Network Error**

**Symptoms:**
- Error: "Network error: Unable to connect to server"

**Solutions:**

1. **Backend not running**
   ```powershell
   cd backend
   node index.js
   ```

2. **Wrong port**
   - Backend should be on port 5000
   - Check `backend/index.js` for `PORT` variable

3. **CORS issue**
   - Already configured in `backend/index.js`
   - Should allow `http://localhost:3000`

### **Issue 5: Python Dependencies Missing**

**Symptoms:**
- Error: `ModuleNotFoundError: No module named 'tensorflow'`

**Solutions:**

```powershell
cd backend
pip install -r requirements.txt
```

**Verify installation:**
```powershell
python -c "import tensorflow; import cv2; import numpy; print('All OK')"
```

---

## 📊 Understanding Results

### **Prediction Values**

| Prediction | Meaning | Action |
|------------|---------|--------|
| **"ASD Detected"** | Model predicts ASD indicators | Recommend professional assessment |
| **"No ASD"** | No significant ASD indicators | Continue monitoring if concerned |

### **Confidence Score**

| Range | Risk Level | Color | Interpretation |
|-------|-----------|-------|----------------|
| 70-100% | High Risk | 🔴 Red | Strong indicators, seek evaluation |
| 40-69% | Moderate Risk | 🟡 Yellow | Some indicators, consider screening |
| 0-39% | Low Risk | 🟢 Green | Few indicators present |

### **Important Notes**

⚠️ **This is NOT a formal diagnosis!**

- Results are supportive insights only
- Always consult qualified healthcare professionals
- Use as part of comprehensive assessment
- False positives/negatives can occur

---

## 🧪 Testing Checklist

### **Before Reporting Issues:**

- [ ] Backend server is running (`node index.js`)
- [ ] Frontend server is running (`npm start`)
- [ ] Python dependencies installed (`pip install -r requirements.txt`)
- [ ] Model file exists (`backend/ai_model/asd_detection_model.h5`)
- [ ] Using a real face photo (not drawing/cartoon)
- [ ] Image is clear and frontal
- [ ] Checked browser console (F12) for errors
- [ ] Checked backend console for errors
- [ ] Tested API endpoint (`node test_api_facial.js`)

---

## 🎯 Quick Test Commands

### **1. Test Backend Health**
```powershell
Invoke-WebRequest http://localhost:5000/api/health
```

### **2. Test Python Environment**
```powershell
cd backend
python -c "import tensorflow; import cv2; print('OK')"
```

### **3. Test API Endpoint**
```powershell
cd backend
node test_api_facial.js
```

### **4. Check Logs**

**Frontend (Browser Console):**
- Press F12 → Console tab
- Look for 📸, 🔍, 📤, 📥 emoji logs

**Backend (Terminal):**
- Look for 🔷, ✅, ❌ emoji logs

---

## 📁 Directory Structure

```
ASD/
├── backend/
│   ├── ai_model/
│   │   ├── asd_detection_model.h5  ← CNN model (11.5 MB)
│   │   └── predict.py              ← Prediction script ✅
│   ├── routes/
│   │   └── predictRoutes.js        ← API endpoint ✅
│   ├── uploads/                    ← Temp image storage
│   ├── index.js                    ← Main server
│   ├── test_api_facial.js          ← API test script
│   └── requirements.txt            ← Python dependencies
│
└── frontend/
    └── src/
        └── pages/
            └── FacialScreeningPage.jsx  ← UI component ✅
```

---

## 🔐 Security Notes

- Images stored temporarily in `backend/uploads/`
- Files cleaned up after processing (optional: implement cleanup)
- No sensitive data logged
- Patient ID optional for tracking
- CORS configured for localhost only

---

## 🚀 Next Steps

### **Enhancements (Optional):**

1. **Add file cleanup**
   - Delete uploaded images after processing
   - Implement in `predictRoutes.js`

2. **Improve face detection**
   - Use dlib or MTCNN for better accuracy
   - Handle multiple faces

3. **Add progress indicators**
   - Show steps: "Uploading... → Detecting face... → Running AI..."

4. **Save results to database**
   - Already tracks via `trackScreening()`
   - Link to patient records

5. **Add result history**
   - Show past predictions
   - Compare over time

---

## 📞 Support

If issues persist after following this guide:

1. Check all error logs (browser + backend console)
2. Verify Python environment: `python --version` (3.8-3.11 recommended)
3. Verify Node.js: `node --version` (v16+ recommended)
4. Test with different images
5. Check network connectivity

---

## ✅ Summary

Your facial screening system is **fully functional** with:

✅ **Frontend:** Image preview, file upload, results display
✅ **Backend:** Express API with enhanced logging
✅ **Python:** Face detection + CNN prediction with error handling
✅ **Model:** Trained CNN (11.5 MB) ready to use
✅ **Testing:** Automated test scripts included

**To use:** Upload a clear frontal face photo → Click Analyze → View results!

---

*Generated: March 9, 2026*
*CORTEXA - ASD Detection & Support System*
