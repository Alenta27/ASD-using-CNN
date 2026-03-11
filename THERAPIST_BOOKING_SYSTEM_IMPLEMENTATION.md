# Therapist Slot Booking System - Complete Implementation

## ✅ Implementation Summary

The therapist schedule page now includes **full booking functionality** to book available slots directly from the calendar. When a therapist clicks an "Available" slot, a modal appears to select a patient and create an appointment.

---

## 🎯 What Was Implemented

### 1. **Backend API Endpoint** (`POST /api/therapist/book-slot`)

**Location:** `backend/routes/therapist.js` (Added after the schedule endpoint)

**Features:**
- Creates appointments for available slots
- Validates patient ownership (patient must belong to therapist)
- **Prevents double booking** - Checks if slot is already taken
- Creates appointment with status **pending**
- Returns formatted appointment data
- Handles all error cases

**API Details:**
```javascript
POST /api/therapist/book-slot
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "patientId": "65abc123...",
  "day": "Monday",
  "time": "10:00 AM",
  "date": "2026-03-10T00:00:00.000Z",
  "reason": "Initial assessment" // Optional
}

Success Response (201):
{
  "message": "Appointment booked successfully",
  "appointment": {
    "id": "65def456...",
    "day": "Monday",
    "date": "2026-03-10T00:00:00.000Z",
    "time": "10:00 AM",
    "patient": "Emma Wilson",
    "patientId": "65abc123...",
    "parentName": "Sarah Wilson",
    "status": "pending",
    "reason": "Initial assessment",
    "paymentStatus": "pending"
  }
}

Error Responses:
- 400: Missing required fields or patient has no parent
- 404: Patient not found or not assigned to therapist
- 409: Slot already booked
- 500: Server error
```

**Validation Logic:**
1. ✅ Checks required fields (patientId, day, time, date)
2. ✅ Verifies patient exists and belongs to therapist
3. ✅ Checks for double booking (ignores cancelled appointments)
4. ✅ Ensures patient has an associated parent (required field)
5. ✅ Creates appointment with status "pending"

### 2. **Frontend Booking Modal**

**Location:** `frontend/src/pages/TherapistSchedulePage.jsx`

**New State Variables:**
```javascript
const [patients, setPatients] = useState([]);
const [bookingModal, setBookingModal] = useState({
  show: false,
  day: '',
  time: '',
  date: null
});
const [selectedPatient, setSelectedPatient] = useState('');
const [bookingReason, setBookingReason] = useState('');
const [bookingLoading, setBookingLoading] = useState(false);
```

**New Functions:**
- `fetchPatients()` - Fetches therapist's patient list
- `handleBookSlot()` - Submits booking request to API
- `closeBookingModal()` - Closes modal and resets state
- Updated `handleSlotClick()` - Shows modal for available slots

**UI Features:**
- ✅ Modal overlay with centered dialog
- ✅ Shows selected day, time, and date
- ✅ Dropdown to select patient (shows name and age)
- ✅ Optional reason/notes textarea
- ✅ Cancel and Book buttons
- ✅ Loading state while booking
- ✅ Disabled state if no patient selected
- ✅ Auto-refresh calendar after successful booking

---

## 📊 Database Schema (MongoDB)

### Appointments Collection
```javascript
{
  _id: ObjectId,
  parentId: ObjectId (ref: User) - Required,
  childId: ObjectId (ref: Patient) - Required,
  therapistId: ObjectId (ref: User) - Required,
  appointmentDate: Date - Required,
  appointmentTime: String - Required,
  reason: String - Optional,
  status: Enum ['pending', 'confirmed', 'cancelled', 'completed'] - Default: 'pending',
  notes: String - Optional,
  paymentStatus: Enum ['pending', 'initiated', 'completed', 'failed'] - Default: 'pending',
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  appointmentFee: Number - Default: 0,
  paymentDate: Date,
  createdAt: Date - Auto-generated,
  updatedAt: Date - Auto-generated
}
```

---

## 🚀 How to Test

### Prerequisites
1. MongoDB running
2. Backend server running (port 5000)
3. Frontend server running (port 5173)
4. Therapist account logged in
5. At least one patient assigned to the therapist

### Testing Steps

#### 1. **Start Both Servers**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### 2. **Login and Navigate**
- Login as a therapist
- Go to "Schedule" page
- Calendar should display current week

#### 3. **Test Booking an Available Slot**

