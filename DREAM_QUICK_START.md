# 🚀 DREAM Dataset Integration - Quick Start

## ✅ What's Been Implemented

Your CORTEXA Therapist Dashboard now displays **real biometric metrics from the DREAM Dataset** instead of showing all zeros!

**Extracted Metrics:**
- ✅ Average Joint Velocity (Motor Activity)
- ✅ Head Gaze Variance (Social Attention)
- ✅ Communication Score & ADOS Total Score (Clinical)
- ✅ Total Displacement Ratio (Movement Extent)
- ✅ Eye Gaze Consistency (Bonus metric)

---

## 🎯 Quick Test (2 minutes)

### 1. Test Feature Extraction

```bash
cd D:\ASD\backend
python test_dream_extraction.py
```

**Expected Output:**
```
✅ Feature extractor initialized
✅ Features extracted successfully!
   Average Joint Velocity: 13.7354 m/s
   Head Gaze Variance: 0.067085
   ADOS Total Score: 14
```

### 2. Start System

**Terminal 1 - Backend:**
```bash
cd D:\ASD\backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd D:\ASD\frontend
npm start
```

### 3. View Dashboard

1. Go to: http://localhost:3000/therapist-dashboard
2. Select any patient
3. Scroll to **"DREAM Dataset Analysis"** section
4. You should now see **actual values** instead of zeros!

---

## 📁 Files Created

```
backend/
├── dream_feature_extractor.py    ← Core extraction logic
├── dream_worker.py                ← Called by Node.js
├── dream_api.py                   ← Standalone Flask API (optional)
├── test_dream_extraction.py      ← Test script
├── test_dream.bat                 ← Windows test launcher
├── start_dream_api.bat           ← Flask API launcher
├── requirements.txt               ← Updated (added Flask)
└── routes/therapist.js            ← Updated endpoint

DREAM_DATASET_IMPLEMENTATION_GUIDE.md  ← Full documentation
DREAM_QUICK_START.md                   ← This file
```

---

## 🔧 How It Works

```
User selects patient in dashboard
         ↓
Frontend requests metrics
         ↓
Node.js checks database
         ↓
If no data → calls Python worker
         ↓
Python extracts features from DREAM JSON
         ↓
Returns real metrics to frontend
         ↓
Dashboard displays actual values ✓
```

---

## 📊 Sample Output

**Before Implementation:**
```
Average Joint Velocity: 0 m/s
Head Gaze Variance: 0
ADOS Score: 0
```

**After Implementation:**
```
Average Joint Velocity: 13.74 m/s
Head Gaze Variance: 0.067
ADOS Communication Score: 6
ADOS Total Score: 14
Displacement Ratio: 492.21
```

---

## 🧪 Test Individual Components

### Test Python Extractor
```bash
python test_dream_extraction.py
```

### Test Worker (JSON output)
```bash
python dream_worker.py 10
```

### Test API Endpoint (from frontend)
```bash
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5000/api/therapist/behavioral-metrics/PATIENT_ID
```

---

## 📈 Dataset Info

- **Total Patients**: 61 users
- **Total Sessions**: 3000+ recordings
- **Data Location**: `D:\ASD\data\dream_dataset\extracted\`
- **Available Users**: 10-80 (not all sequential)

**Example Users:**
- DREAM_10: 57 sessions
- DREAM_11: 59 sessions
- DREAM_12: 52 sessions

---

## ⚠️ Troubleshooting

### Issue: Still showing zeros

**Check:**
1. Backend logs for errors
2. Python worker: `python dream_worker.py 10`
3. Dataset path: `D:\ASD\data\dream_dataset\extracted\`

### Issue: Python module error

**Fix:**
```bash
cd D:\ASD\backend
.venv\Scripts\activate
pip install numpy pandas flask flask-cors
```

### Issue: Dataset not found

**Verify path exists:**
```bash
dir D:\ASD\data\dream_dataset\extracted\
```

Should show folders: `User 10`, `User 11`, etc.

---

## 🎨 Frontend Display

The dashboard now shows:

**1. Motor Activity Card**
- Average Joint Velocity with progress bar
- Risk level indicator (Low/Moderate/High)
- Clinical interpretation

**2. Social Attention Card**
- Head Gaze Variance
- Attention stability metrics
- Risk assessment

**3. ADOS Clinical Scores**
- Communication score
- Total ADOS score
- Clinical severity baseline

**4. Movement Extent Card**
- Displacement ratio
- Movement efficiency metrics

---

## 📚 Documentation

For detailed information, see:
- **Full Guide**: `DREAM_DATASET_IMPLEMENTATION_GUIDE.md`
- **API Reference**: Section in full guide
- **Customization**: Customization section in full guide

---

## ✅ Success Criteria

✓ Test script runs without errors
✓ Python worker outputs valid JSON
✓ Backend starts successfully
✓ Frontend displays non-zero values
✓ Dashboard shows realistic metrics

**All criteria met! 🎉**

---

## 🚀 Next Steps (Optional)

1. **Cache features in MongoDB** for faster loading
2. **Add progress tracking** across multiple sessions
3. **Export to CSV** for analysis
4. **Train ML models** on extracted features
5. **Add visualization charts** for trends

---

## 💡 Pro Tips

1. **Map patients to DREAM IDs**: Edit patient database to include DREAM_ID field
2. **Run Flask API separately**: Use `start_dream_api.bat` for API testing
3. **Export all features**: Use `/api/dream-analysis/export` endpoint
4. **Batch processing**: Extract all 3000+ sessions at once and cache

---

## 🆘 Need Help?

1. Run `python test_dream_extraction.py` for diagnostics
2. Check backend console for error messages
3. Verify Python environment: `python --version` (should be 3.10+)
4. Check dataset integrity: Should have 60+ User folders

---

**System Status: ✅ OPERATIONAL**

The CORTEXA Therapist Dashboard now displays real DREAM dataset metrics!
