# 🚀 CORTEXA MULTIMODAL SYSTEM - QUICK START GUIDE

## ⚡ 5-Minute Implementation

### Step 1: Verify Backend Changes (30 seconds)

```bash
cd d:\ASD\backend
npm start
```

**Look for this in console:**
```
✅ Patient Management Routes Registered
```

### Step 2: Add Frontend Route (1 minute)

**Edit `frontend/src/App.js`:**

```javascript
// Add import at top
import PatientManagementPage from './pages/PatientManagementPage';

// Add route in your routing section
<Route path="/patients" element={<PatientManagementPage />} />
```

### Step 3: Add Navigation Link (30 seconds)

**Add this link to your navigation menu:**

```jsx
<Link to="/patients">👥 Patient Management</Link>
```

### Step 4: Start Frontend (1 minute)

```bash
cd d:\ASD\frontend
npm start
```

### Step 5: Test the System (2 minutes)

1. **Navigate to** `http://localhost:3000/patients`

2. **Click "Register New Patient"**
   - Fill: Name, Age, Gender
   - Submit
   - Note the CORTEXA_001 ID generated!

3. **Click "Start Screening"** on the patient card
   - System stores patient ID in localStorage
   - Go perform any screening test

4. **Perform a Screening** (e.g., Facial Analysis)
   - The screening will automatically link to your patient!

5. **Click "View Report"**
   - See the multimodal report with all screening results

---

## 🎯 What Just Happened?

### Before ❌
- Screenings were independent
- No patient tracking
- No combined results
- No final diagnosis

### After ✅
- Patients have unique IDs (CORTEXA_XXX)
- All screenings link to patients
- Multimodal fusion combines results
- Final ASD risk assessment generated!

---

## 📊 Quick Test Workflow

```
Register Patient (CORTEXA_001)
    ↓
Perform Facial Analysis (score: 0.75)
    ↓
Perform MRI Screening (score: 0.65)
    ↓
Complete Questionnaire (score: 0.50)
    ↓
View Multimodal Report
    ↓
Final Score: 0.63 (Moderate Risk) ✅
```

---

## 🔧 API Endpoints Ready to Use

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patients/register` | Register new patient |
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/:id` | Get patient details |
| GET | `/api/patients/:id/multimodal-report` | Generate report |
| POST | `/api/predict` | Facial (with patientId) |
| POST | `/api/predict-mri` | MRI (with patientId) |
| POST | `/api/parent/predict-survey` | Survey (with patientId) |

---

## 💡 Integration Example

**Before (Old Method):**
```javascript
// Facial analysis - no patient tracking
const formData = new FormData();
formData.append('image', imageFile);

fetch('/api/predict', {
  method: 'POST',
  body: formData
});
```

**After (New Method):**
```javascript
// Facial analysis - links to patient!
const patientId = localStorage.getItem('currentPatientId');

const formData = new FormData();
formData.append('image', imageFile);
formData.append('patientId', patientId); // ← ADD THIS LINE

fetch('/api/predict', {
  method: 'POST',
  body: formData
});
```

---

## 🎨 New UI Components Available

### 1. **PatientRegistration** Component
```jsx
import PatientRegistration from '../components/PatientRegistration';

<PatientRegistration 
  onSuccess={(patient) => console.log('New patient:', patient.cortexaId)}
  onCancel={() => goBack()}
/>
```

### 2. **MultimodalReport** Component
```jsx
import MultimodalReport from '../components/MultimodalReport';

<MultimodalReport 
  patientId={selectedPatient._id}
  onClose={() => goBack()}
/>
```

### 3. **PatientManagementPage**
- Full dashboard with patient list
- Search functionality
- Statistics cards
- Quick actions

---

## 🧪 Test API with cURL

### 1. Register Patient
```bash
curl -X POST http://localhost:5000/api/patients/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Child",
    "age": 6,
    "gender": "Male"
  }'
```

### 2. Get Multimodal Report
```bash
curl -X GET http://localhost:5000/api/patients/PATIENT_ID/multimodal-report \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔥 Multimodal Fusion Algorithm

```javascript
Final Score = 
  (MRI × 0.30) +
  (Facial × 0.20) +
  (Questionnaire × 0.20) +
  (Behavioral × 0.15) +
  (Gaze × 0.10) +
  (Speech × 0.05)

Risk Levels:
- Low:      < 0.33
- Moderate: 0.33 - 0.67
- High:     > 0.67
```

---

## ✅ Success Checklist

- [ ] Backend shows "Patient Management Routes Registered"
- [ ] Can access `/patients` page
- [ ] Can register new patient
- [ ] CORTEXA_XXX ID is generated
- [ ] Can perform screening with patient ID
- [ ] Screening appears in patient's list
- [ ] Can generate multimodal report
- [ ] Report shows final score and risk level

---

## 🚨 Troubleshooting

### "Patient Management Routes not registered"
→ Check `backend/routes/patients.js` exists
→ Verify it's imported in `backend/index.js`

### "Cannot access /patients page"
→ Add route to `App.js`
→ Check React Router is configured

### "Patient ID not included in screening"
→ Use `localStorage.getItem('currentPatientId')`
→ Add `patientId` to FormData or request body

### "Report shows no screenings"
→ Verify screenings have `patientId` field
→ Check MongoDB screenings collection

---

## 📚 Key Files Created/Updated

### Backend:
- ✅ `models/patient.js` - Updated with CORTEXA ID
- ✅ `models/screening.js` - Enhanced with multimodal fields
- ✅ `routes/patients.js` - NEW patient management APIs
- ✅ `utils/multimodalFusion.js` - NEW fusion algorithm
- ✅ `utils/trackScreening.js` - Updated for patient IDs
- ✅ `index.js` - Registered patient routes

### Frontend:
- ✅ `components/PatientRegistration.jsx` - NEW registration form
- ✅ `components/PatientRegistration.css` - Styling
- ✅ `components/MultimodalReport.jsx` - NEW report viewer
- ✅ `components/MultimodalReport.css` - Styling
- ✅ `pages/PatientManagementPage.jsx` - NEW main dashboard
- ✅ `pages/PatientManagementPage.css` - Styling

---

## 🎊 You're Ready!

The CORTEXA platform is now a complete **patient-based multimodal ASD screening system**!

### What You Can Do Now:
1. ✅ Register patients with unique IDs
2. ✅ Perform multiple screening tests per patient
3. ✅ Track screening completeness
4. ✅ Generate comprehensive multimodal reports
5. ✅ View final ASD risk assessments
6. ✅ Get clinical recommendations

---

## 📞 Need Help?

Check the complete guide:
→ `MULTIMODAL_SYSTEM_IMPLEMENTATION_GUIDE.md`

---

**🚀 Start Testing Now!**
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm start

# Browser
http://localhost:3000/patients
```