**Step-by-step:**
1. Click on any **"Available"** slot in the calendar
2. Booking modal should appear
3. Modal should show:
   - Day (e.g., "Monday")
   - Time (e.g., "10:00 AM")
   - Date (formatted nicely)
4. Select a patient from dropdown
5. Optionally enter a reason
6. Click **"Book Appointment"**
7. Success alert: "✅ Appointment booked successfully!"
8. Modal closes
9. Calendar refreshes automatically
10. Previously available slot now shows patient name with **yellow background** (Pending status)

#### 4. **Test Double Booking Prevention**
1. Try to book the same slot again
2. Click the slot (now shows patient name)
3. Alert shows appointment details (not booking modal)
4. Try booking through another method if available
5. Should get error: "This slot is already booked"

#### 5. **Test Validation**
- Try booking without selecting a patient → Alert: "Please select a patient"
- Book button should be disabled when no patient selected
- Backend validates all required fields

---

## 🎨 UI Behavior

### Available Slot (Before Booking)
```
┌─────────────────┐
│   Available     │  ← Grey text
└─────────────────┘
Click → Opens booking modal
```

### Pending Appointment (After Booking)
```
┌─────────────────┐
│  Emma Wilson    │  ← Bold text
│    Pending      │  ← Yellow background, capitalize
└─────────────────┘
Click → Shows appointment details alert
```

### Booking Modal
```
┌─────────────────────────────────┐
│  Book Appointment               │
├─────────────────────────────────┤
│  Day: Monday                    │
│  Time: 10:00 AM                 │
│  Date: March 10, 2026           │
├─────────────────────────────────┤
│  Select Patient *               │
│  [Dropdown: Emma Wilson (6)]    │
│                                 │
│  Reason (Optional)              │
│  [Textarea]                     │
├─────────────────────────────────┤
│           [Cancel] [Book]       │
└─────────────────────────────────┘
```

---

## 🔧 Backend Implementation Details

### Double Booking Prevention
```javascript
// Check if slot is already booked
const existingAppointment = await Appointment.findOne({
  therapistId: therapistId,
  appointmentDate: appointmentDate,
  appointmentTime: time,
  status: { $nin: ['cancelled'] } // Ignore cancelled appointments
});

if (existingAppointment) {
  return res.status(409).json({ 
    message: 'This slot is already booked. Please choose another time.' 
  });
}
```

### Patient Validation
```javascript
// Verify patient belongs to therapist
const patient = await Patient.findOne({
  _id: patientId,
  therapist_user_id: therapistId
});

if (!patient) {
  return res.status(404).json({ 
    message: 'Patient not found or not assigned to you' 
  });
}
```

### Appointment Creation
```javascript
const newAppointment = new Appointment({
  parentId: patient.parent_user_id,
  childId: patientId,
  therapistId: therapistId,
  appointmentDate: appointmentDate,
  appointmentTime: time,
  reason: reason || 'Scheduled appointment',
  status: 'pending', // Always starts as pending
  paymentStatus: 'pending',
  appointmentFee: 0
});

await newAppointment.save();
```

---

## 🧪 Testing with API (Postman/cURL)

### Book a Slot
```bash
curl -X POST http://localhost:5000/api/therapist/book-slot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "patientId": "65abc123def456789",
    "day": "Monday",
    "time": "10:00 AM",
    "date": "2026-03-10T00:00:00.000Z",
    "reason": "Initial assessment"
  }'
```

### Expected Success Response
```json
{
  "message": "Appointment booked successfully",
  "appointment": {
    "id": "65def789abc123456",
    "day": "Monday",
    "date": "2026-03-10T00:00:00.000Z",
    "time": "10:00 AM",
    "patient": "Emma Wilson",
    "patientId": "65abc123def456789",
    "parentName": "Sarah Wilson",
    "status": "pending",
    "reason": "Initial assessment",
    "paymentStatus": "pending"
  }
}
```

### Expected Error Responses

**Missing Patient Selection:**
```json
{
  "message": "Missing required fields: patientId, day, time, and date are required"
}
```

**Patient Not Found:**
```json
{
  "message": "Patient not found or not assigned to you"
}
```

**Double Booking:**
```json
{
  "message": "This slot is already booked. Please choose another time."
}
```

---

## 🔍 Troubleshooting

### Issue: Modal doesn't open when clicking Available slot
**Solution:**
- Check browser console for errors
- Verify `fetchPatients()` is being called
- Check patients array is populated
- Verify `bookingModal.show` state is updating

### Issue: "Patient not found" error
**Solution:**
- Verify patient exists in database
- Check patient's `therapist_user_id` matches logged-in therapist
- Ensure patient has `parent_user_id` field set

