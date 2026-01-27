# 🎯 Speech Therapy Module - System Architecture & Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SPEECH THERAPY MODULE                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│  CHILD/PARENT    │◄───────►│    FRONTEND      │◄───────►│   BACKEND API    │
│   INTERFACE      │         │   React App      │         │   Express.js     │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └────────┬─────────┘
                                                                    │
                             ┌──────────────────┐                  │
                             │                  │                  │
                             │  TEACHER/        │                  │
                             │  THERAPIST       │◄─────────────────┤
                             │  DASHBOARD       │                  │
                             │                  │                  │
                             └──────────────────┘                  │
                                                                    │
                                                          ┌─────────▼─────────┐
                                                          │                   │
                                                          │    MongoDB        │
                                                          │   SpeechTherapy   │
                                                          │   Collection      │
                                                          │                   │
                                                          └───────────────────┘
```

---

## 🔄 User Flow Diagrams

### 1️⃣ Child Recording Flow

```
START
  │
  ├─► Select Child
  │        │
  │        ├─► Choose Practice Prompt
  │        │        │
  │        │        ├─► Listen to Sample (Text-to-Speech)
  │        │        │        │
  │        │        │        ├─► Enable Microphone
  │        │        │        │        │
  │        │        │        │        ├─► Record Voice
  │        │        │        │        │        │
  │        │        │        │        │        ├─► Stop Recording
  │        │        │        │        │        │        │
  │        │        │        │        │        │        ├─► Play Back
  │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        ├─► Upload to Server
  │        │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        │        ├─► Success Message
  │        │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        │        └─► Wait for Teacher Review
  │
END
```

### 2️⃣ Teacher Evaluation Flow

```
START (Teacher Dashboard)
  │
  ├─► View Pending Sessions List
  │        │
  │        ├─► Select a Session
  │        │        │
  │        │        ├─► View Child Information
  │        │        │        │
  │        │        │        ├─► See Practice Prompt
  │        │        │        │        │
  │        │        │        │        ├─► Play Audio Recording
  │        │        │        │        │        │
  │        │        │        │        │        ├─► Select Rating (Poor/Average/Good)
  │        │        │        │        │        │        │
  │        │        │        │        │        │        ├─► Write Feedback Comments
  │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        ├─► Add Optional Notes
  │        │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        │        ├─► Submit Evaluation
  │        │        │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        │        │        └─► Session Marked "Evaluated"
  │
END
```

### 3️⃣ Progress Tracking Flow

```
START (Progress Reports Tab)
  │
  ├─► Select Child
  │        │
  │        ├─► Backend Queries All Sessions
  │        │        │
  │        │        ├─► Calculate Statistics:
  │        │        │    - Total Sessions
  │        │        │    - Evaluated vs Pending
  │        │        │    - Average Rating
  │        │        │    - Rating Distribution
  │        │        │    - Improvement Trend
  │        │        │        │
  │        │        │        ├─► Display Progress Cards
  │        │        │        │        │
  │        │        │        │        ├─► Show Rating Charts
  │        │        │        │        │        │
  │        │        │        │        │        └─► List Session History
  │
END
```

---

## 📊 Data Flow

### Recording Upload Process:

```
Child Browser                    Frontend                    Backend                    Database
     │                              │                           │                          │
     │  1. Record Audio             │                           │                          │
     ├─────────────────────────────►│                           │                          │
     │                              │                           │                          │
     │  2. Blob Created             │                           │                          │
     │◄─────────────────────────────┤                           │                          │
     │                              │                           │                          │
     │  3. Click Upload             │                           │                          │
     ├─────────────────────────────►│                           │                          │
     │                              │  4. POST /upload          │                          │
     │                              │  (FormData + Audio)       │                          │
     │                              ├──────────────────────────►│                          │
     │                              │                           │  5. Save File            │
     │                              │                           │  (uploads/speech-therapy)│
     │                              │                           │                          │
     │                              │                           │  6. Create DB Record     │
     │                              │                           ├─────────────────────────►│
     │                              │                           │                          │
     │                              │                           │  7. Record Saved         │
     │                              │                           │◄─────────────────────────┤
     │                              │  8. Success Response      │                          │
     │                              │◄──────────────────────────┤                          │
     │  9. Success Message          │                           │                          │
     │◄─────────────────────────────┤                           │                          │
```

### Evaluation Process:

```
Teacher Browser                  Frontend                    Backend                    Database
     │                              │                           │                          │
     │  1. Click Session            │                           │                          │
     ├─────────────────────────────►│                           │                          │
     │                              │  2. GET /audio/:id        │                          │
     │                              ├──────────────────────────►│                          │
     │                              │                           │  3. Query Session        │
     │                              │                           ├─────────────────────────►│
     │                              │                           │◄─────────────────────────┤
     │                              │  4. Stream Audio File     │                          │
     │                              │◄──────────────────────────┤                          │
     │  5. Play Audio               │                           │                          │
     │◄─────────────────────────────┤                           │                          │
     │                              │                           │                          │
     │  6. Submit Rating            │                           │                          │
     ├─────────────────────────────►│                           │                          │
     │                              │  7. PUT /evaluate/:id     │                          │
     │                              ├──────────────────────────►│                          │
     │                              │                           │  8. Update Record        │
     │                              │                           ├─────────────────────────►│
     │                              │                           │◄─────────────────────────┤
     │                              │  9. Success Response      │                          │
     │                              │◄──────────────────────────┤                          │
     │  10. Confirmation            │                           │                          │
     │◄─────────────────────────────┤                           │                          │
