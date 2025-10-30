# 🧪 Testing Guide - MRI ASD Detection Web App

## 📋 Pre-Testing Checklist

Before you start testing, ensure:

- [ ] Python 3.8+ is installed
- [ ] All dependencies are installed (`pip install -r requirements.txt`)
- [ ] Model is trained (`python train_and_save_model.py`)
- [ ] Model files exist: `asd_svm_model.pkl`, `scaler.pkl`
- [ ] Server is running (`python app_mri.py`)
- [ ] Browser is open at `http://localhost:5002`

---

## 🎯 Test Scenarios

### Test 1: Basic Functionality Test

**Objective**: Verify the application loads and accepts files

**Steps**:
1. Open `http://localhost:5002` in your browser
2. Verify the page loads with the title "MRI-Based ASD Screening"
3. Check that the upload area is visible
4. Check that the "Analyze MRI Scan" button is present

**Expected Result**: ✅ Page loads successfully with all UI elements

---

### Test 2: File Upload Test (Valid File)

**Objective**: Test uploading a valid MRI scan

**Test File**: Use any file from:
```
d:\ASD\backend\ds000212\derivatives\preprocessed_data\sub-pixar001\
sub-pixar001_task-pixar_run-001_swrf_bold.nii.gz
```

**Steps**:
1. Click the upload area
2. Select the test file
3. Verify the file name appears below the upload area
4. Verify the upload area changes color (blue border)

**Expected Result**: ✅ File is selected and displayed

---

### Test 3: Prediction Test (ASD Case)

**Objective**: Test prediction on an ASD subject

**Test File**: 
```
sub-pixar001_task-pixar_run-001_swrf_bold.nii.gz
```
(Check `participants.tsv` to confirm this is an ASD case)

**Steps**:
1. Upload the test file
2. Click "Analyze MRI Scan"
3. Wait for processing (30-60 seconds)
4. Observe the loading spinner
5. Check the results

**Expected Result**: 
✅ Diagnosis: ASD  
✅ Confidence: >50%  
✅ Results display with color coding  

**Server Log Check**:
```
📁 Processing uploaded file: sub-pixar001_task-pixar_run-001_swrf_bold.nii.gz
  [1/3] Extracting connectivity features...
  ✓ Extracted 2016 features
  [2/3] Making prediction...
  ✓ Prediction: ASD (confidence: XX.X%)
  [3/3] Cleaning up...
  ✓ Temporary file removed
✅ Request completed successfully
```

---

### Test 4: Prediction Test (Control Case)

**Objective**: Test prediction on a control subject

**Test File**: 
```
sub-pixar023_task-pixar_run-001_swrf_bold.nii.gz
```
(Check `participants.tsv` to confirm this is a Control case)

**Steps**:
1. Upload the test file
2. Click "Analyze MRI Scan"
3. Wait for processing
4. Check the results

**Expected Result**: 
✅ Diagnosis: Control  
✅ Confidence: >50%  
✅ Green color indicator  

---

### Test 5: Invalid File Format Test

**Objective**: Verify error handling for invalid files

**Test Files**:
- A `.txt` file
- A `.jpg` image
- A `.pdf` document

**Steps**:
1. Try to upload an invalid file
2. Click "Analyze MRI Scan"

**Expected Result**: 
✅ Frontend shows alert: "Invalid file format"  
OR  
✅ Backend returns error: "Invalid file format. Please upload a .nii or .nii.gz file"

---

### Test 6: No File Selected Test

**Objective**: Verify validation when no file is selected

**Steps**:
1. Don't select any file
2. Click "Analyze MRI Scan"

**Expected Result**: 
✅ Alert message: "Please select an MRI scan file"  
✅ No request sent to server

---

### Test 7: Large File Test

**Objective**: Test handling of large files

**Test File**: Any large .nii.gz file (>100 MB)

**Steps**:
1. Upload a large file
2. Click "Analyze MRI Scan"
3. Monitor processing time

**Expected Result**: 
✅ File uploads successfully (if <500 MB)  
✅ Processing completes (may take longer)  
✅ Results are displayed  

**Note**: Files >500 MB should be rejected

---

### Test 8: Multiple Consecutive Predictions

**Objective**: Test stability with multiple requests

**Steps**:
1. Upload and analyze file #1
2. Wait for results
3. Click "Upload Another Scan"
4. Upload and analyze file #2
5. Repeat 3-5 times

**Expected Result**: 
✅ Each prediction completes successfully  
✅ No memory leaks  
✅ Server remains responsive  
✅ Temporary files are cleaned up

---

### Test 9: Health Check Endpoint

**Objective**: Verify the health check endpoint works

**Steps**:
1. Open a new browser tab
2. Navigate to `http://localhost:5002/health`

