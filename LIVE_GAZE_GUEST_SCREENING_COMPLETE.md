# 🎯 Live Gaze Analysis Guest Screening - Complete Implementation

## Overview
Implemented a dedicated unauthenticated API endpoint for guest live gaze screening submissions in CORTEXA. This allows anonymous users to submit gaze analysis sessions without login, parent role assignment, or redirects.

---

## ✅ Implementation Summary

### 1. Backend: Dedicated Guest API Endpoint

#### New Route: `POST /api/guest/live-gaze/submit`
**File**: `backend/routes/guest.js` (NEW)

**Features**:
- ✅ **Unauthenticated** - No login or token required
- ✅ **No parent role assignment** - Assigns to therapist by default
- ✅ **Saves images** - Processes base64 snapshots to disk
- ✅ **Stores metadata** - Includes gaze metrics (attentionScore, direction, status)
- ✅ **Proper categorization** - Sets `sessionType: 'guest_screening'`, `module: 'live_gaze'`

**Request Format**:
```json
{
  "guestInfo": {
    "childName": "John Doe",
    "parentName": "Jane Doe",
    "email": "jane@example.com"
  },
  "snapshots": [
    {
      "image": "data:image/png;base64,...",
      "timestamp": "2026-01-19T10:30:00Z",
      "attentionScore": 0.85,
      "gazeDirection": "center",
      "status": "captured"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session sent to therapist for review.",
  "sessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
  "snapshotsProcessed": 5
}
```

**Storage Schema**:
```javascript
{
  isGuest: true,
  sessionType: 'guest_screening',
  module: 'live_gaze',
  assignedRole: 'therapist',
  source: 'live_gaze_analysis',
  status: 'pending_review',
  guestInfo: { childName, parentName, email },
  snapshots: [...]
}
```

---

### 2. Database Model Updates

#### GazeSession Schema Enhancements
**File**: `backend/models/GazeSession.js`

**New Fields Added**:
```javascript
// Session categorization
module: { 
  type: String, 
  enum: ['live_gaze', 'imitation_game', 'pattern_fixation'], 
  default: 'live_gaze' 
}

// Snapshot status tracking
gazeSnapshotSchema: {
  status: { type: String, default: 'captured' }
}
```

**Complete Session Structure**:
- `sessionType`: 'authenticated' | 'guest_screening'
- `module`: 'live_gaze' | 'imitation_game' | 'pattern_fixation'
- `assignedRole`: 'therapist' | 'parent' | 'teacher'
- `status`: 'active' | 'completed' | 'pending_review' | 'reviewed'
- `guestInfo`: { childName, parentName, email }
- `snapshots[]`: { imagePath, timestamp, attentionScore, gazeDirection, status }

---

### 3. Frontend Integration

#### GazeSnapshotCapture Component Updates
**File**: `frontend/src/components/GazeSnapshotCapture.jsx`

**Key Changes**:
1. **Separate Guest Flow**: Guest submissions use `/api/guest/live-gaze/submit`
2. **No Session Creation**: Direct submission without pre-created session
3. **No Redirect**: Shows success message and stays on page
4. **Success Notification**: Green banner with checkmark (auto-clears after 8 seconds)

**Guest Mode Logic**:
```javascript
// Validate guest form
if (!token && (!guestInfo.childName || !guestInfo.parentName || !guestInfo.email)) {
  setShowGuestForm(true);
  return;
}

// Submit to guest endpoint
const response = await fetch(`${apiBaseUrl}/api/guest/live-gaze/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guestInfo: { childName, parentName, email },
    snapshots: localSnapshots
  })
});