```

---

## 🗄️ Database Schema Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                      SpeechTherapy Collection                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  _id: ObjectId                              [Primary Key]        │
│  ├─ childId: ObjectId ──────────────────►  [Patient Reference]  │
│  ├─ sessionDate: Date                       [Indexed]            │
│  ├─ audioFilePath: String                   [Required]           │
│  ├─ originalFileName: String                                     │
│  ├─ practicePrompt: String                  ["Hello", "Thank...] │
│  ├─ sampleAudioPath: String                                      │
│  ├─ rating: String                          [Poor/Average/Good]  │
│  ├─ feedback: String                        [Teacher comments]   │
│  ├─ evaluatedBy: ObjectId ──────────────►   [User Reference]    │
│  ├─ evaluatedAt: Date                                            │
│  ├─ status: String                          [pending/evaluated]  │
│  ├─ sessionNumber: Number                   [Sequential]         │
│  ├─ duration: Number                        [Seconds]            │
│  ├─ notes: String                           [Additional notes]   │
│  ├─ createdAt: Date                         [Auto timestamp]     │
│  └─ updatedAt: Date                         [Auto timestamp]     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Indexes:
- { childId: 1, sessionDate: -1 }  → Fast child session queries
- { status: 1 }                    → Fast pending session lookups
- { evaluatedBy: 1 }               → Fast teacher workload queries
```

---

## 🔐 Authentication Flow

```
User Login
    │
    ├─► POST /api/login
    │        │
    │        ├─► Verify Credentials
    │        │        │
    │        │        ├─► Generate JWT Token
    │        │        │        │
    │        │        │        └─► Return { token, user }
    │        │
    │        └─► Store in localStorage
    │
    │
API Request
    │
    ├─► Include Authorization Header
    │        │
    │        ├─► Backend: authenticateToken middleware
    │        │        │
    │        │        ├─► Verify JWT
    │        │        │        │
    │        │        │        ├─► Valid? → req.user = decoded
    │        │        │        │        │
    │        │        │        │        └─► Continue to Route Handler
    │        │        │        │
    │        │        │        └─► Invalid? → 401 Unauthorized
    │
    └─► Process Request
```

---

## 🎨 Component Hierarchy

```
App.js
│
├─► SpeechTherapyChildPage
│   ├─► Child Selector Dropdown
│   ├─► Practice Prompt Grid
│   │   └─► Prompt Buttons (8)
│   ├─► Sample Audio Player
│   │   └─► Text-to-Speech
│   ├─► Recording Interface
│   │   ├─► Microphone Permission
│   │   ├─► Record Button
│   │   ├─► Stop Button
│   │   └─► Audio Playback
│   ├─► Upload Section
│   │   ├─► Upload Button
│   │   └─► Status Messages
│   └─► Instructions Panel
│
└─► SpeechTherapyDashboard
    ├─► Tab Navigation
    │   ├─► Pending Reviews Tab
    │   └─► Progress Reports Tab
    │
    ├─► Pending Reviews Section
    │   ├─► Session List (Left Column)
    │   │   └─► Session Cards
    │   └─► Evaluation Panel (Right Column)
    │       ├─► Session Details
    │       ├─► Audio Player
    │       ├─► Rating Buttons (3)
    │       ├─► Feedback Textarea
    │       ├─► Notes Textarea
    │       └─► Submit Button
    │
    └─► Progress Reports Section
        ├─► Child Selector (Left Column)
        │   └─► Child Cards
        └─► Progress Display (Right Column)
            ├─► Statistics Cards (4)
            ├─► Improvement Status
            ├─► Rating Distribution Charts
            └─► Session History List
```

---

## 🔄 State Management

### SpeechTherapyChildPage State:

```javascript
{
  selectedChild: String,           // Child ID
  children: Array,                 // List of children
  permission: Boolean,             // Microphone permission
  stream: MediaStream,             // Audio stream
  isRecording: Boolean,            // Recording state
  audioBlob: Blob,                 // Recorded audio
  isUploading: Boolean,            // Upload in progress
  uploadStatus: Object,            // Success/error message
  practicePrompt: String,          // Selected prompt
  isPlayingSample: Boolean         // Sample audio playing
}
```

### SpeechTherapyDashboard State:

```javascript
{
  pendingSessions: Array,          // Unevaluated sessions
  selectedSession: Object,         // Current session
  rating: String,                  // Poor/Average/Good
  feedback: String,                // Teacher comments
  notes: String,                   // Additional notes
  isSubmitting: Boolean,           // Evaluation in progress
  submitStatus: Object,            // Success/error message
  activeTab: String,               // pending/progress
  selectedChildForProgress: Object,// Child for progress view
  progressData: Object,            // Progress statistics
  children: Array                  // List of children
}
```

