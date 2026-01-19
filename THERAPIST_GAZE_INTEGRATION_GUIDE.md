# 🚀 Quick Integration Guide - Therapist Live Gaze Screening

## Add to Therapist Dashboard (5-Minute Setup)

### Step 1: Import Component

In your therapist dashboard file (e.g., `TherapistDashboard.jsx`):

```jsx
import TherapistLiveGazeScreening from './components/TherapistLiveGazeScreening';
import { FaEye } from 'react-icons/fa';
```

### Step 2: Add State

```jsx
const [showGazeScreening, setShowGazeScreening] = useState(false);
const [selectedPatient, setSelectedPatient] = useState(null);
```

### Step 3: Add Button to Patient List

```jsx
{patients.map(patient => (
  <div key={patient._id} className="patient-card">
    <h3>{patient.name}</h3>
    <p>Age: {patient.age}</p>
    
    {/* Add this button */}
    <button
      onClick={() => {
        setSelectedPatient(patient);
        setShowGazeScreening(true);
      }}
      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
    >
      <FaEye /> Start Live Screening
    </button>
  </div>
))}
```

### Step 4: Add Screening Console

At the end of your component, before the closing tag:

```jsx
return (
  <div>
    {/* Your existing dashboard content */}
    
    {/* Add this modal */}
    {showGazeScreening && selectedPatient && (
      <TherapistLiveGazeScreening
        patient={selectedPatient}
        onClose={() => {
          setShowGazeScreening(false);
          setSelectedPatient(null);
        }}
        onSaved={(result) => {
          console.log('Session saved:', result);
          // Optional: Refresh patient list or show notification
          fetchPatients(); // Your function to reload data
        }}
      />
    )}
  </div>
);
```

---

## Complete Example

```jsx
import React, { useState, useEffect } from 'react';
import TherapistLiveGazeScreening from './components/TherapistLiveGazeScreening';
import { FaEye, FaUser } from 'react-icons/fa';

function TherapistDashboard() {
  const [patients, setPatients] = useState([]);
  const [showGazeScreening, setShowGazeScreening] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    // Your existing fetch logic
    const response = await fetch('/api/patients');
    const data = await response.json();
    setPatients(data);
  };

  const handleStartScreening = (patient) => {
    setSelectedPatient(patient);
    setShowGazeScreening(true);
  };

  const handleSessionSaved = (result) => {
    console.log('Screening session saved:', result);
    // Optional: Show success notification
    alert(`Session saved for ${result.patientName}!`);
    // Refresh patient data
    fetchPatients();
  };

  return (
    <div className="therapist-dashboard">
      <h1>My Patients</h1>
      
      <div className="patients-grid">
        {patients.map(patient => (
          <div key={patient._id} className="patient-card bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3 mb-4">
              <FaUser className="text-blue-500 text-2xl" />
              <div>
                <h3 className="font-semibold">{patient.name}</h3>
                <p className="text-sm text-gray-600">Age: {patient.age}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => handleStartScreening(patient)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FaEye /> Start Live Screening
              </button>
              
              {/* Your other buttons */}
              <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg">
                View History
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Gaze Screening Console Modal */}
      {showGazeScreening && selectedPatient && (
        <TherapistLiveGazeScreening
          patient={selectedPatient}
          onClose={() => {
            setShowGazeScreening(false);
            setSelectedPatient(null);
          }}
          onSaved={handleSessionSaved}
        />
      )}
    </div>
  );
}

export default TherapistDashboard;
```

---

## What You Get

### 1. Real-time Clinical Console
- **Live camera feed** with HD capture
- **Real-time metrics** displayed as therapist works
- **Instant analysis** of each snapshot
- **Professional UI** with color-coded feedback

### 2. Dual Mode Support
- **Guest Mode**: Public submissions → Review queue (`/api/guest/live-gaze/submit`)
- **Therapist Mode**: Direct patient saves → Immediate record (`/api/gaze/therapist/save-to-patient`)

### 3. Atomic Operations
- **All images saved** before database commit
- **Rollback on failure** - no partial saves
- **Guaranteed reliability** - data integrity maintained

### 4. Enhanced Review System
- **Filter by module** (`live_gaze` only)
- **Filter by type** (`guest_screening` vs `authenticated`)
- **All images present** - no missing data
- **Patient/therapist info** populated automatically

---

## API Endpoints Reference

### Guest Submission
```bash
POST /api/guest/live-gaze/submit
Content-Type: application/json

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

### Therapist Direct Save
```bash
POST /api/gaze/therapist/save-to-patient
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "patient_id_here",
  "snapshots": [
    {
      "image": "data:image/png;base64,...",
      "timestamp": "2026-01-19T14:15:00Z",
      "attentionScore": 0.72,
      "gazeDirection": "left",
      "status": "analyzed"
    }
  ]
}
```

### Get Pending Reviews
```bash
GET /api/gaze/sessions/pending-review
Authorization: Bearer <token>

# Returns:
# - Guest sessions: sessionType='guest_screening', module='live_gaze'
# - Therapist sessions: sessionType='authenticated', module='live_gaze'
# - Both with status in ['pending_review', 'completed']
```

---

## Testing Checklist

- [ ] Import component into therapist dashboard
- [ ] Add state for modal and patient selection
- [ ] Add "Start Live Screening" button to patient cards
- [ ] Test camera activation
- [ ] Test snapshot capture
- [ ] Test real-time metrics display
- [ ] Test save to patient record
- [ ] Verify images saved to `/backend/uploads/gaze/therapist-gaze-*`
- [ ] Verify database entry with `sessionSource: 'therapist'`
- [ ] Test guest mode still works
- [ ] Verify therapist query returns both guest and therapist sessions

---

## Troubleshooting

### Console doesn't open
- Check `showGazeScreening` state is true
- Check `selectedPatient` is not null
- Check component import path

### Camera won't start
- Check browser permissions for webcam
- Check HTTPS (required for webcam access)
- Check webcam is not in use by another app

### Save fails
- Check patient._id exists
- Check therapist token is valid
- Check `/backend/uploads/gaze/` directory exists and is writable
- Check backend logs for error details

### Images missing in review
- Check atomic save completed (no rollback)
- Check database entry has snapshots array
- Check image files exist in uploads directory
- Check therapist query includes `module: 'live_gaze'`

---

*Quick integration complete - Add 3 lines of code and you're ready to screen!*