// Show success message, no redirect
setGuestSuccessMessage(result.message); // "Session sent to therapist for review."
setTimeout(() => setGuestSuccessMessage(''), 8000);
```

**Success UI**:
```jsx
{guestSuccessMessage && (
  <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl flex items-center gap-3 text-green-200 animate-pulse">
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <p className="text-sm font-medium">{guestSuccessMessage}</p>
  </div>
)}
```

---

### 4. Backend Route Registration

#### Main Server Configuration
**File**: `backend/index.js`

```javascript
// ✅ Guest Routes (Unauthenticated)
try {
  app.use('/api/guest', require('./routes/guest'));
} catch (e) {
  console.error('Guest Routes Error:', e.message);
}
```

**Available Endpoints**:
- `POST /api/guest/live-gaze/submit` - Submit guest gaze screening

---

### 5. Therapist Dashboard Integration

#### Query for Pending Reviews
**File**: `backend/routes/gaze.js` - Line 405

**Existing Query** (already compatible):
```javascript
router.get('/sessions/pending-review', verifyToken, therapistCheck, async (req, res) => {
  const sessions = await GazeSession.find({ 
    $or: [
      { therapistId: req.user.id },
      { isGuest: true, sessionType: 'guest_screening' } // ✅ Includes guest submissions
    ],
    status: { $in: ['pending_review', 'completed'] }
  }).populate('patientId', 'name age gender').sort({ createdAt: -1 });
  
  res.status(200).json(sessions);
});
```

**Guest Session Display**:
- Shows `guestInfo.childName` as patient name
- Shows `guestInfo.parentName` and `guestInfo.email`
- Displays all captured snapshots with metrics
- Allows therapist to add review notes
- Can mark as 'reviewed' when complete

---

## 🔄 Complete Workflow

### Guest User Journey
1. **Navigate** to Live Gaze Analysis (no login)
2. **Fill Guest Form**:
   - Child Name
   - Parent Name
   - Email
3. **Start Camera** and capture gaze snapshots
4. **Click "Send for Review"**
5. **See Success Message**: "Session sent to therapist for review." (green banner)
6. **Stay on Page** - No redirect, can start new session

### Backend Processing
1. **Receive** POST to `/api/guest/live-gaze/submit`
2. **Validate** guestInfo and snapshots
3. **Process Images**:
   - Extract base64 data
   - Save to `backend/uploads/gaze/guest-gaze-*.png`
   - Generate unique filenames
4. **Create Session**:
   - `sessionType: 'guest_screening'`
   - `module: 'live_gaze'`
   - `status: 'pending_review'`
   - `assignedRole: 'therapist'`
5. **Return Success** with message

### Therapist Review
1. **Login** as therapist
2. **Navigate** to Pending Reviews
3. **See Guest Sessions** with:
   - Guest icon/badge
   - Child name from guestInfo
   - Parent contact information
   - All captured snapshots
   - Gaze metrics (attention score, direction)
4. **Review Analysis** and add notes
5. **Mark as Reviewed** when complete

---

## 📁 Files Modified

### Backend
1. ✅ **NEW**: `backend/routes/guest.js` - Dedicated guest API routes
2. ✅ **UPDATED**: `backend/models/GazeSession.js` - Added `module` field, snapshot `status`
3. ✅ **UPDATED**: `backend/index.js` - Registered `/api/guest` routes

### Frontend
1. ✅ **UPDATED**: `frontend/src/components/GazeSnapshotCapture.jsx`
   - Added guest endpoint integration
   - Added success message state
   - Added green success banner UI
   - Removed redirect for guest mode

---

## ✅ Requirements Checklist

### ✓ Endpoint Requirements
- [x] Dedicated endpoint: `POST /api/guest/live-gaze/submit`
- [x] Unauthenticated (no login required)
- [x] Uploads captured images to disk
- [x] Uploads gaze metrics (attentionScore, direction, status)
- [x] Stores session with correct metadata

### ✓ Storage Requirements
- [x] `sessionType: "guest_screening"`
- [x] `status: "pending_review"`
- [x] `module: "live_gaze"`
- [x] `assignedRole: "therapist"`
- [x] Guest information preserved

### ✓ Behavior Requirements
- [x] NO login required
- [x] NO parent role assignment
- [x] NO redirect after submission
- [x] Stays on same page
- [x] Shows success message: "Session sent to therapist for review."

### ✓ Integration Requirements
- [x] Visible in Therapist Dashboard → Pending Reviews
- [x] Query filters by `sessionType: 'guest_screening'`
- [x] Displays guest info and snapshots
- [x] Allows therapist review workflow

---

## 🧪 Testing Instructions

### Test Guest Submission Flow
```bash
# 1. Start Backend
cd backend
npm start

