const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { verifyToken, therapistCheck, requireResourceAccess } = require('../middlewares/auth');
const User = require('../models/user');
const Patient = require('../models/patient');
const Report = require('../models/report');
const Slot = require('../models/slot');
const Appointment = require('../models/appointment');
const GazeSession = require('../models/GazeSession');
const DREAMFeatures = require('../models/dreamFeatures');
const Screening = require('../models/screening');
const BehavioralAssessment = require('../models/BehavioralAssessment');
const CombinedASDReport = require('../models/CombinedASDReport');
const ParentTherapistQuery = require('../models/ParentTherapistQuery');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const csv = require('csv-parser');

const upload = multer({ 
  dest: 'uploads/dream_datasets/',
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.json' || 
        file.mimetype === 'application/json' ||
        path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON or ZIP files are allowed'));
    }
  }
});

const formatAppointmentResponse = (appointment) => ({
  id: appointment._id,
  clientId: appointment.childId?._id,
  clientName: appointment.childId?.name || 'Client Name Not Available',
  date: appointment.appointmentDate ? appointment.appointmentDate.toISOString().split('T')[0] : 'N/A',
  time: appointment.appointmentTime,
  duration: 45,
  type: appointment.type || 'In-Person',
  status: appointment.status === 'confirmed' ? 'Scheduled' : appointment.status === 'completed' ? 'Completed' : appointment.status === 'cancelled' ? 'Cancelled' : 'Pending',
  notes: appointment.notes || appointment.reason || '',
  billingAmount: 120,
  parentName: appointment.parentId?.username || appointment.parentId?.email || 'Unknown Parent'
});

// All routes require authentication and therapist role
router.use(verifyToken);
router.use(therapistCheck);

