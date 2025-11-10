# Complete Playwright Testing Suite

## Test Coverage

This comprehensive Playwright test suite covers all major functionality of the ASD application:

### 1. Home Page Tests (`homepage.spec.js`)
- Navigation elements
- Call-to-action buttons
- "How It Works" section
- Links to registration and login

### 2. Registration Page Tests (`registration.spec.js`)
- Form fields validation
- Role selection
- Password visibility toggle
- Form submission
- Navigation to login page

### 3. Login Page Tests (`login.spec.js`)
- Login form functionality
- Role-based login for all 5 user types
- Google sign-in option
- Error handling

### 4. Authentication Flow Tests (`auth-flow.spec.js`)
- Complete authentication flow for all user roles:
  - Admin
  - Researcher
  - Parent
  - Teacher
  - Therapist

### 5. Dashboard Tests (`dashboards/`)
- **Admin Dashboard** (`admin-dashboard.spec.js`)
- **Researcher Dashboard** (`researcher-dashboard.spec.js`)
- **Parent Dashboard** (`parent-dashboard.spec.js`)
- **Teacher Dashboard** (`teacher-dashboard.spec.js`)
- **Therapist Dashboard** (`therapist-dashboard.spec.js`)

### 6. Screening Test Submission (CNN & SVM Module) (`screening.spec.js`)

#### Facial Image Screening (CNN Module) - 7 Tests
- ✅ Display screening form
- ✅ Allow file selection
- ✅ Show file name after selection
- ✅ Display analyze button
- ✅ Show error if submitting without file
- ✅ Display loading state during submission
- ✅ Have link to questionnaire

#### Voice Screening Module - 4 Tests
- ✅ Display voice screening page
- ✅ Show microphone permission button
- ✅ Display recording controls when permission granted
- ✅ Have submit/analyze button for recorded audio

#### MRI Screening (SVM Module) - 6 Tests
- ✅ Display MRI screening page
- ✅ Display file upload input
- ✅ Accept MRI file formats (.nii.gz, .1d, .txt)
- ✅ Show upload button
- ✅ Display error for invalid file format
- ✅ Show back button to return to screening

#### Screening Tools Navigation - 4 Tests
- ✅ Display screening tools page
- ✅ Have link to image screening (CNN)
- ✅ Have link to questionnaire
- ✅ Navigate to image screening page

#### Complete Screening Flow Tests - 2 Tests
- ✅ Complete full CNN screening workflow
- ✅ Complete full SVM (MRI) screening workflow

#### Screening Results Display - 1 Test
- ✅ Display result container structure

## Test Credentials

All tests use the following credentials from `test-utils.js`:

| Role | Email | Password | Route |
|------|-------|----------|-------|
| Admin | alentatms27@gmail.com | 2276273 | /admin |
| Researcher | alentatom02@gmail.com | 7887 | /research |
| Parent | hayestheosinclair25@gmail.com | 27102002 | /dashboard |
| Teacher | alentahhhtom10@gmail.com | pedri | /teacher |
| Therapist | alentatom2026@mca.ajce.in | alentatom16520 | /therapist |

## Running Tests

### Run All Tests
```bash
cd frontend
npm run test:e2e
```

Or:
```bash
cd frontend
npx playwright test
```

### Run Specific Test Suite
```bash
# Homepage tests
npx playwright test tests/homepage.spec.js

# Registration tests
npx playwright test tests/registration.spec.js

# Login tests
npx playwright test tests/login.spec.js

# Screening tests (CNN & SVM)
npx playwright test tests/screening.spec.js

# Dashboard tests
npx playwright test tests/dashboards/
```

### Run with HTML Report
```bash
cd frontend
npx playwright test --reporter=html
```

## Viewing Test Results

### Open HTML Report
```bash
cd frontend
npx playwright show-report
```

Or open directly:
```bash
cd frontend
start playwright-report\index.html
```

### View Test Results in Browser
The HTML report provides:
- Test execution summary
- Pass/fail status for each test
- Screenshots on failure
- Video recordings on failure
- Detailed error messages
- Test execution timeline

## Test Configuration

The Playwright configuration (`playwright.config.js`) includes:
- **Base URL**: `http://localhost:3000`
- **Auto-start server**: Automatically starts the frontend server before tests
- **Screenshots**: Captured on test failure
- **Videos**: Recorded on test failure
- **Trace**: Collected on first retry
- **Reporter**: HTML reporter for detailed reports

## Test Structure

```
frontend/tests/
├── test-utils.js              # Shared utilities and credentials
├── homepage.spec.js          # Home page tests
├── registration.spec.js      # Registration page tests
├── login.spec.js             # Login page tests
├── auth-flow.spec.js         # Complete authentication flow
├── screening.spec.js         # Screening tests (CNN & SVM)
└── dashboards/
    ├── admin-dashboard.spec.js
    ├── researcher-dashboard.spec.js
    ├── parent-dashboard.spec.js
    ├── teacher-dashboard.spec.js
    └── therapist-dashboard.spec.js
```

## Total Test Count

- **Homepage**: ~5 tests
- **Registration**: ~6 tests
- **Login**: ~5 tests
- **Auth Flow**: ~1 comprehensive test
- **Dashboards**: ~15 tests (3 per dashboard)
- **Screening (CNN & SVM)**: 24 tests
- **Total**: ~56+ tests

## Prerequisites

1. **Frontend server** running on `http://localhost:3000` (auto-started by Playwright)
2. **Backend server** running on `http://localhost:5000`
3. **Database** with test user accounts
4. **Python server** (for voice screening) on `http://localhost:5001` (optional)

## Notes

- Tests are designed to be resilient and handle edge cases
- Screenshots and videos are automatically captured on failures
- Tests include proper error handling and timeouts
- All tests use centralized credentials from `test-utils.js`
- Tests clean up storage between runs to avoid state issues