# 2. Start Frontend
cd frontend
npm start

# 3. Test Steps:
# - Navigate to Live Gaze Analysis (logged out)
# - Fill guest form (child name, parent name, email)
# - Start camera and capture 3-5 snapshots
# - Click "Send for Review"
# - Verify: Green success banner appears
# - Verify: Message says "Session sent to therapist for review."
# - Verify: No redirect, stays on page
# - Verify: Can start new session
```

### Test Therapist Dashboard
```bash
# 1. Login as therapist
# 2. Navigate to Pending Reviews
# 3. Verify guest session appears with:
#    - guestInfo (child/parent name, email)
#    - sessionType: 'guest_screening'
#    - module: 'live_gaze'
#    - All captured snapshots with metrics
# 4. Add review notes
# 5. Mark as reviewed
```

### API Testing (Postman/curl)
```bash
curl -X POST http://localhost:5000/api/guest/live-gaze/submit \
  -H "Content-Type: application/json" \
  -d '{
    "guestInfo": {
      "childName": "Test Child",
      "parentName": "Test Parent",
      "email": "test@example.com"
    },
    "snapshots": [
      {
        "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
        "timestamp": "2026-01-19T10:30:00Z",
        "attentionScore": 0.85,
        "gazeDirection": "center",
        "status": "captured"
      }
    ]
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Session sent to therapist for review.",
  "sessionId": "...",
  "snapshotsProcessed": 1
}
```

---

## 🔍 Database Verification

### Check Guest Sessions in MongoDB
```javascript
// MongoDB Shell
db.gazesessions.find({
  isGuest: true,
  sessionType: 'guest_screening',
  module: 'live_gaze'
}).pretty()
```

**Expected Fields**:
```json
{
  "_id": "...",
  "isGuest": true,
  "sessionType": "guest_screening",
  "module": "live_gaze",
  "assignedRole": "therapist",
  "source": "live_gaze_analysis",
  "status": "pending_review",
  "guestInfo": {
    "childName": "...",
    "parentName": "...",
    "email": "..."
  },
  "snapshots": [
    {
      "imagePath": "/uploads/gaze/guest-gaze-*.png",
      "timestamp": "...",
      "attentionScore": 0.85,
      "gazeDirection": "center",
      "status": "captured"
    }
  ],
  "startTime": "...",
  "endTime": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 🎉 Benefits

1. **Better UX**: No login friction for initial screenings
2. **Clear Routing**: Dedicated endpoint makes intent explicit
3. **Proper Categorization**: `module: 'live_gaze'` enables future filtering
4. **No Role Confusion**: Never assigns parent role to guests
5. **Visual Feedback**: Success message with auto-clear
6. **Therapist Visibility**: All guest sessions appear in pending reviews
7. **Maintainable**: Separate guest routes for clarity

---

## 🔗 Related Systems

- **Live Gaze Analysis**: Guest screening entry point
- **Therapist Dashboard**: Review pending guest sessions
- **GazeSession Model**: MongoDB schema for session data
- **Image Storage**: `/backend/uploads/gaze/` directory
- **Guest Routes**: `/api/guest/live-gaze/submit` endpoint

---

## 📊 Metrics Tracked

Each snapshot includes:
- `attentionScore`: 0.0 - 1.0 (higher = better attention)
- `gazeDirection`: 'left' | 'right' | 'center' | 'up' | 'down' | 'unknown'
- `status`: 'captured' | 'analyzed' | 'reviewed'
- `timestamp`: ISO 8601 datetime
- `imagePath`: Relative path to saved image

---

*Implementation complete - Guest screening workflow fully functional!*
