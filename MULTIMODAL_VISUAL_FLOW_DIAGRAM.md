# MULTIMODAL ASD ASSESSMENT - VISUAL FLOW DIAGRAM

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORTEXA MULTIMODAL SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   SCREENING MODULES │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐  ┌─▼───────┐  ┌────▼─────────┐
    │  Facial (CNN)     │  │ MRI     │  │ Gaze         │
    │  Weight: 25%      │  │ (SVM)   │  │ Analysis     │
    └─────────┬─────────┘  │ 25%     │  │ 20%          │
              │            └─┬───────┘  └────┬─────────┘
              │              │               │
              └──────────────┼───────────────┘
                             │
                    ┌────────▼────────┐
                    │  Behavioral     │
                    │  Assessment 15% │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Questionnaire  │
                    │  Screening 15%  │
                    └────────┬────────┘
                             │
            ┌────────────────▼───────────────┐
            │  WEIGHTED DECISION FUSION      │
            │  Final Score = Σ(score × wt)  │
            └────────────────┬───────────────┘
                             │
            ┌────────────────▼───────────────┐
            │   RISK CLASSIFICATION          │
            │   < 40%  → Low Risk            │
            │   40-70% → Moderate Risk       │
            │   > 70%  → High Risk           │
            └────────────────┬───────────────┘
                             │
            ┌────────────────▼───────────────┐
            │   COMBINED ASD REPORT          │
            │   (Saved to Database)          │
            └────────────────┬───────────────┘
                             │
            ┌────────────────▼───────────────┐
            │  THERAPIST DASHBOARD           │
            │  (Review & Take Action)        │
            └────────────────────────────────┘
```

---

## 🔄 Data Flow: Report Generation

```
STEP 1: USER INTERACTION
┌─────────────────────────────────────┐
│ Therapist Opens Patient Profile     │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ MultimodalASDReport Component Mounts │
└──────────────┬───────────────────────┘
               │
               ▼
STEP 2: API REQUEST
┌──────────────────────────────────────────────────┐
│ GET /api/therapist/combined-asd-report           │
│ Query: patient_id=XXX                           │
│ Auth: Bearer Token                              │
└──────────────┬───────────────────────────────────┘
               │
               ▼
STEP 3: DATA COLLECTION (Backend)
┌──────────────────────────────────────────┐
│ Verify Patient-Therapist Relationship    │
└──────────────┬───────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Fetch Screening    │ ──→ Screening.find({type: 'facial'})
    │  Records from DB    │ ──→ Screening.find({type: 'mri'})
    │                     │ ──→ Screening.find({type: 'questionnaire'})
    │                     │ ──→ GazeSession.find({patientId})
    │                     │ ──→ BehavioralAssessment.find({studentId})
    └──────────┬──────────┘
               │
               ▼
STEP 4: SCORE CALCULATION
┌─────────────────────────────────────────────────┐
│ Extract Individual Scores:                      │
│   facial_score = 0.72                          │
│   mri_score = 0.64                             │
│   gaze_score = 0.48                            │
│   behavior_score = 0.61                        │
│   questionnaire_score = 0.70                   │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Apply Weighted Fusion:                          │
│                                                 │
│ final_score = (0.72 × 0.25) +                  │
│               (0.64 × 0.25) +                  │
│               (0.48 × 0.20) +                  │
│               (0.61 × 0.15) +                  │
│               (0.70 × 0.15)                    │
│             = 0.6325                           │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Classify Risk Level:                            │
│   0.6325 → MODERATE RISK                        │
│   (0.40 ≤ score ≤ 0.70)                        │
└──────────────┬──────────────────────────────────┘
               │
               ▼
STEP 5: SAVE TO DATABASE
┌─────────────────────────────────────────────────┐
│ Create/Update CombinedASDReport:                │
│   - patientId                                   │
│   - Individual scores                           │
│   - final_score: 0.6325                        │
│   - risk_level: "Moderate"                     │
│   - completed_modules: [...]                   │
│   - screeningReferences: {...}                 │
│   - status: "completed"                        │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Update Patient Record:                          │
│   - multimodalScore: 0.6325                    │
│   - multimodalRiskLevel: "Moderate"            │
│   - lastScreeningDate: NOW()                   │
│   - completedScreenings: [...]                 │
└──────────────┬──────────────────────────────────┘
               │
               ▼
STEP 6: RETURN RESPONSE
┌─────────────────────────────────────────────────┐
│ JSON Response:                                  │
│ {                                               │
│   "success": true,                              │
│   "facial_score": 0.72,                         │
│   "mri_score": 0.64,                            │
│   "gaze_score": 0.48,                           │
│   "behavior_score": 0.61,                       │
│   "questionnaire_score": 0.70,                  │
│   "final_score": 0.6325,                        │
│   "risk_level": "Moderate",                     │
│   "completed_modules": [5 items],               │
│   "screening_details": {...}                    │
│ }                                               │
└──────────────┬──────────────────────────────────┘
               │
               ▼
