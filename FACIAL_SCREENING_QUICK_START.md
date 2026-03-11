# FACIAL SCREENING - QUICK START ⚡

## 🚀 Start Using in 3 Steps

### **Step 1: Start Backend (Port 5000)**
```powershell
cd backend
node index.js
```
Wait for: `✅ Server running on port 5000`

### **Step 2: Start Frontend (Port 3000)**
```powershell
cd frontend
npm start
```
Automatically opens: `http://localhost:3000`

### **Step 3: Test Facial Screening**
1. Navigate to **Facial Screening** page
2. Upload a **clear frontal face photo**
3. **Preview appears** automatically
4. Click **"Analyze"** button
5. **Results appear** on the right

---

## 💡 What You'll See

### **Upload Area (Left Side):**
```
┌─────────────────────────┐
│                         │
│   [Your Face Photo]     │  ← Preview shows here
│                         │
│                         │
└─────────────────────────┘
  File: photo.jpg
  [Analyze]  [Reset]
```

### **Results Area (Right Side):**
```
Prediction: ASD Detected / No ASD
Confidence: 87.52%
Risk Level: High / Moderate / Low
```

---

## ⚠️ Common Issues

### **"No face detected"**
- ✅ Use a **real face photo** (not drawing/cartoon)
- ✅ Face must be **clear and frontal**
- ✅ Good lighting
- ✅ Not too far or masked

### **"Network error"**
- ❌ Backend not running
- **Fix:** Run `cd backend && node index.js`

### **Preview not showing**
- Check browser console (F12)
- Try different image format (.jpg, .png)
- Hard refresh: `Ctrl + Shift + R`

---

## 🧪 Quick Test

### **Test Backend API:**
```powershell
cd backend
node test_api_facial.js
```

### **Check Backend Health:**
```powershell
Invoke-WebRequest http://localhost:5000/api/health
```

### **Verify Python:**
```powershell
python -c "import tensorflow, cv2; print('OK')"
```

---

## 📊 Console Logs (What to Expect)

### **Browser Console (F12):**
```
📸 File selected: {name: "photo.jpg", type: "image/jpeg"}
✅ Valid image file
🖼️  Creating image preview...
✅ Image preview ready
🔍 Analyze button clicked
🚀 Starting analysis for: photo.jpg
📤 Sending POST request to http://localhost:5000/api/predict
⏱️  Request completed in 3245ms
📥 Response data: {prediction: "ASD Detected", confidence: 0.8752}
✅ Prediction successful
🏁 Analysis complete
```

### **Backend Console:**
```
🔷 [Facial Prediction] Request received
📸 [Facial Prediction] File uploaded: photo.jpg
🐍 [Facial Prediction] Spawning Python process
✅ [Facial Prediction] Success: {prediction: "ASD Detected", confidence: 0.8752}
```

---

## 📁 Files You Need

✅ `backend/ai_model/asd_detection_model.h5` (11.5 MB) - Already exists
✅ `backend/routes/predictRoutes.js` - Already configured
✅ `backend/ai_model/predict.py` - Already working
✅ `frontend/src/pages/FacialScreeningPage.jsx` - Already functional

**Everything is ready!** Just start the servers and upload an image.

---

## 🎯 Expected Flow

1. **Upload image** → Preview appears ✅
2. **Click Analyze** → Loading spinner appears ⏳
3. **Wait 2-5 seconds** → Python processes image 🐍
4. **Results appear** → Prediction + Confidence ✅

---

## 📞 Need Help?

See detailed guide: `FACIAL_SCREENING_COMPLETE_GUIDE.md`

---

*CORTEXA - ASD Detection & Support System*
