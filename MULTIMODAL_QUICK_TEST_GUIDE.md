# Quick Start Guide: Multimodal ASD Assessment System

## 🚀 Quick Start

### Step 1: Start the Backend

```bash
cd backend
npm start
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected
```

### Step 2: Start the Frontend

```bash
cd frontend
npm start
```

**Expected Output:**
```
Compiled successfully!
Local: http://localhost:3000
```

---

## 🧪 Testing the System

### Test Scenario 1: View Multimodal Report

1. **Login as Therapist**
   - Go to `http://localhost:3000/login`
   - Use therapist credentials

2. **Navigate to Patient Profile**
   - Click "My Patients" in sidebar
   - Select any patient who has completed screenings

3. **View Multimodal Assessment**
   - Scroll down to see "Multimodal ASD Assessment Report" section
   - Check that individual module scores are displayed
   - Verify final risk score is calculated correctly

**Expected Result:**
- Report shows all completed screening modules
- Individual scores displayed with color coding
- Final score calculated using weighted formula
- Risk level (Low/Moderate/High) displayed correctly

---

### Test Scenario 2: Take Therapist Action

1. **View a patient's multimodal report**

2. **Click an action button:**
   - "Schedule Consultation Meeting"
   - "Send Report to Parent"
   - "Mark as Low Risk"

3. **Verify the action was recorded**
   - Alert message should appear
   - Report should refresh
   - Decision status should update

**Expected Result:**
- Action is recorded successfully
- Status shows updated decision
- No errors in console

---

### Test Scenario 3: Missing Screening Modules

1. **View a patient with incomplete screenings**

2. **Check the report behavior**
   - Should show "Not Completed" for missing modules
   - Should calculate score with only available modules
   - Should show error if NO modules are completed

**Expected Result:**
- Graceful handling of missing data
- Clear indication of which modules are missing
- Helpful error messages

---

## 🔍 API Testing with curl

### Test 1: Get Combined Report

```bash
curl -X GET \
  "http://localhost:5000/api/therapist/combined-asd-report?patient_id=YOUR_PATIENT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "patientId": "...",
  "facial_score": 0.72,
  "mri_score": 0.64,
  "gaze_score": 0.48,
  "behavior_score": 0.61,
  "questionnaire_score": 0.70,
  "final_score": 0.63,
  "risk_level": "Moderate",
  "completed_modules": [...]
}
```

---

### Test 2: Record Therapist Decision

```bash
curl -X POST \
  "http://localhost:5000/api/therapist/combined-report/decision" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "YOUR_PATIENT_ID",
    "decision": "consultation_scheduled",
    "notes": "Follow-up required"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Therapist decision recorded successfully",
  "decision": "consultation_scheduled",
  "reportId": "..."
}
```

---

## 📊 Database Verification

### Check if Combined Reports are Being Created

```javascript
// In MongoDB Shell or Compass
db.combinedasdreports.find().pretty()
```

**Expected:**
- New documents created for each patient
- `finalScore`, `riskLevel` populated correctly
- `completedModules` array contains screening types
- `therapistDecision` tracks actions

---

## ✅ Verification Checklist

**Backend:**
- [ ] Server starts without errors
- [ ] `/api/therapist/combined-asd-report` endpoint responds
- [ ] Weighted calculation is correct
- [ ] Reports saved to database
- [ ] Patient records updated with multimodal scores

**Frontend:**
- [ ] MultimodalASDReport component renders
- [ ] Individual module scores display correctly
- [ ] Final score circle visualization works
- [ ] Action buttons are functional
- [ ] Loading states appear correctly
- [ ] Error messages show when no data available

**Integration:**
- [ ] Report appears in patient profile page
- [ ] Fetches data automatically on page load
- [ ] Action buttons update the database
- [ ] Report refreshes after action taken

---

## 🐛 Troubleshooting

### Issue: "No screening results available"

**Solution:**
- Ensure patient has completed at least one screening module
- Check that screening records have `resultScore` field populated
- Verify screening status is 'completed'

---

### Issue: Score is null or undefined

**Solution:**
- Check that screening data format matches expected structure
- Verify gaze sessions have result.asdScore or result.riskLevel
- Ensure behavioral assessments have normalized scores (0-1)

---

### Issue: Component not rendering

**Solution:**
- Check browser console for errors
- Verify import path is correct
- Ensure CSS file is imported
- Check that patientId prop is passed correctly

---

### Issue: Action buttons not working

**Solution:**
- Check that JWT token is valid
- Verify patient belongs to logged-in therapist
- Check browser console for API errors
- Ensure patient has a combined report generated

---

## 🎯 Sample Test Data

### Create Test Patient with Screenings

```javascript
// Example: Create screening results for testing
const testScreenings = [
  {
    patientId: "PATIENT_OBJECT_ID",
    screeningType: "facial",
    resultScore: 0.72,
    resultLabel: "High Risk",
    confidenceScore: 0.89,
    status: "completed"
  },
  {
    patientId: "PATIENT_OBJECT_ID",
    screeningType: "mri",
    resultScore: 0.64,
    resultLabel: "Moderate Risk",
    confidenceScore: 0.82,
    status: "completed"
  },
  {
    patientId: "PATIENT_OBJECT_ID",
    screeningType: "questionnaire",
    resultScore: 0.70,
    resultLabel: "High Risk",
    confidenceScore: 0.95,
    status: "completed"
  }
];

// Insert into database
db.screenings.insertMany(testScreenings);
```

---

## 📞 Need Help?

1. Check the main documentation: `MULTIMODAL_ASD_ASSESSMENT_IMPLEMENTATION.md`
2. Review backend logs for errors
3. Check browser console for frontend errors
4. Verify database connections are working
5. Ensure all dependencies are installed

---

## 🎉 Success Indicators

Your implementation is working correctly if:

✅ Patient profile page loads without errors  
✅ Multimodal report section appears below screening history  
✅ Individual module scores display with proper formatting  
✅ Final risk score shows in circular progress indicator  
✅ Risk level badge displays with correct color  
✅ Action buttons are clickable and responsive  
✅ Decisions are saved and status updates  
✅ Database records are created correctly  

---

**Ready to Test!** 🚀

The Multimodal ASD Assessment System is now fully implemented and ready for testing.