STEP 7: FRONTEND RENDERING
┌─────────────────────────────────────────────────┐
│ MultimodalASDReport Component Updates:          │
│                                                 │
│ ┌───────────────────────────────┐               │
│ │  MODULE SCORES DISPLAYED      │               │
│ │  [Facial]  [MRI]  [Gaze]     │               │
│ │  [Behavior] [Questionnaire]  │               │
│ └───────────────────────────────┘               │
│                                                 │
│ ┌───────────────────────────────┐               │
│ │   FINAL SCORE: 63%            │               │
│ │   RISK: MODERATE              │               │
│ └───────────────────────────────┘               │
│                                                 │
│ ┌───────────────────────────────┐               │
│ │  [Schedule Consultation]      │               │
│ │  [Send Report to Parent]     │               │
│ │  [Mark as Low Risk]          │               │
│ └───────────────────────────────┘               │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Decision Flow: Therapist Action

```
USER ACTION
┌─────────────────────────────────────┐
│ Therapist Clicks Action Button      │
│ "Schedule Consultation Meeting"     │
└──────────────┬──────────────────────┘
               │
               ▼
API REQUEST
┌──────────────────────────────────────────────────┐
│ POST /api/therapist/combined-report/decision     │
│ Body: {                                          │
│   patient_id: "...",                             │
│   decision: "consultation_scheduled",            │
│   notes: "Requires follow-up"                   │
│ }                                                │
└──────────────┬───────────────────────────────────┘
               │
               ▼
BACKEND PROCESSING
┌─────────────────────────────────────┐
│ Verify Authentication & Patient     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Find Latest CombinedASDReport                   │
│ for patient_id                                  │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Update Report:                                  │
│   - therapistDecision: "consultation_scheduled" │
│   - therapistNotes: "Requires follow-up"       │
│   - consultationScheduledAt: NOW()             │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Save to Database                    │
└──────────────┬──────────────────────┘
               │
               ▼
RESPONSE
┌─────────────────────────────────────────────────┐
│ {                                               │
│   "success": true,                              │
│   "message": "Decision recorded",               │
│   "decision": "consultation_scheduled",         │
│   "reportId": "..."                             │
│ }                                               │
└──────────────┬──────────────────────────────────┘
               │
               ▼
FRONTEND UPDATE
┌─────────────────────────────────────┐
│ Show Success Alert                  │
│ "Decision recorded: CONSULTATION    │
│  SCHEDULED"                         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Refresh Report Display              │
│ Show Updated Decision Status        │
└─────────────────────────────────────┘
```

---

## 🗂️ Database Schema Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    Patient (Main Entity)                 │
├─────────────────────────────────────────────────────────┤
│ _id: ObjectId                                           │
│ cortexaId: "CORTEXA_001"                               │
│ name: "John Doe"                                        │
│ age: 8                                                  │
│ multimodalScore: 0.6325                                │
│ multimodalRiskLevel: "Moderate"                        │
│ therapist_user_id: ObjectId → [User]                   │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Referenced by
               ├─────────────────────┐
               │                     │
      ┌────────▼──────────┐  ┌──────▼─────────────────┐
      │   Screening       │  │  CombinedASDReport     │
      ├───────────────────┤  ├────────────────────────┤
      │ patientId: Ref    │  │ patientId: Ref         │
      │ screeningType     │  │ facialScore: 0.72      │
      │ resultScore       │  │ mriScore: 0.64         │
      │ resultLabel       │  │ gazeScore: 0.48        │
      │ status            │  │ behaviorScore: 0.61    │
      └───────────────────┘  │ questionnaireScore     │
                             │ finalScore: 0.6325     │
      ┌────────────────────┐ │ riskLevel: "Moderate"  │
      │  GazeSession       │ │ therapistDecision      │
      ├────────────────────┤ │ therapistNotes         │
      │ patientId: Ref     │ │ status                 │
      │ sessionType        │ │ screeningReferences:   │
      │ result.asdScore    │ │   facialScreeningId    │
      │ result.riskLevel   │ │   mriScreeningId       │
      │ status             │ │   gazeSessionId        │
      └────────────────────┘ │   behavioralId         │
                             │   questionnaireId      │
      ┌─────────────────────┤ │ reviewedBy: Ref        │
      │ BehavioralAssess.   │ └────────────────────────┘
      ├─────────────────────┤
      │ studentId: Ref      │
      │ teacherId: Ref      │
      │ score               │
      │ assessmentType      │
      └─────────────────────┘