---

## 📡 API Request/Response Examples

### 1. Upload Recording

**Request:**
```http
POST /api/speech-therapy/upload
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

FormData:
  audio: [Binary Audio File]
  childId: "507f1f77bcf86cd799439011"
  practicePrompt: "Hello"
```

**Response:**
```json
{
  "message": "Speech recording uploaded successfully",
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "childId": "507f1f77bcf86cd799439011",
    "audioFilePath": "/uploads/speech-therapy/speech-1234567890.webm",
    "practicePrompt": "Hello",
    "status": "pending",
    "sessionNumber": 5,
    "sessionDate": "2026-01-27T10:30:00.000Z",
    "createdAt": "2026-01-27T10:30:00.000Z"
  }
}
```

### 2. Get Pending Sessions

**Request:**
```http
GET /api/speech-therapy/pending
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "childId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Emma Johnson",
      "age": 6,
      "gender": "Female",
      "grade": "1"
    },
    "practicePrompt": "Hello",
    "sessionNumber": 5,
    "sessionDate": "2026-01-27T10:30:00.000Z",
    "status": "pending"
  }
]
```

### 3. Submit Evaluation

**Request:**
```http
PUT /api/speech-therapy/evaluate/507f1f77bcf86cd799439012
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "rating": "Good",
  "feedback": "Excellent pronunciation! Keep practicing.",
  "notes": "Showed improvement in clarity"
}
```

**Response:**
```json
{
  "message": "Session evaluated successfully",
  "session": {
    "_id": "507f1f77bcf86cd799439012",
    "childId": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Emma Johnson",
      "age": 6,
      "gender": "Female"
    },
    "practicePrompt": "Hello",
    "rating": "Good",
    "feedback": "Excellent pronunciation! Keep practicing.",
    "notes": "Showed improvement in clarity",
    "evaluatedBy": {
      "_id": "507f1f77bcf86cd799439013",
      "username": "Ms. Smith",
      "email": "smith@school.edu"
    },
    "evaluatedAt": "2026-01-27T11:00:00.000Z",
    "status": "evaluated"
  }
}
```

### 4. Get Progress Report

**Request:**
```http
GET /api/speech-therapy/progress/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "totalSessions": 10,
  "evaluatedSessions": 8,
  "pendingSessions": 2,
  "averageRating": 2.38,
  "improvement": "Improving",
  "ratingDistribution": {
    "poor": 2,
    "average": 3,
    "good": 3
  },
  "sessions": [
    {
      "date": "2026-01-20T10:00:00.000Z",
      "sessionNumber": 1,
      "rating": "Average",
      "feedback": "Good start! Focus on enunciation.",
      "practicePrompt": "Hello"
    },
    {
      "date": "2026-01-27T10:30:00.000Z",
      "sessionNumber": 10,
      "rating": "Good",
      "feedback": "Excellent progress!",
      "practicePrompt": "Thank you"
    }
  ]
}
```

---

## 🎯 Critical Success Paths

### Path 1: First Recording ✅
```
New Child → Enable Mic → Select Prompt → Listen → Record → Upload → Success
```

### Path 2: Teacher Evaluation ✅
```
Login → Dashboard → Pending Tab → Select Session → Play → Rate → Feedback → Submit
```

### Path 3: View Progress ✅
```
Dashboard → Progress Tab → Select Child → View Stats → Review History
```

---

## 🔧 Technical Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND STACK                          │
├─────────────────────────────────────────────────────────────┤
│  - React 18+                    [UI Framework]               │
│  - React Router Dom             [Routing]                    │
│  - Axios                        [HTTP Client]                │
│  - Lucide React                 [Icons]                      │
│  - TailwindCSS (implied)        [Styling]                    │
│  - WebRTC MediaRecorder API     [Audio Recording]            │
│  - Web Speech API               [Text-to-Speech]             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND STACK                           │
├─────────────────────────────────────────────────────────────┤
│  - Node.js                      [Runtime]                    │
│  - Express.js                   [Web Framework]              │
│  - Mongoose                     [ODM]                        │
│  - Multer                       [File Upload]                │
│  - JWT                          [Authentication]             │
│  - MongoDB                      [Database]                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  - Local Filesystem             [Audio Files]                │
│  - MongoDB Atlas                [Metadata]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                    TARGET METRICS                            │
├─────────────────────────────────────────────────────────────┤
│  Upload Time (10MB):            < 5 seconds                  │
│  API Response Time:             < 500ms                      │
│  Audio Streaming Start:         < 2 seconds                  │
│  Dashboard Load:                < 1 second                   │
│  Progress Calculation:          < 500ms                      │
│  Concurrent Users:              100+                         │
│  Max File Size:                 50MB                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 Summary

This visual architecture document shows:
- ✅ Complete system flow
- ✅ Component relationships
- ✅ Data flow patterns
- ✅ API interactions
- ✅ State management
- ✅ Authentication flow
- ✅ Database structure
- ✅ Technical stack

**The Speech Therapy Module is a well-architected, full-stack application ready for deployment!** 🚀