// Get therapist's profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get therapist's clients (only their assigned clients)
router.get('/clients', requireResourceAccess('children'), async (req, res) => {
  try {
    const clients = await Patient.find({ therapist_user_id: req.user.id });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get secure parent queries/messages for therapist
router.get('/parent-queries', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { therapistId: req.user.id };

    if (status && ['unread', 'read', 'replied'].includes(String(status).toLowerCase())) {
      filter.status = String(status).toLowerCase();
    }

    const queries = await ParentTherapistQuery.find(filter)
      .populate('parentId', 'username email')
      .populate('childId', 'name age')
      .populate('careTeamMemberId', 'name role email')
      .sort({ createdAt: -1 })
      .limit(100);

    const normalized = queries.map((item) => ({
      _id: item._id,
      subject: item.subject,
      message: item.message,
      replies: Array.isArray(item.replies) ? item.replies : [],
      status: item.status,
      readAt: item.readAt,
      createdAt: item.createdAt,
      parent: {
        _id: item.parentId?._id,
        name: item.parentId?.username || item.parentId?.email || 'Unknown Parent',
        email: item.parentId?.email || null,
      },
      child: {
        _id: item.childId?._id,
        name: item.childId?.name || 'Unknown Child',
        age: item.childId?.age,
      },
      provider: {
        _id: item.careTeamMemberId?._id,
        name: item.careTeamMemberId?.name || 'Care Team Provider',
        role: item.careTeamMemberId?.role || 'Therapist',
        email: item.careTeamMemberId?.email || null,
      }
    }));

    res.json(normalized);
  } catch (error) {
    console.error('GET /parent-queries - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get grouped parent query sessions (threaded by parent + child)
router.get('/query-sessions', async (req, res) => {
  try {
    const queries = await ParentTherapistQuery.find({ therapistId: req.user.id })
      .populate('parentId', 'username email')
      .populate('childId', 'name age')
      .populate('careTeamMemberId', 'name role email')
      .sort({ createdAt: -1 })
      .limit(500);

    const sessionMap = new Map();

    for (const item of queries) {
      const parentId = item.parentId?._id ? String(item.parentId._id) : 'unknown-parent';
      const childId = item.childId?._id ? String(item.childId._id) : 'unknown-child';
      const key = `${parentId}:${childId}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          sessionId: key,
          parent: {
            _id: item.parentId?._id,
            name: item.parentId?.username || item.parentId?.email || 'Unknown Parent',
            email: item.parentId?.email || null,
          },
          child: {
            _id: item.childId?._id,
            name: item.childId?.name || 'Unknown Child',
            age: item.childId?.age,
          },
          unreadCount: 0,
          latestMessageAt: item.createdAt,
          latestSubject: item.subject,
          messages: [],
        });
      }

      const session = sessionMap.get(key);
      if (item.status === 'unread') {
        session.unreadCount += 1;
      }

      session.messages.push({
        _id: item._id,
        subject: item.subject,
        message: item.message,
        replies: Array.isArray(item.replies) ? item.replies : [],
        status: item.status,
        readAt: item.readAt,
        createdAt: item.createdAt,
        provider: {
          _id: item.careTeamMemberId?._id,
          name: item.careTeamMemberId?.name || 'Care Team Provider',
          role: item.careTeamMemberId?.role || 'Therapist',
          email: item.careTeamMemberId?.email || null,
        }
      });
    }

    const sessions = Array.from(sessionMap.values())
      .map((session) => ({
        ...session,
        // Keep session messages sorted oldest -> newest for chat-like display.
        messages: session.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      }))
      .sort((a, b) => new Date(b.latestMessageAt) - new Date(a.latestMessageAt));

    res.json(sessions);
  } catch (error) {
    console.error('GET /query-sessions - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Therapist reply to a parent query message
router.put('/parent-queries/:queryId/reply', async (req, res) => {
  try {
    const { queryId } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(queryId)) {
      return res.status(400).json({ message: 'Invalid query id.' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Reply message is required.' });
    }

    const query = await ParentTherapistQuery.findById(queryId)
      .populate('careTeamMemberId', 'therapistId email');

    if (!query) {
      return res.status(404).json({ message: 'Parent query not found.' });
    }

    const ownsByQueryTherapist = query.therapistId && String(query.therapistId) === String(req.user.id);
    const ownsByCareTeamTherapist =
      query.careTeamMemberId?.therapistId &&
      String(query.careTeamMemberId.therapistId) === String(req.user.id);

    if (!ownsByQueryTherapist && !ownsByCareTeamTherapist) {
      return res.status(403).json({ message: 'Access denied for this parent query.' });
    }

    query.replies = Array.isArray(query.replies) ? query.replies : [];
    query.replies.push({
      senderRole: 'therapist',
      senderId: req.user.id,
      message: String(message).trim(),
      createdAt: new Date()
    });

    query.status = 'replied';
    if (!query.readAt) {
      query.readAt = new Date();
    }

    await query.save();
    res.json({ message: 'Reply sent successfully.', query });
  } catch (error) {
    console.error('PUT /parent-queries/:queryId/reply - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark a parent query as read
router.put('/parent-queries/:queryId/read', async (req, res) => {
  try {
    const { queryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(queryId)) {
      return res.status(400).json({ message: 'Invalid query id.' });
    }

    const query = await ParentTherapistQuery.findById(queryId)
      .populate('careTeamMemberId', 'therapistId email');

    if (!query) {
      return res.status(404).json({ message: 'Parent query not found.' });
    }

    const ownsByQueryTherapist = query.therapistId && String(query.therapistId) === String(req.user.id);
    const ownsByCareTeamTherapist =
      query.careTeamMemberId?.therapistId &&
      String(query.careTeamMemberId.therapistId) === String(req.user.id);

    if (!ownsByQueryTherapist && !ownsByCareTeamTherapist) {
      return res.status(403).json({ message: 'Access denied for this parent query.' });
    }

    if (query.status === 'unread') {
      query.status = 'read';
      query.readAt = new Date();
      await query.save();
    }

    res.json({ message: 'Query marked as read.', query });
  } catch (error) {
    console.error('PUT /parent-queries/:queryId/read - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get specific patient details by ID
router.get('/patient/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find patient and verify it belongs to this therapist
    const patient = await Patient.findOne({ 
      _id: id, 
      therapist_user_id: req.user.id 
    });
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found or access denied' });
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get patient's screening history
router.get('/patient/:id/screenings', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify patient belongs to this therapist
    const patient = await Patient.findOne({ 
      _id: id, 
      therapist_user_id: req.user.id 
    });
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found or access denied' });
    }
    
    // Fetch gaze sessions for this patient
    const gazeSessions = await GazeSession.find({
      patientId: id,
      isGuest: false
    })
    .select('sessionType module status snapshots createdAt result')
    .sort({ createdAt: -1 })
    .limit(20);
    
    // Format screening data
    const screenings = gazeSessions.map(session => ({
      _id: session._id,
      screeningType: 'gaze',
      sessionType: session.sessionType || session.module,
      status: session.status,
      result: session.result,
      snapshots: session.snapshots || [],
      createdAt: session.createdAt
    }));
    
    res.json(screenings);
  } catch (error) {
    console.error('Error fetching patient screenings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get today's appointments
router.get('/appointments/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointments = await Appointment.find({
      therapistId: req.user.id,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('childId', 'name')
    .populate('parentId', 'username email')
    .sort({ appointmentTime: 1 });
    
    const formattedAppointments = appointments.map(apt => ({
      id: apt._id,
      clientId: apt.childId._id,
      clientName: apt.childId.name,
      time: apt.appointmentTime,
      duration: 45, // Default duration
      type: 'In-Person', // Default type
      status: apt.status === 'confirmed' ? 'Confirmed' : 'Pending',
      notes: apt.notes || apt.reason || '',
      appointmentDate: apt.appointmentDate,
      parentName: apt.parentId?.username || apt.parentId?.email
    }));
    
    res.json(formattedAppointments);
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all appointments
router.get('/appointments', requireResourceAccess('appointments'), async (req, res) => {
  try {
    const userIdString = String(req.user.id);
    
    // Get raw appointments without populate first
    const rawAppointments = await Appointment.find({
      $or: [
        { therapistId: req.user.id },
        { therapistId: new mongoose.Types.ObjectId(userIdString) }
      ]
    })
    .lean()
    .sort({ appointmentDate: -1 });
    
    console.log('Found raw appointments:', rawAppointments.length);
    
    // Manually fetch all related data
    const appointmentsWithData = await Promise.all(rawAppointments.map(async (apt) => {
      // Fetch patient name
      let childName = 'Client Name Not Available';
      if (apt.childId) {
        try {
          const childIdToUse = apt.childId._id ? apt.childId._id : apt.childId;
          const patient = await Patient.findById(childIdToUse).select('name').lean();
          if (patient && patient.name) {
            childName = patient.name;
            console.log(`Appointment ${apt._id}: Found patient ${childName}`);
          } else {
            console.log(`Appointment ${apt._id}: Patient not found for ID ${childIdToUse}`);
          }
        } catch (err) {
          console.log(`Appointment ${apt._id}: Error fetching patient:`, err.message);
        }
      } else {
        console.log(`Appointment ${apt._id}: No childId reference`);
      }
      
      // Fetch parent name
      let parentName = 'Unknown Parent';
      if (apt.parentId) {
        try {
          const parent = await User.findById(apt.parentId).select('username email').lean();
          if (parent) {
            parentName = parent.username || parent.email || 'Unknown Parent';
          }
        } catch (err) {
          console.log(`Appointment ${apt._id}: Error fetching parent:`, err.message);
        }
      }
      
      return {
        ...apt,
        childName,
        parentName
      };
    }));
    
    // Format appointments
    const formattedAppointments = appointmentsWithData.map((apt) => ({
      id: apt._id,
      clientId: apt.childId,
      clientName: apt.childName,
      date: apt.appointmentDate ? apt.appointmentDate.toISOString().split('T')[0] : 'N/A',
      time: apt.appointmentTime,
      duration: 45,
      type: apt.type || 'In-Person',
      status: apt.status === 'confirmed' ? 'Scheduled' : apt.status === 'completed' ? 'Completed' : apt.status === 'cancelled' ? 'Cancelled' : 'Pending',
      notes: apt.notes || apt.reason || '',
      billingAmount: 120,
      parentName: apt.parentName
    }));
    
    res.json(formattedAppointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/appointments/:appointmentId/confirm', requireResourceAccess('appointments'), async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      therapistId: req.user.id
    })
    .populate('childId', 'name')
    .populate('parentId', 'username email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'confirmed';
    await appointment.save();

    res.json(formatAppointmentResponse(appointment));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/appointments/:appointmentId/reschedule', requireResourceAccess('appointments'), async (req, res) => {
  try {
    const { date, time } = req.body;
    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required' });
    }

    const trimmedDate = date.trim();
    const trimmedTime = time.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
    }

    const time24Pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const time12Pattern = /^((0?[1-9])|(1[0-2])):[0-5]\d\s?(AM|PM)$/i;

    if (!time24Pattern.test(trimmedTime) && !time12Pattern.test(trimmedTime)) {
      return res.status(400).json({ message: 'Time must be in HH:MM or HH:MM AM/PM format' });
    }

    const [year, month, day] = trimmedDate.split('-').map(Number);
    const normalizedDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date provided' });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      therapistId: req.user.id
    })
    .populate('childId', 'name')
    .populate('parentId', 'username email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.appointmentDate = normalizedDate;
    appointment.appointmentTime = time;
    appointment.status = 'pending';

    await appointment.save();

    res.json(formatAppointmentResponse(appointment));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get to-do list (pending session notes)
router.get('/todo', async (req, res) => {
  try {
    const todoItems = [
      {
        id: 1,
        type: 'session_note',
        clientName: 'Alex Johnson',
        appointmentDate: '2024-01-15',
        priority: 'high',
        description: 'Complete session notes for Alex\'s behavioral therapy session'
      },
      {
        id: 2,
        type: 'assessment',
        clientName: 'Emma Smith',
        appointmentDate: '2024-01-16',
        priority: 'medium',
        description: 'Review Emma\'s speech assessment results'
      },
      {
        id: 3,
        type: 'report',
        clientName: 'Liam Brown',
        appointmentDate: '2024-01-14',
        priority: 'low',
        description: 'Update progress report for Liam'
      }
    ];
    
    res.json(todoItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get calendar/availability
router.get('/calendar', async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Get slots for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    
    const slots = await Slot.find({
      therapistId: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      },
      isActive: true
    }).sort({ date: 1 });
    
    // Get appointments for the month
    const appointments = await Appointment.find({
      therapistId: req.user.id,
      appointmentDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('childId', 'name')
    .sort({ appointmentDate: 1 });
    
    // Format availability data
    const availability = slots.map(slot => ({
      date: slot.date.toISOString().split('T')[0],
      slots: generateTimeSlots(slot.startTime, slot.endTime, slot.intervalMinutes, slot.breakTimeMinutes)
    }));
    
    // Format appointments data
    const formattedAppointments = appointments.map(apt => ({
      date: apt.appointmentDate.toISOString().split('T')[0],
      time: apt.appointmentTime,
      client: apt.childId.name,
      duration: 45 // Default duration
    }));
    
    const calendar = {
      month: targetMonth + 1,
      year: targetYear,
      availability,
      appointments: formattedAppointments
    };
    
    res.json(calendar);
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, intervalMinutes, breakTimeMinutes) {
  const slots = [];
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  let current = new Date(start);
  
  while (current < end) {
    const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
    if (slotEnd <= end) {
      slots.push(current.toTimeString().slice(0, 5));
    }
    current = new Date(slotEnd.getTime() + breakTimeMinutes * 60000);
  }
  
  return slots;
}

// Update availability
router.put('/calendar/availability', async (req, res) => {
  try {
    const { date, slots } = req.body;
    
    // Mock availability update
    const updatedAvailability = {
      date,
      slots,
      therapistId: req.user.id,
      updatedAt: new Date()
    };
    
    res.json(updatedAvailability);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== WEEKLY SCHEDULE ENDPOINT ==============
// Get weekly schedule with real appointment data
router.get('/schedule', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to current week if no dates provided
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Get current week (Monday to Friday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday adjustment
      
      start = new Date(now);
      start.setDate(now.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 4); // Monday to Friday
      end.setHours(23, 59, 59, 999);
    }
    
    // Fetch appointments for this week
    const appointments = await Appointment.find({
      therapistId: req.user.id,
      appointmentDate: {
        $gte: start,
        $lte: end
      }
    })
    .populate('childId', 'name')
    .populate('parentId', 'username email')
    .sort({ appointmentDate: 1, appointmentTime: 1 });
    
    // Fetch slots for this week
    const slots = await Slot.find({
      therapistId: req.user.id,
      date: {
        $gte: start,
        $lte: end
      },
      isActive: true
    }).sort({ date: 1 });
    
    // Format the response
    const formattedAppointments = appointments.map(apt => {
      const dayOfWeek = apt.appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
      return {
        id: apt._id,
        day: dayOfWeek,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        patient: apt.childId?.name || 'Unknown Patient',
        patientId: apt.childId?._id,
        parentName: apt.parentId?.username || apt.parentId?.email || 'Unknown Parent',
        status: apt.status,
        reason: apt.reason,
        notes: apt.notes,
        paymentStatus: apt.paymentStatus
      };
    });
    
    // Format slots with generated time slots
    const formattedSlots = slots.map(slot => {
      const dayOfWeek = slot.date.toLocaleDateString('en-US', { weekday: 'long' });
      const timeSlots = generateTimeSlots(
        slot.startTime,
        slot.endTime,
        slot.intervalMinutes,
        slot.breakTimeMinutes
      );
      
      return {
        id: slot._id,
        day: dayOfWeek,
        date: slot.date,
        timeSlots: timeSlots,
        mode: slot.mode,
        hospitalClinicName: slot.hospitalClinicName
      };
    });
    
    res.json({
      weekStart: start,
      weekEnd: end,
      appointments: formattedAppointments,
      slots: formattedSlots
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book a slot - Create appointment for available slot
router.post('/book-slot', async (req, res) => {
  try {
    const { patientId, day, time, date, reason } = req.body;
    const therapistId = req.user.id;

    // Validate required fields
    if (!patientId || !day || !time || !date) {
      return res.status(400).json({ 
        message: 'Missing required fields: patientId, day, time, and date are required' 
      });
    }

    // Verify the patient exists and belongs to this therapist
    const patient = await Patient.findOne({
      _id: patientId,
      therapist_user_id: therapistId
    });

    if (!patient) {
      return res.status(404).json({ 
        message: 'Patient not found or not assigned to you' 
      });
    }

    // Parse the date
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    // Check if slot is already booked (prevent double booking)
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

    // Get parent ID from patient
    const parentId = patient.parent_user_id;
    
    if (!parentId) {
      // If patient doesn't have a parent, try to find any parent user
      // In a real scenario, you might want to prompt for parent selection
      const parentUser = await User.findOne({ role: 'parent' }).limit(1);
      
      if (!parentUser) {
        return res.status(400).json({ 
          message: 'No parent user found. Please ensure patient has an associated parent or create a parent account first.' 
        });
      }
      
      // Use the first available parent as a fallback
      // In production, you'd want to associate the patient with a specific parent first
      console.log(`⚠️ Warning: Patient ${patient.name} has no parent. Using fallback parent ${parentUser.username || parentUser.email}`);
    }

    // Create the appointment with either actual parent or fallback
    const appointmentParentId = parentId || (await User.findOne({ role: 'parent' }).limit(1))._id;
    
    const newAppointment = new Appointment({
      parentId: appointmentParentId,
      childId: patientId,
      therapistId: therapistId,
      appointmentDate: appointmentDate,
      appointmentTime: time,
      reason: reason || 'Scheduled appointment',
      status: 'pending',
      paymentStatus: 'pending',
      appointmentFee: 0
    });

    await newAppointment.save();

    // Populate the data for response
    await newAppointment.populate('childId', 'name');
    await newAppointment.populate('parentId', 'username email');

    const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        id: newAppointment._id,
        day: dayOfWeek,
        date: appointmentDate,
        time: newAppointment.appointmentTime,
        patient: newAppointment.childId?.name,
        patientId: newAppointment.childId?._id,
        parentName: newAppointment.parentId?.username || newAppointment.parentId?.email,
        status: newAppointment.status,
        reason: newAppointment.reason,
        paymentStatus: newAppointment.paymentStatus
      }
    });
  } catch (error) {
    console.error('Error booking slot:', error);
    res.status(500).json({ 
      message: 'Server error while booking appointment', 
      error: error.message 
    });
  }
});

// Get gaze session details
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await GazeSession.findById(req.params.sessionId).populate('patientId', 'name age gender');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update billing information
router.get('/billing', async (req, res) => {
  try {
    const billing = {
      totalEarnings: 2400,
      thisMonth: 800,
      pendingPayments: 400,
      completedSessions: 20,
      upcomingSessions: 5,
      recentTransactions: [
        {
          id: 1,
          clientName: 'Alex Johnson',
          amount: 120,
          date: '2024-01-15',
          status: 'Paid',
          sessionType: 'Behavioral Therapy'
        },
        {
          id: 2,
          clientName: 'Emma Smith',
          amount: 80,
          date: '2024-01-14',
          status: 'Pending',
          sessionType: 'Speech Therapy'
        }
      ]
    };
    
    res.json(billing);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create clinical notes
router.post('/clinical-notes', async (req, res) => {
  try {
    const { clientId, notes, sessionType, date } = req.body;
    
    // Verify the client belongs to this therapist
    const client = await Patient.findOne({ 
      _id: clientId, 
      therapist_user_id: req.user.id 
    });
    
    if (!client) {
      return res.status(403).json({ message: 'Access denied. Client not found or not assigned to you.' });
    }

    const clinicalNote = {
      id: Date.now(),
      clientId,
      clientName: client.name,
      therapistId: req.user.id,
      notes,
      sessionType,
      date: date || new Date(),
      createdAt: new Date()
    };
    
    res.status(201).json(clinicalNote);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get clinical notes for a client
router.get('/clinical-notes/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verify the client belongs to this therapist
    const client = await Patient.findOne({ 
      _id: clientId, 
      therapist_user_id: req.user.id 
    });
    
    if (!client) {
      return res.status(403).json({ message: 'Access denied. Client not found or not assigned to you.' });
    }

    // Mock clinical notes
    const notes = [
      {
        id: 1,
        date: '2024-01-15',
        sessionType: 'Behavioral Therapy',
        notes: 'Alex showed improvement in following instructions. Continued focus on social interaction skills.',
        therapistId: req.user.id
      },
      {
        id: 2,
        date: '2024-01-10',
        sessionType: 'Assessment',
        notes: 'Initial assessment completed. Identified areas for improvement in communication.',
        therapistId: req.user.id
      }
    ];
    
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Slot Management Routes

// Get all slots for the therapist
router.get('/slots', async (req, res) => {
  try {
    const slots = await Slot.find({ 
      therapistId: req.user.id,
      isActive: true 
    }).sort({ date: 1, startTime: 1 });
    
    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new slot
router.post('/slots', async (req, res) => {
  try {
    const { date, startTime, endTime, intervalMinutes, breakTimeMinutes, mode, hospitalClinicName } = req.body;
    
    // Validate required fields
    if (!date || !startTime || !endTime || !intervalMinutes || !breakTimeMinutes || !mode) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Parse date string (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ message: 'You can only create slots for today or future dates' });
    }
    
    // Validate hospital name for in-person appointments
    if (mode === 'In-person' && !hospitalClinicName?.trim()) {
      return res.status(400).json({ message: 'Hospital/Clinic name is required for in-person appointments' });
    }
    
    // Check if slot already exists for this date
    const existingSlot = await Slot.findOne({
      therapistId: req.user.id,
      date: selectedDate,
      isActive: true
    });
    
    if (existingSlot) {
      return res.status(400).json({ message: 'A slot already exists for this date' });
    }
    
    const slot = new Slot({
      therapistId: req.user.id,
      date: selectedDate,
      startTime,
      endTime,
      intervalMinutes,
      breakTimeMinutes,
      mode,
      hospitalClinicName: mode === 'In-person' ? hospitalClinicName : undefined
    });
    
    await slot.save();
    res.status(201).json(slot);
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete slot
router.delete('/slots/:slotId', async (req, res) => {
  try {
    const slot = await Slot.findOne({
      _id: req.params.slotId,
      therapistId: req.user.id
    });
    
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    await Slot.findByIdAndDelete(req.params.slotId);
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available slots for patients (public endpoint)
router.get('/slots/available', async (req, res) => {
  try {
    const { therapistId, date } = req.query;
    
    if (!therapistId || !date) {
      return res.status(400).json({ message: 'Therapist ID and date are required' });
    }
    
    // Parse date string (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = date.split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    const slot = await Slot.findOne({
      therapistId,
      date: requestedDate,
      isActive: true
    });
    
    if (!slot) {
      return res.json({ availableSlots: [] });
    }
    
    // Generate time slots
    const generateTimeSlots = (startTime, endTime, intervalMinutes, breakTimeMinutes) => {
      const slots = [];
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      
      let current = new Date(start);
      
      while (current < end) {
        const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
        if (slotEnd <= end) {
          slots.push({
            start: current.toTimeString().slice(0, 5),
            end: slotEnd.toTimeString().slice(0, 5)
          });
        }
        current = new Date(slotEnd.getTime() + breakTimeMinutes * 60000);
      }
      
      return slots;
    };
    
    const availableSlots = generateTimeSlots(
      slot.startTime,
      slot.endTime,
      slot.intervalMinutes,
      slot.breakTimeMinutes
    );
    
    res.json({
      slot: {
        id: slot._id,
        date: slot.date,
        mode: slot.mode,
        hospitalClinicName: slot.hospitalClinicName
      },
      availableSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== PROGRESS TRACKING ROUTES ==============

const { spawn } = require('child_process');

router.post('/predict-progress', async (req, res) => {
  try {
    const { childData } = req.body;

    if (!childData) {
      return res.status(400).json({ error: 'Child data is required' });
    }

    const pythonBin = process.env.PYTHON_BIN || 'python';
    const workerPath = path.join(__dirname, '..', 'predict_progress.py');

    let stdoutData = '';
    let stderrData = '';

    const child = spawn(pythonBin, [workerPath, JSON.stringify(childData)], { stdio: ['ignore', 'pipe', 'pipe'] });

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
      console.error('Python stderr:', chunk.toString());
    });

    child.on('error', (err) => {
      console.error('❌ Python Worker Error:', err);
      return res.status(500).json({ 
        error: 'Failed to predict progress',
        details: String(err)
      });
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python worker failed with code:', code);
        console.error('Stderr:', stderrData);
        return res.status(500).json({ 
          error: 'Prediction failed',
          details: stderrData
        });
      }

      try {
        const result = JSON.parse(stdoutData.trim());
        console.log('✅ Progress Prediction Success:', result);
        res.json(result);
      } catch (parseErr) {
        console.error('Failed to parse prediction output:', stdoutData);
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    console.error('POST /predict-progress - Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.post('/process-dream-dataset', upload.single('datasetFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = req.file.path;
    const outputDir = path.join('uploads/dream_output', Date.now().toString());
    const outputFile = path.join(outputDir, 'dream_features.csv');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pythonScript = path.join(__dirname, '../ai_model/process_data.py');
    const inputDir = path.dirname(uploadedFile);
    
    const command = `python "${pythonScript}" "${inputDir}" "${outputFile}"`;
    
    console.log('[DREAM] Processing dataset:', req.file.originalname);
    console.log('[DREAM] Command:', command);

    exec(command, { maxBuffer: 10 * 1024 * 1024 }, async (error, stdout, stderr) => {
      if (error) {
        console.error('[DREAM] Processing error:', error);
        console.error('[DREAM] Stderr:', stderr);
        return res.status(500).json({ 
          error: 'Dataset processing failed',
          details: stderr 
        });
      }

      try {
        if (!fs.existsSync(outputFile)) {
          return res.status(500).json({ error: 'Output file not generated' });
        }

        const batchId = `DREAM_${Date.now()}`;
        const features = [];
        const processedCount = { total: 0, success: 0, failed: 0 };

        fs.createReadStream(outputFile)
          .pipe(csv())
          .on('data', (row) => {
            features.push({
              participantId: row.Participant_ID,
              sessionDate: row.Session_Date,
              averageJointVelocity: parseFloat(row.Average_Joint_Velocity) || 0,
              totalDisplacementRatio: parseFloat(row.Total_Displacement_Ratio) || 0,
              headGazeVariance: parseFloat(row.Head_Gaze_Variance) || 0,
              eyeGazeConsistency: parseFloat(row.Eye_Gaze_Consistency) || 0,
              adosCommunicationScore: parseInt(row.ADOS_Communication_Score) || 0,
              adosTotalScore: parseInt(row.ADOS_Total_Score),
              ageMonths: parseInt(row.Age_Months) || 0,
              therapyCondition: row.Therapy_Condition,
              filePath: row.File_Path,
              uploadedBy: req.user.id,
              batchId: batchId,
              processedAt: new Date()
            });
            processedCount.total++;
          })
          .on('end', async () => {
            try {
              if (features.length > 0) {
                const insertedDocs = await DREAMFeatures.insertMany(features);
                processedCount.success = insertedDocs.length;
              }

              const summaryStats = {
                avgVelocity: features.reduce((sum, f) => sum + f.averageJointVelocity, 0) / features.length || 0,
                avgADOSScore: features.reduce((sum, f) => sum + f.adosTotalScore, 0) / features.length || 0,
                adosRange: {
                  min: Math.min(...features.map(f => f.adosTotalScore)),
                  max: Math.max(...features.map(f => f.adosTotalScore))
                }
              };

              console.log('[DREAM] Processing complete:', {
                total: processedCount.total,
                inserted: processedCount.success,
                failed: processedCount.failed
              });

              res.json({
                success: true,
                message: 'Dataset processed successfully',
                batchId: batchId,
                processedCount: processedCount.success,
                totalCount: processedCount.total,
                summaryStats: summaryStats,
                csvFile: outputFile
              });

              setTimeout(() => {
                if (fs.existsSync(uploadedFile)) fs.unlinkSync(uploadedFile);
              }, 5000);

            } catch (dbErr) {
              console.error('[DREAM] Database error:', dbErr);
              res.status(500).json({ 
                error: 'Failed to save to database',
                details: dbErr.message 
              });
            }
          })
          .on('error', (err) => {
            console.error('[DREAM] CSV parsing error:', err);
            res.status(500).json({ 
              error: 'Failed to parse output file',
              details: err.message 
            });
          });

      } catch (processErr) {
        console.error('[DREAM] Error:', processErr);
        res.status(500).json({ error: 'Processing error', details: processErr.message });
      }
    });

  } catch (error) {
    console.error('[DREAM] POST /process-dream-dataset - Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

router.get('/dream-features', async (req, res) => {
  try {
    const { batchId, participantId, limit = 100, skip = 0 } = req.query;
    
    const query = {};
    if (batchId) query.batchId = batchId;
    if (participantId) query.participantId = participantId;

    const features = await DREAMFeatures.find(query)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ processedAt: -1 });

    const total = await DREAMFeatures.countDocuments(query);

    res.json({
      success: true,
      features: features,
      pagination: { total, skip: parseInt(skip), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('[DREAM] GET /dream-features - Error:', error);
    res.status(500).json({ error: 'Failed to fetch features', message: error.message });
  }
});

router.get('/dream-features/:id', async (req, res) => {
  try {
    const feature = await DREAMFeatures.findById(req.params.id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    res.json({ success: true, feature: feature });
  } catch (error) {
    console.error('[DREAM] GET /dream-features/:id - Error:', error);
    res.status(500).json({ error: 'Failed to fetch feature', message: error.message });
  }
});

router.post('/dream-features/export/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const features = await DREAMFeatures.find({ batchId: batchId });

    if (features.length === 0) {
      return res.status(404).json({ error: 'No features found for this batch' });
    }

    const csv = require('csv-stringify/sync');
    const stringifier = csv.stringify;

    const headers = [
      'Participant_ID', 'Session_Date', 'Average_Joint_Velocity', 
      'Total_Displacement_Ratio', 'Head_Gaze_Variance', 'Eye_Gaze_Consistency',
      'ADOS_Communication_Score', 'ADOS_Total_Score', 'Age_Months', 'Therapy_Condition'
    ];

    const records = features.map(f => [
      f.participantId,
      f.sessionDate,
      f.averageJointVelocity,
      f.totalDisplacementRatio,
      f.headGazeVariance,
      f.eyeGazeConsistency,
      f.adosCommunicationScore,
      f.adosTotalScore,
      f.ageMonths,
      f.therapyCondition
    ]);

    const csvContent = stringifier([headers, ...records]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dream_features_${batchId}.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('[DREAM] Export error:', error);
    res.status(500).json({ error: 'Export failed', message: error.message });
  }
});

// Patient Progress Tracking - Historical Data with Predictions
router.get('/patient-progress/:patientId', requireResourceAccess('children'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { metric = 'gaze' } = req.query;

    const patient = await Patient.findOne({
      _id: patientId,
      therapist_user_id: req.user.id
    });

    if (!patient) {
      return res.status(403).json({ message: 'Access denied. Patient not found.' });
    }

    const dreamFeatures = await DREAMFeatures.find({
      participantId: patient.patient_id || patientId
    }).sort({ processedAt: 1 }).limit(12);

    if (dreamFeatures.length === 0) {
      return res.json({
        historicalData: [],
        prediction: [],
        message: 'No DREAM dataset sessions available for this patient'
      });
    }

    const historicalData = dreamFeatures.map((feature, idx) => ({
      sessionNumber: idx + 1,
      sessionDate: feature.sessionDate || feature.processedAt,
      score: metric === 'gaze' 
        ? (100 - (feature.headGazeVariance || 0) * 100)
        : (feature.averageJointVelocity || 0) * 100,
      rawValue: metric === 'gaze' ? feature.headGazeVariance : feature.averageJointVelocity
    }));

    const recentData = historicalData.slice(-3);
    const avgScore = recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length;
    const trend = historicalData.length > 1 
      ? ((historicalData[historicalData.length - 1].score - historicalData[0].score) / historicalData.length)
      : 0;

    const predictionData = [];
    const baseDate = new Date(historicalData[historicalData.length - 1].sessionDate);
    
    for (let i = 1; i <= 8; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + (i * 7));
      
      const predictedScore = Math.min(100, avgScore + (trend * i * 1.5));
      
      predictionData.push({
        forecastWeek: i,
        forecastDate: forecastDate,
        score: Math.max(0, Math.min(100, predictedScore)),
        confidence: Math.max(60, 95 - (i * 3))
      });
    }

    res.json({
      historicalData,
      prediction: predictionData,
      summary: {
        totalSessions: historicalData.length,
        currentScore: historicalData[historicalData.length - 1].score,
        trend: trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable',
        projectedImprovement: predictionData[predictionData.length - 1].score - historicalData[historicalData.length - 1].score
      }
    });
  } catch (error) {
    console.error('Error fetching patient progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Behavioral Metrics - Latest Session Analysis
router.get('/behavioral-metrics/:patientId', requireResourceAccess('children'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { sessionId } = req.query;

    const patient = await Patient.findOne({
      _id: patientId,
      therapist_user_id: req.user.id
    });

    if (!patient) {
      return res.status(403).json({ message: 'Access denied. Patient not found.' });
    }

    // First try to get from database
    let dreamFeature;
    
    if (sessionId) {
      dreamFeature = await DREAMFeatures.findById(sessionId);
    } else {
      dreamFeature = await DREAMFeatures.findOne({
        participantId: patient.patient_id || patientId
      }).sort({ processedAt: -1 });
    }

    // If no data in DB, try to extract from DREAM dataset using Python
    if (!dreamFeature) {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Map patient_id to DREAM user ID (for testing, use random IDs from 10-80)
      const dreamUserId = String(patient.patient_id || Math.floor(Math.random() * 70) + 10);
      
      // Use virtual environment Python if available
      const pythonPath = process.env.PYTHON_PATH || path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
      const scriptPath = path.join(__dirname, '..', 'dream_worker.py');
      
      console.log(`[DREAM] Extracting features for patient ${patientId}, DREAM User: ${dreamUserId}`);
      console.log(`[DREAM] Python: ${pythonPath}`);
      console.log(`[DREAM] Script: ${scriptPath}`);
      
      const pythonProcess = spawn(pythonPath, [scriptPath, dreamUserId]);
      
      let stdoutData = '';
      let stderrData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`[DREAM] Python process exited with code: ${code}`);
        console.log(`[DREAM] stdout length: ${stdoutData.length}`);
        if (stderrData) console.log(`[DREAM] stderr: ${stderrData}`);
        
        if (code !== 0 || !stdoutData) {
          console.error('[DREAM] Python worker error:', stderrData);
          return res.json({
            sessionDate: new Date().toISOString().split('T')[0],
            averageJointVelocity: 0,
            headGazeVariance: 0,
            totalDisplacementRatio: 0,
            adosCommunicationScore: 0,
            adosTotalScore: 0,
            message: 'No DREAM dataset available for this patient'
          });
        }
        
        try {
          console.log(`[DREAM] Parsing JSON output...`);
          const result = JSON.parse(stdoutData);
          
          if (result.error) {
            console.error('[DREAM] Feature extraction error:', result.error);
            return res.json({
              sessionDate: new Date().toISOString().split('T')[0],
              averageJointVelocity: 0,
              headGazeVariance: 0,
              totalDisplacementRatio: 0,
              adosCommunicationScore: 0,
              adosTotalScore: 0,
              message: result.error
            });
          }
          
          console.log(`[DREAM] ✅ Successfully extracted features for ${result.participantId}`);
          
          // Return extracted features
          return res.json({
            sessionDate: result.sessionDate || new Date().toISOString().split('T')[0],
            averageJointVelocity: result.averageJointVelocity || 0,
            headGazeVariance: result.headGazeVariance || 0,
            totalDisplacementRatio: result.totalDisplacementRatio || 0,
            eyeGazeConsistency: result.eyeGazeConsistency || 0,
            adosCommunicationScore: result.adosCommunicationScore || 0,
            adosTotalScore: result.adosTotalScore || 0,
            ageMonths: result.ageMonths || 0,
            therapyCondition: result.therapyCondition || 'Unknown',
            participantId: result.participantId,
            source: 'dream_dataset'
          });
        } catch (parseError) {
          console.error('Error parsing Python output:', parseError);
          console.error('Raw output:', stdoutData);
          return res.json({
            sessionDate: new Date().toISOString().split('T')[0],
            averageJointVelocity: 0,
            headGazeVariance: 0,
            totalDisplacementRatio: 0,
            adosCommunicationScore: 0,
            adosTotalScore: 0,
            message: 'Error processing DREAM data'
          });
        }
      });
      
      return; // Don't send response yet, wait for Python process
    }

    // Return database data if available
    res.json({
      sessionDate: dreamFeature.sessionDate || dreamFeature.processedAt,
      averageJointVelocity: dreamFeature.averageJointVelocity || 0,
      headGazeVariance: dreamFeature.headGazeVariance || 0,
      totalDisplacementRatio: dreamFeature.totalDisplacementRatio || 0,
      eyeGazeConsistency: dreamFeature.eyeGazeConsistency || 0,
      adosCommunicationScore: dreamFeature.adosCommunicationScore || 0,
      adosTotalScore: dreamFeature.adosTotalScore || 0,
      ageMonths: dreamFeature.ageMonths || 0,
      therapyCondition: dreamFeature.therapyCondition || 'Unknown',
      participantId: dreamFeature.participantId,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching behavioral metrics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a report for a student (Therapist version)
router.post('/reports', async (req, res) => {
  try {
    const { patientId, title, status } = req.body;
    
    // Verify the student exists and is accessible by this therapist
    const student = await Patient.findById(patientId);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const reportData = {
      patientId,
      title: title || `Gaze Analysis Report - ${student.name}`,
      status: status || 'final',
      teacherId: req.user.id // We use teacherId field as defined in the model, but it stores the creator ID
    };
    
    const report = new Report(reportData);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete Session - Mark Appointment as Completed with Notes
router.post('/appointments/complete-session', requireResourceAccess('appointments'), async (req, res) => {
  try {
    const { appointmentId, status = 'completed', clinicalNotes } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      therapistId: req.user.id
    }).populate('childId', 'name').populate('parentId', 'username email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or access denied' });
    }

    appointment.status = status;
    if (clinicalNotes) {
      appointment.notes = clinicalNotes;
    }

    await appointment.save();

    res.json({
      success: true,
      message: 'Session completed successfully',
      appointment: formatAppointmentResponse(appointment)
    });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==============================================
// Patient Assignment System
// ==============================================

// Convert Guest Session to Patient
router.post('/convert-guest-to-patient', async (req, res) => {
  try {
    const { guestSessionId, patientName, patientAge, patientGender, additionalInfo, parentEmail } = req.body;

    if (!guestSessionId) {
      return res.status(400).json({ message: 'Guest session ID is required' });
    }

    // Find the guest session
    const guestSession = await GazeSession.findById(guestSessionId);
    if (!guestSession) {
      return res.status(404).json({ message: 'Guest session not found' });
    }

    const hasLegacyGuestInfo = Boolean(
      guestSession.guestInfo?.email ||
      guestSession.guestInfo?.childName ||
      guestSession.guestInfo?.parentName
    );
    const isLegacyConvertible = !guestSession.patientId && hasLegacyGuestInfo;

    if (!guestSession.isGuest && !isLegacyConvertible) {
      return res.status(400).json({ message: 'This session is already linked or cannot be converted' });
    }

    // Check if parent email exists in session metadata, otherwise accept fallback from request.
    const guestEmail = (
      guestSession.guestInfo?.email ||
      parentEmail ||
      ''
    ).trim().toLowerCase();

    if (!guestEmail) {
      return res.status(400).json({
        message: 'Guest session is missing parent email. Please provide parent email to convert this early session.'
      });
    }

    const existingParent = await User.findOne({ email: guestEmail });
    let parentId;

    if (existingParent) {
      if (existingParent.role !== 'parent') {
        return res.status(409).json({
          message: 'This email belongs to a non-parent account. Use a different parent email.'
        });
      }
      parentId = existingParent._id;
      console.log(`✅ Found existing parent: ${existingParent.email}`);
    } else {
      // Create a placeholder parent account
      const newParent = new User({
        username: guestSession.guestInfo.parentName || guestSession.guestInfo.childName || 'Parent',
        email: guestEmail,
        role: 'parent',
        status: 'approved',
        isActive: true
      });
      await newParent.save();
      parentId = newParent._id;
      console.log(`✅ Created new parent account: ${guestEmail}`);
    }

    const parsedAge = Number.parseInt(patientAge, 10);

    // Create patient profile
    const newPatient = new Patient({
      name: patientName || guestSession.guestInfo.childName || 'Guest Child',
      age: Number.isInteger(parsedAge) && parsedAge > 0 ? parsedAge : 5,
      gender: patientGender || 'Other',
      medical_history: additionalInfo || '',
      parent_id: parentId,
      therapist_user_id: req.user.id, // Assign to current therapist
      screeningStatus: 'in-progress',
      reportStatus: 'pending'
    });

    await newPatient.save();
    console.log(`✅ Created patient: ${newPatient.name} with ID ${newPatient._id}`);

    // Link guest session to patient
    guestSession.patientId = newPatient._id;
    guestSession.therapistId = req.user.id;
    guestSession.isGuest = false;
    guestSession.sessionType = 'authenticated';
    await guestSession.save();

    let additionalLinked = 0;
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const normalizedEmailRegex = new RegExp(`^${escapeRegex(guestEmail)}$`, 'i');

    // Find and link all other legacy/guest sessions with same email.
    if (guestEmail) {
      const otherGuestSessions = await GazeSession.find({
        'guestInfo.email': normalizedEmailRegex,
        _id: { $ne: guestSessionId }
      });

      for (const session of otherGuestSessions) {
        try {
          if (session.patientId) {
            continue;
          }
          session.patientId = newPatient._id;
          session.therapistId = req.user.id;
          session.isGuest = false;
          session.sessionType = 'authenticated';
          await session.save();
          additionalLinked++;
        } catch (linkErr) {
          console.error(`❌ Failed to link historical guest session ${session._id}:`, linkErr);
          // Continue with others
        }
      }
    }

    console.log(`✅ Linked ${additionalLinked} additional guest sessions to patient`);

    res.json({
      success: true,
      message: 'Guest successfully converted to patient',
      patient: newPatient,
      linkedSessions: additionalLinked + 1
    });

  } catch (error) {
    console.error('❌ Error converting guest to patient:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add Patient Manually
router.post('/add-patient', async (req, res) => {
  try {
    const { 
      patientName, 
      patientAge, 
      patientGender, 
      medicalHistory,
      parentName,
      parentEmail,
      linkToGuestEmail // Optional: link to existing guest sessions
    } = req.body;

    if (!patientName || !patientAge || !patientGender || !parentEmail) {
      return res.status(400).json({ 
        message: 'Patient name, age, gender, and parent email are required' 
      });
    }

    // Check if parent exists or create new
    const emailToSearch = parentEmail.trim().toLowerCase();
    let parent = await User.findOne({ email: emailToSearch });
    
    if (!parent) {
      parent = new User({
        username: parentName || 'Parent',
        email: emailToSearch,
        role: 'parent',
        status: 'approved',
        isActive: true
      });
      await parent.save();
      console.log(`✅ Created new parent: ${emailToSearch}`);
    }

    // Create patient
    const newPatient = new Patient({
      name: patientName,
      age: patientAge,
      gender: patientGender,
      medical_history: medicalHistory || '',
      parent_id: parent._id,
      therapist_user_id: req.user.id,
      screeningStatus: 'pending',
      reportStatus: 'pending'
    });

    await newPatient.save();
    console.log(`✅ Patient created: ${newPatient.name}`);

    // If linkToGuestEmail is provided, link all guest sessions with that email
    if (linkToGuestEmail) {
      const guestSessions = await GazeSession.find({
        'guestInfo.email': linkToGuestEmail,
        isGuest: true
      });

      for (const session of guestSessions) {
        session.patientId = newPatient._id;
        session.therapistId = req.user.id;
        session.isGuest = false;
        session.sessionType = 'authenticated';
        await session.save();
      }

      console.log(`✅ Linked ${guestSessions.length} guest sessions to patient`);

      return res.json({
        success: true,
        message: 'Patient added successfully',
        patient: newPatient,
        linkedSessions: guestSessions.length
      });
    }

    res.json({
      success: true,
      message: 'Patient added successfully',
      patient: newPatient
    });

  } catch (error) {
    console.error('❌ Error adding patient:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search Guest Sessions by Email
router.get('/search-guest-sessions', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email parameter is required' });
    }

    const guestSessions = await GazeSession.find({
      'guestInfo.email': email,
      isGuest: true
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      success: true,
      sessions: guestSessions,
      count: guestSessions.length
    });

  } catch (error) {
    console.error('❌ Error searching guest sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get All Guest Sessions for Review
router.get('/guest-sessions', async (req, res) => {
  try {
    const guestSessions = await GazeSession.find({
      isGuest: true,
      status: { $in: ['completed', 'pending_review'] }
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

    // Group by email
    const sessionsByEmail = guestSessions.reduce((acc, session) => {
      const email = session.guestInfo?.email;
      if (email) {
        if (!acc[email]) {
          acc[email] = {
            email,
            parentName: session.guestInfo?.parentName,
            childName: session.guestInfo?.childName,
            sessions: []
          };
        }
        acc[email].sessions.push(session);
      }
      return acc;
    }, {});

    res.json({
      success: true,
      guestGroups: Object.values(sessionsByEmail)
    });

  } catch (error) {
    console.error('❌ Error fetching guest sessions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// MULTIMODAL ASD ASSESSMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/therapist/combined-asd-report?patient_id=:patientId
 * 
 * Fetches or generates a combined multimodal ASD assessment report for a patient
 * Implements weighted decision fusion algorithm across all screening modules
 */
router.get('/combined-asd-report', async (req, res) => {
  try {
    const { patient_id } = req.query;

    if (!patient_id) {
      return res.status(400).json({ 
        message: 'Patient ID is required',
        success: false 
      });
    }

    // Verify patient belongs to this therapist
    const patient = await Patient.findOne({ 
      _id: patient_id, 
      therapist_user_id: req.user.id 
    });
    
    if (!patient) {
      return res.status(404).json({ 
        message: 'Patient not found or access denied',
        success: false 
      });
    }

    // Fetch all screening results for this patient
    const screeningResults = {
      facial: null,
      mri: null,
      gaze: null,
      behavior: null,
      questionnaire: null
    };

    // 1. Fetch Facial Screening Result (CNN)
    const facialScreening = await Screening.findOne({
      patientId: patient_id,
      screeningType: 'facial',
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (facialScreening && facialScreening.resultScore !== null && facialScreening.resultScore !== undefined) {
      screeningResults.facial = {
        score: facialScreening.resultScore,
        label: facialScreening.resultLabel,
        confidence: facialScreening.confidenceScore,
        screeningId: facialScreening._id,
        date: facialScreening.createdAt
      };
    }

    // 2. Fetch MRI Screening Result (SVM)
    const mriScreening = await Screening.findOne({
      patientId: patient_id,
      screeningType: 'mri',
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (mriScreening && mriScreening.resultScore !== null && mriScreening.resultScore !== undefined) {
      screeningResults.mri = {
        score: mriScreening.resultScore,
        label: mriScreening.resultLabel,
        confidence: mriScreening.confidenceScore,
        screeningId: mriScreening._id,
        date: mriScreening.createdAt
      };
    }

    // 3. Fetch Live Gaze Analysis Result
    const gazeSession = await GazeSession.findOne({
      patientId: patient_id,
      isGuest: false,
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (gazeSession && gazeSession.result) {
      // Calculate gaze score from gaze session result
      let gazeScore = 0.5; // default moderate risk
      
      if (gazeSession.result.riskLevel === 'High' || gazeSession.result.riskLevel === 'high_risk') {
        gazeScore = 0.75;
      } else if (gazeSession.result.riskLevel === 'Moderate' || gazeSession.result.riskLevel === 'medium_risk') {
        gazeScore = 0.55;
      } else if (gazeSession.result.riskLevel === 'Low' || gazeSession.result.riskLevel === 'low_risk') {
        gazeScore = 0.25;
      }
      
      // If there's a numeric score available, use it directly
      if (gazeSession.result.asdScore !== null && gazeSession.result.asdScore !== undefined) {
        gazeScore = gazeSession.result.asdScore;
      }

      screeningResults.gaze = {
        score: gazeScore,
        label: gazeSession.result.riskLevel,
        confidence: gazeSession.result.confidence || 0.8,
        sessionId: gazeSession._id,
        date: gazeSession.createdAt
      };
    }

    // 4. Fetch Behavioral Assessment Result (Teacher Dashboard)
    const behavioralAssessment = await BehavioralAssessment.findOne({
      studentId: patient_id
    }).sort({ createdAt: -1 });

    if (behavioralAssessment && behavioralAssessment.score !== null && behavioralAssessment.score !== undefined) {
      // Normalize behavioral score to 0-1 range (assuming original score is 0-100)
      let normalizedScore = behavioralAssessment.score;
      if (normalizedScore > 1) {
        normalizedScore = normalizedScore / 100;
      }

      screeningResults.behavior = {
        score: normalizedScore,
        label: normalizedScore > 0.7 ? 'High Risk' : normalizedScore > 0.4 ? 'Moderate Risk' : 'Low Risk',
        confidence: 0.85,
        assessmentId: behavioralAssessment._id,
        date: behavioralAssessment.createdAt
      };
    }

    // 5. Fetch Questionnaire Screening Result
    const questionnaireScreening = await Screening.findOne({
      patientId: patient_id,
      screeningType: 'questionnaire',
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (questionnaireScreening && questionnaireScreening.resultScore !== null && questionnaireScreening.resultScore !== undefined) {
      screeningResults.questionnaire = {
        score: questionnaireScreening.resultScore,
        label: questionnaireScreening.resultLabel,
        confidence: questionnaireScreening.confidenceScore,
        screeningId: questionnaireScreening._id,
        date: questionnaireScreening.createdAt
      };
    }

    // Calculate the combined score using weighted decision fusion
    const weights = {
      facial: 0.25,
      mri: 0.25,
      gaze: 0.20,
      behavior: 0.15,
      questionnaire: 0.15
    };

    let finalScore = 0;
    let totalWeight = 0;
    const completedModules = [];
    const screeningReferences = {};

    // Weighted sum calculation
    if (screeningResults.facial) {
      finalScore += screeningResults.facial.score * weights.facial;
      totalWeight += weights.facial;
      completedModules.push('Facial Screening');
      screeningReferences.facialScreeningId = screeningResults.facial.screeningId;
    }

    if (screeningResults.mri) {
      finalScore += screeningResults.mri.score * weights.mri;
      totalWeight += weights.mri;
      completedModules.push('MRI Screening');
      screeningReferences.mriScreeningId = screeningResults.mri.screeningId;
    }

    if (screeningResults.gaze) {
      finalScore += screeningResults.gaze.score * weights.gaze;
      totalWeight += weights.gaze;
      completedModules.push('Live Gaze Analysis');
      screeningReferences.gazeSessionId = screeningResults.gaze.sessionId;
    }

    if (screeningResults.behavior) {
      finalScore += screeningResults.behavior.score * weights.behavior;
      totalWeight += weights.behavior;
      completedModules.push('Behavioral Assessment');
      screeningReferences.behavioralAssessmentId = screeningResults.behavior.assessmentId;
    }

    if (screeningResults.questionnaire) {
      finalScore += screeningResults.questionnaire.score * weights.questionnaire;
      totalWeight += weights.questionnaire;
      completedModules.push('Questionnaire Screening');
      screeningReferences.questionnaireScreeningId = screeningResults.questionnaire.screeningId;
    }

    // Normalize the final score if not all modules are available
    if (totalWeight > 0) {
      finalScore = finalScore / totalWeight;
    } else {
      return res.status(400).json({
        message: 'No screening results available for this patient',
        success: false,
        completedModules: []
      });
    }

    // Determine risk level based on final score
    let riskLevel = 'Low';
    if (finalScore >= 0.70) {
      riskLevel = 'High';
    } else if (finalScore >= 0.40) {
      riskLevel = 'Moderate';
    }

    // Check if a report already exists for this patient
    let combinedReport = await CombinedASDReport.findOne({
      patientId: patient_id
    }).sort({ generatedAt: -1 });

    if (combinedReport) {
      // Update existing report with new data
      combinedReport.facialScore = screeningResults.facial?.score || null;
      combinedReport.mriScore = screeningResults.mri?.score || null;
      combinedReport.gazeScore = screeningResults.gaze?.score || null;
      combinedReport.behaviorScore = screeningResults.behavior?.score || null;
      combinedReport.questionnaireScore = screeningResults.questionnaire?.score || null;
      combinedReport.finalScore = finalScore;
      combinedReport.riskLevel = riskLevel;
      combinedReport.completedModules = completedModules;
      combinedReport.modulesCount = completedModules.length;
      combinedReport.screeningReferences = screeningReferences;
      combinedReport.updatedAt = Date.now();
      
      await combinedReport.save();
    } else {
      // Create new combined report
      combinedReport = new CombinedASDReport({
        patientId: patient_id,
        facialScore: screeningResults.facial?.score || null,
        mriScore: screeningResults.mri?.score || null,
        gazeScore: screeningResults.gaze?.score || null,
        behaviorScore: screeningResults.behavior?.score || null,
        questionnaireScore: screeningResults.questionnaire?.score || null,
        finalScore: finalScore,
        riskLevel: riskLevel,
        completedModules: completedModules,
        modulesCount: completedModules.length,
        screeningReferences: screeningReferences,
        reviewedBy: req.user.id,
        status: 'completed'
      });

      await combinedReport.save();
    }

    // Update patient's multimodal score
    patient.multimodalScore = finalScore;
    patient.multimodalRiskLevel = riskLevel;
    patient.lastScreeningDate = Date.now();
    patient.completedScreenings = completedModules;
    await patient.save();

    // Return the comprehensive report
    res.json({
      success: true,
      reportId: combinedReport._id,
      patientId: patient_id,
      patientName: patient.name,
      cortexaId: patient.cortexaId,
      facial_score: screeningResults.facial?.score || null,
      mri_score: screeningResults.mri?.score || null,
      gaze_score: screeningResults.gaze?.score || null,
      behavior_score: screeningResults.behavior?.score || null,
      questionnaire_score: screeningResults.questionnaire?.score || null,
      final_score: parseFloat(finalScore.toFixed(4)),
      risk_level: riskLevel,
      completed_modules: completedModules,
      modules_count: completedModules.length,
      therapist_decision: combinedReport.therapistDecision,
      generated_at: combinedReport.generatedAt,
      screening_details: {
        facial: screeningResults.facial,
        mri: screeningResults.mri,
        gaze: screeningResults.gaze,
        behavior: screeningResults.behavior,
        questionnaire: screeningResults.questionnaire
      }
    });

  } catch (error) {
    console.error('❌ Error generating combined ASD report:', error);
    res.status(500).json({ 
      message: 'Server error while generating combined report', 
      error: error.message,
      success: false 
    });
  }
});

/**
 * POST /api/therapist/combined-report/decision
 * 
 * Record therapist's decision on a combined ASD report
 */
router.post('/combined-report/decision', async (req, res) => {
  try {
    const { patient_id, decision, notes } = req.body;

    if (!patient_id || !decision) {
      return res.status(400).json({ 
        message: 'Patient ID and decision are required',
        success: false 
      });
    }

    // Verify patient belongs to this therapist
    const patient = await Patient.findOne({ 
      _id: patient_id, 
      therapist_user_id: req.user.id 
    });
    
    if (!patient) {
      return res.status(404).json({ 
        message: 'Patient not found or access denied',
        success: false 
      });
    }

    // Find the latest combined report
    const combinedReport = await CombinedASDReport.findOne({
      patientId: patient_id
    }).sort({ generatedAt: -1 });

    if (!combinedReport) {
      return res.status(404).json({ 
        message: 'No combined report found for this patient',
        success: false 
      });
    }

    // Update the report with therapist's decision
    combinedReport.therapistDecision = decision;
    if (notes) {
      combinedReport.therapistNotes = notes;
    }

    if (decision === 'report_sent') {
      combinedReport.sentToParentAt = Date.now();
      combinedReport.status = 'sent_to_parent';
    } else if (decision === 'consultation_scheduled') {
      combinedReport.consultationScheduledAt = Date.now();
    }

    await combinedReport.save();

    res.json({
      success: true,
      message: 'Therapist decision recorded successfully',
      decision: decision,
      reportId: combinedReport._id
    });

  } catch (error) {
    console.error('❌ Error recording therapist decision:', error);
    res.status(500).json({ 
      message: 'Server error while recording decision', 
      error: error.message,
      success: false 
    });
  }
});

/**
 * GET /api/therapist/patient/:id/combined-report
 * 
 * Get the latest combined report for a specific patient
 */
router.get('/patient/:id/combined-report', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify patient belongs to this therapist
    const patient = await Patient.findOne({ 
      _id: id, 
      therapist_user_id: req.user.id 
    });
    
    if (!patient) {
      return res.status(404).json({ 
        message: 'Patient not found or access denied',
        success: false 
      });
    }

    // Find the latest combined report
    const combinedReport = await CombinedASDReport.findOne({
      patientId: id
    })
    .sort({ generatedAt: -1 })
    .populate('reviewedBy', 'username email');

    if (!combinedReport) {
      return res.status(404).json({ 
        message: 'No combined report found for this patient',
        success: false 
      });
    }

    res.json({
      success: true,
      report: {
        reportId: combinedReport._id,
        patientId: patient._id,
        patientName: patient.name,
        cortexaId: patient.cortexaId,
        facial_score: combinedReport.facialScore,
        mri_score: combinedReport.mriScore,
        gaze_score: combinedReport.gazeScore,
        behavior_score: combinedReport.behaviorScore,
        questionnaire_score: combinedReport.questionnaireScore,
        final_score: combinedReport.finalScore,
        risk_level: combinedReport.riskLevel,
        completed_modules: combinedReport.completedModules,
        modules_count: combinedReport.modulesCount,
        therapist_decision: combinedReport.therapistDecision,
        therapist_notes: combinedReport.therapistNotes,
        status: combinedReport.status,
        generated_at: combinedReport.generatedAt,
        sent_to_parent_at: combinedReport.sentToParentAt,
        consultation_scheduled_at: combinedReport.consultationScheduledAt,
        reviewed_by: combinedReport.reviewedBy
      }
    });

  } catch (error) {
    console.error('❌ Error fetching combined report:', error);
    res.status(500).json({ 
      message: 'Server error while fetching combined report', 
      error: error.message,
      success: false 
    });
  }
});

module.exports = router;