### Issue: Double booking still happening
**Solution:**
- Check appointment `status` field is not 'cancelled'
- Verify `appointmentDate` and `appointmentTime` match exactly
- Check MongoDB queries are comparing dates correctly

### Issue: Calendar not refreshing after booking
**Solution:**
- Verify `fetchSchedule(currentWeekOffset)` is called after booking
- Check API is returning updated data
- Clear browser cache if needed

### Issue: Booking button disabled even with patient selected
**Solution:**
- Check `selectedPatient` state is updating
- Verify patient dropdown has valid values
- Check `bookingLoading` state is not stuck on `true`

---

## 📝 API Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 201 | Created | Appointment booked successfully |
| 400 | Bad Request | Missing required fields or invalid data |
| 404 | Not Found | Patient not found or not assigned to therapist |
| 409 | Conflict | Slot already booked (double booking prevented) |
| 500 | Server Error | Database or server error |

---

## 🎯 Status Color Mapping

The calendar displays appointments with color-coded statuses:

| Status | Background | Border | Text | When |
|--------|-----------|--------|------|------|
| **Pending** | #fff3cd (Light Yellow) | #ffeaa7 (Yellow) | #856404 (Dark Yellow) | After booking |
| **Confirmed** | #d4edda (Light Green) | #c3e6cb (Green) | #155724 (Dark Green) | Manual confirmation |
| **Cancelled** | #f8d7da (Light Red) | #f5c6cb (Red) | #721c24 (Dark Red) | Cancelled |
| **Completed** | #d1ecf1 (Light Blue) | #bee5eb (Blue) | #0c5460 (Dark Blue) | After session |
| **Available** | Transparent | None | #adb5bd (Grey) | No appointment |

---

## ✅ Features Checklist

- [x] Create `POST /api/therapist/book-slot` endpoint
- [x] Validate required fields (patientId, day, time, date)
- [x] Check patient ownership
- [x] Prevent double booking
- [x] Create appointment with status "pending"
- [x] Fetch patient list in frontend
- [x] Show booking modal on available slot click
- [x] Patient selection dropdown
- [x] Optional reason/notes field
- [x] Submit booking to API
- [x] Show loading state during booking
- [x] Display success/error messages
- [x] Auto-refresh calendar after booking
- [x] Update slot appearance (Available → Pending)
- [x] Color-coded status display

---

## 🚀 Next Steps (Optional Enhancements)

### Recommended Features:
1. **Enhanced Modal** - Better UI/UX with animations
2. **Time Slot Suggestions** - Show available times for selected day
3. **Multi-day Booking** - Book recurring appointments
4. **Email Notifications** - Notify parent when appointment is booked
5. **SMS Confirmation** - Send SMS to parent with appointment details
6. **Calendar Export** - Export to Google Calendar or iCal
7. **Appointment Reminders** - Automated reminders 24h before
8. **Quick Reschedule** - Drag-and-drop to reschedule appointments
9. **Bulk Booking** - Book multiple slots at once
10. **Waiting List** - Put patients on waiting list for full slots

---

## 📦 Files Modified

### Backend
- ✅ `backend/routes/therapist.js` - Added `POST /api/therapist/book-slot` endpoint

### Frontend
- ✅ `frontend/src/pages/TherapistSchedulePage.jsx` - Added booking modal and logic

### Database Models (Used, Not Modified)
- ✅ `backend/models/appointment.js`
- ✅ `backend/models/patient.js`
- ✅ `backend/models/user.js`

---

## 🎉 Success Criteria

Your booking system is working correctly if:

1. ✅ Clicking "Available" slot opens booking modal
2. ✅ Modal shows correct day, time, and date
3. ✅ Patient dropdown lists therapist's patients
4. ✅ Booking creates appointment in database
5. ✅ Appointment has status "pending"
6. ✅ Calendar refreshes and shows patient name
7. ✅ Slot background changes to yellow (pending)
8. ✅ Double booking is prevented
9. ✅ Success message displays after booking
10. ✅ No console errors in browser or backend

---

## 🏆 Implementation Complete!

The therapist schedule page now has **full booking functionality**:

- ✅ Click available slots to book appointments
- ✅ Select patient from dropdown
- ✅ Add optional reason/notes
- ✅ Prevent double booking
- ✅ Auto-refresh calendar
- ✅ Color-coded status display
- ✅ Proper error handling
- ✅ Loading states

**The booking system is ready for production use!** 🚀