**Expected Result**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "scaler_loaded": true,
  "preprocessing_ready": true
}
```

---

### Test 10: API Direct Test (Using curl or Postman)

**Objective**: Test the API endpoint directly

**Using curl** (PowerShell):
```powershell
$file = "d:\ASD\backend\ds000212\derivatives\preprocessed_data\sub-pixar001\sub-pixar001_task-pixar_run-001_swrf_bold.nii.gz"
curl.exe -X POST -F "mri_file=@$file" http://localhost:5002/predict_mri
```

**Expected Response**:
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

---

## 🔍 Detailed Test Cases

### Test Case 1: UI Responsiveness

**Test on different screen sizes**:
- Desktop (1920x1080)
- Tablet (768x1024)
- Mobile (375x667)

**Expected**: UI adapts to all screen sizes

---

### Test Case 2: Browser Compatibility

**Test on different browsers**:
- Chrome
- Firefox
- Edge
- Safari (if available)

**Expected**: Works on all modern browsers

---

### Test Case 3: Error Recovery

**Scenario**: Server crashes during processing

**Steps**:
1. Start processing a file
2. Stop the server (Ctrl+C)
3. Restart the server
4. Try uploading again

**Expected**: Application recovers gracefully

---

### Test Case 4: Concurrent Requests

**Scenario**: Multiple users at once (development mode limitation)

**Steps**:
1. Open two browser windows
2. Upload files in both simultaneously

**Expected**: 
- One completes successfully
- Other may queue or fail (expected in dev mode)
- No server crash

---

## 📊 Performance Testing

### Timing Benchmarks

Record the time for each step:

| Step | Expected Time | Your Result |
|------|---------------|-------------|
| Page Load | <2 seconds | _____ |
| File Upload | <5 seconds | _____ |
| Feature Extraction | 20-40 seconds | _____ |
| Prediction | <1 second | _____ |
| Total Processing | 30-60 seconds | _____ |

---

### Memory Usage

Monitor memory during processing:

**Windows Task Manager**:
1. Open Task Manager
2. Find `python.exe` process
3. Monitor memory usage

**Expected**:
- Idle: ~200-300 MB
- Processing: ~500-800 MB
- After cleanup: Returns to idle

---

## 🐛 Common Issues and Solutions

### Issue 1: "Model not initialized"

**Cause**: Model files don't exist

**Solution**:
```bash
python train_and_save_model.py
```

---

### Issue 2: "No module named 'nilearn'"

**Cause**: Dependencies not installed

**Solution**:
```bash
pip install -r requirements.txt
```

---

### Issue 3: Processing takes too long (>2 minutes)

**Possible Causes**:
- Large file size
- Slow CPU
- Insufficient memory

**Solution**:
- Check file size
- Close other applications
- Ensure 4GB+ RAM available

---

### Issue 4: "File not found" error

**Cause**: Incorrect file path in test

**Solution**: Use absolute paths or verify file exists

---

### Issue 5: Server crashes during processing

**Possible Causes**:
- Corrupted MRI file
- Out of memory
- Invalid NIfTI format

**Solution**:
- Check server logs
- Verify file integrity
- Try a different file

---

## ✅ Test Results Template

Use this template to record your test results:

```
=== MRI ASD Detection Web App - Test Results ===

Date: _______________
Tester: _______________
Environment: _______________

Test 1: Basic Functionality
Status: [ ] Pass [ ] Fail
Notes: _________________________________

Test 2: File Upload (Valid)
Status: [ ] Pass [ ] Fail
Notes: _________________________________

Test 3: Prediction (ASD)
Status: [ ] Pass [ ] Fail
Diagnosis: _________
Confidence: ________%
Notes: _________________________________

Test 4: Prediction (Control)
Status: [ ] Pass [ ] Fail
Diagnosis: _________
Confidence: ________%
Notes: _________________________________

Test 5: Invalid File Format
Status: [ ] Pass [ ] Fail
Notes: _________________________________

Test 6: No File Selected
Status: [ ] Pass [ ] Fail
Notes: _________________________________

Test 7: Large File
Status: [ ] Pass [ ] Fail
Processing Time: _______ seconds
Notes: _________________________________

Test 8: Multiple Predictions
Status: [ ] Pass [ ] Fail
Number of Tests: _______
Notes: _________________________________

Test 9: Health Check
Status: [ ] Pass [ ] Fail
Notes: _________________________________

Test 10: API Direct Test
Status: [ ] Pass [ ] Fail
Notes: _________________________________

=== Performance Metrics ===
Average Processing Time: _______ seconds
Memory Usage (Peak): _______ MB
Page Load Time: _______ seconds

=== Overall Assessment ===
Total Tests: _______
Passed: _______
Failed: _______
Success Rate: _______%

=== Issues Found ===
1. _________________________________
2. _________________________________
3. _________________________________

=== Recommendations ===
1. _________________________________
2. _________________________________
3. _________________________________

Tester Signature: _______________
```

---

## 🎯 Acceptance Criteria

The application is ready for deployment if:

✅ All 10 test scenarios pass  
✅ Processing time is <90 seconds  
✅ No memory leaks detected  
✅ Error handling works correctly  
✅ UI is responsive and user-friendly  
✅ API returns correct JSON format  
✅ Temporary files are cleaned up  
✅ Server logs are clear and informative  

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Document Results**: Fill out the test results template
2. **Review Logs**: Check for any warnings or errors
3. **Performance Tuning**: Optimize if needed
4. **User Acceptance**: Have end-users test
5. **Production Deployment**: Deploy to production server
6. **Monitoring**: Set up logging and monitoring

---

## 📞 Support

If you encounter issues during testing:

1. Check server logs for detailed error messages
2. Review the troubleshooting section in `README_MRI_WEB_APP.md`
3. Verify all dependencies are correctly installed
4. Ensure model files exist and are not corrupted

---

**Happy Testing! 🧪🎉**