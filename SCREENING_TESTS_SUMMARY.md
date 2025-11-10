# Screening Test Submission - CNN & SVM Module Tests

## Test Coverage

I've created comprehensive Playwright tests for the Screening Test Submission functionality covering both CNN and SVM modules.

### Test File Location
**`frontend/tests/screening.spec.js`**

## Test Categories

### 1. Facial Image Screening (CNN Module) - 7 Tests
- ✅ Display screening form
- ✅ Allow file selection
- ✅ Show file name after selection
- ✅ Display analyze button
- ✅ Show error if submitting without file
- ✅ Display loading state during submission
- ✅ Have link to questionnaire

### 2. Voice Screening Module - 4 Tests
- ✅ Display voice screening page
- ✅ Show microphone permission button
- ✅ Display recording controls when permission granted
- ✅ Have submit/analyze button for recorded audio

### 3. MRI Screening (SVM Module) - 6 Tests
- ✅ Display MRI screening page
- ✅ Display file upload input
- ✅ Accept MRI file formats (.nii.gz, .1d, .txt)
- ✅ Show upload button
- ✅ Display error for invalid file format
- ✅ Show back button to return to screening

### 4. Screening Tools Navigation - 4 Tests
- ✅ Display screening tools page
- ✅ Have link to image screening (CNN)
- ✅ Have link to questionnaire
- ✅ Navigate to image screening page

### 5. Complete Screening Flow Tests - 2 Tests
- ✅ Complete full CNN screening workflow
- ✅ Complete full SVM (MRI) screening workflow

### 6. Screening Results Display - 1 Test
- ✅ Display result container structure

## Total Tests: 24 Tests

## Test Features

### Authentication
- All screening tests automatically login as parent user
- Uses test credentials from `test-utils.js`

### File Upload Testing
- Tests file input visibility and functionality
- Verifies file format acceptance
- Tests error handling for invalid files

### Form Submission Testing
- Tests form validation
- Tests loading states
- Tests error messages
- Tests success scenarios

### Navigation Testing
- Tests navigation between screening pages
- Tests links to different screening tools
- Tests back navigation

## API Endpoints Tested

1. **CNN Module**: `POST /api/predict` (Facial Image Screening)
2. **SVM Module**: `POST /api/predict-mri` (MRI Screening)
3. **Voice Module**: `POST http://localhost:5001/predict-voice` (Voice Screening)

## Running the Tests

```bash
cd frontend
npm run test:e2e
```

Or run only screening tests:
```bash
cd frontend
npx playwright test tests/screening.spec.js
```

## Viewing Test Results

The tests generate an HTML report that can be viewed in the browser:

```bash
cd frontend
npm run test:e2e:report
```

Or open directly:
```bash
cd frontend
start playwright-report\index.html
```

## Test Prerequisites

1. **Frontend server** running on `http://localhost:3000`
2. **Backend server** running on `http://localhost:5000`
3. **Python server** (for voice screening) on `http://localhost:5001` (optional)
4. **Test user credentials** in database (parent user)

## Test Structure

```javascript
test.describe('Screening Test Submission - CNN & SVM Modules', () => {
  // Helper function for login
  // Facial Image Screening (CNN) tests
  // Voice Screening tests
  // MRI Screening (SVM) tests
  // Navigation tests
  // Complete workflow tests
  // Results display tests
});
```

## Notes

- Tests are designed to work even if backend services are not fully available
- Tests verify UI elements and user interactions
- Some tests may require actual file uploads for full functionality
- Tests include error handling and edge cases