```

---

## 🎨 Component Hierarchy (Frontend)

```
TherapistPatientProfilePage
│
├── Sidebar (Navigation)
│
├── Main Content
│   │
│   ├── Patient Header
│   │   ├── Name & Status
│   │   └── Action Buttons
│   │
│   ├── Patient Summary Cards
│   │   ├── Age Card
│   │   ├── Gender Card
│   │   └── Patient ID Card
│   │
│   ├── Medical History Card
│   │
│   ├── Screening History Section
│   │   └── List of Past Screenings
│   │
│   ├── ✨ MultimodalASDReport ✨
│   │   │
│   │   ├── Report Header
│   │   │   ├── Title & Module Count
│   │   │   └── Timestamp
│   │   │
│   │   ├── Screening Results Summary
│   │   │   ├── Facial Score Card
│   │   │   ├── MRI Score Card
│   │   │   ├── Gaze Score Card
│   │   │   ├── Behavioral Score Card
│   │   │   └── Questionnaire Score Card
│   │   │
│   │   ├── Final Assessment Display
│   │   │   ├── Score Circle (SVG/CSS)
│   │   │   ├── Risk Level Badge
│   │   │   └── Clinical Interpretation
│   │   │
│   │   └── Therapist Actions
│   │       ├── Consultation Button
│   │       ├── Send Report Button
│   │       ├── Mark Low Risk Button
│   │       └── Decision Status Display
│   │
│   └── Parent/Guardian Information
│
└── SocialAttentionTracker (Modal)
```

---

## 🔐 Security Flow

```
                   ┌──────────────────┐
                   │  User Login      │
                   └────────┬─────────┘
                            │
                   ┌────────▼─────────┐
                   │  JWT Token       │
                   │  Generated       │
                   └────────┬─────────┘
                            │
                   Stored in localStorage
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
    API Request      API Request        API Request
    Combined Report  Decision Record    Get Report
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────┐
    │   Auth Middleware: verifyToken()            │
    │   - Validates JWT                           │
    │   - Extracts user info                      │
    └────────────────┬────────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────────┐
    │   Auth Middleware: therapistCheck()         │
    │   - Verifies role === 'therapist'           │
    └────────────────┬────────────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────────┐
    │   Route Handler                             │
    │   - Verify patient belongs to therapist     │
    │   - Patient.therapist_user_id === user.id  │
    └────────────────┬────────────────────────────┘
                     │
           ┌─────────┴─────────┐
           │                   │
           ▼                   ▼
      ✅ Authorized      ❌ Unauthorized
      Process Request    Return 403/404
```

---

## 📈 Weighted Calculation Visual

```
INPUT SCORES (0-1 range)
═══════════════════════════════════════════

Facial Screening    ████████████████████████████████████ 72%
Weight: 25%         ═════════ × 0.25 = 0.18

MRI Screening       ██████████████████████████████ 64%
Weight: 25%         ═════════ × 0.25 = 0.16

Gaze Analysis       ███████████████████ 48%
Weight: 20%         ════════ × 0.20 = 0.096

Behavioral          ████████████████████████ 61%
Weight: 15%         ══════ × 0.15 = 0.0915

Questionnaire       ███████████████████████████████ 70%
Weight: 15%         ══════ × 0.15 = 0.105

═══════════════════════════════════════════
FINAL SCORE = SUM OF WEIGHTED SCORES
═══════════════════════════════════════════

0.18 + 0.16 + 0.096 + 0.0915 + 0.105 = 0.6325

═══════════════════════════════════════════
RISK CLASSIFICATION
═══════════════════════════════════════════

  0%           40%          70%         100%
  │─────────────│────────────│───────────│
  └─ Low Risk ─┘─ Moderate ─┴─ High ────┘
                      ▲
                   63.25%
                 MODERATE RISK
```

---

## 🎯 Complete Integration Map

```
┌─────────────────────────────────────────────────────┐
│               CORTEXA PLATFORM                       │
└─────────────────────────────────────────────────────┘

Frontend (React)              Backend (Node/Express)
─────────────────            ──────────────────────────

TherapistDashboard  ─────┐         ┌──── MongoDB
     │                    │         │
PatientProfile      ─────┼────────►│  Users
     │                    │         │  Patients
MultimodalReport    ◄────┼─────────│  Screenings
     │                    │         │  GazeSessions
     │                    │         │  BehavioralAssessments
     │                    │         │  CombinedASDReports ✨
     │                    │         │
     │                    │         │
[API Calls]               │         │
     │                    │         │
     │                    ▼         │
     └──────►  /api/therapist/     │
                combined-asd-report │
                      │             │
                      ├── GET       │
                      ├── POST      │
                      └── GET/:id   │
                            │       │
                            └───────┘

Authentication Flow
───────────────────

User → JWT Token → LocalStorage → API Headers → Middleware → Routes

Data Persistence
────────────────

Form → API → Validation → Database → Response → UI Update
```

---

**This visual guide provides a complete overview of the Multimodal ASD Assessment System architecture, data flow, and integration points.**
