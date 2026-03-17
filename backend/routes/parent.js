const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { spawn } = require('child_process');
const path = require('path');
const { verifyToken, parentCheck, requireOwnership, requireResourceAccess } = require('../middlewares/auth');
const User = require('../models/user');
const Patient = require('../models/patient');
const Report = require('../models/report');
const Appointment = require('../models/appointment');
const Slot = require('../models/slot');
const MoodCheckIn = require('../models/MoodCheckIn');
const CareTeamMember = require('../models/CareTeamMember');
const ParentTherapistQuery = require('../models/ParentTherapistQuery');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get available slots (no auth required for testing)
router.get('/available-slots-public', async (req, res) => {
  try {
    const { therapistId, date } = req.query;
    
    if (!therapistId || !date) {
      return res.status(400).json({ message: 'Therapist ID and date are required' });
    }
    
    // Parse date string (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    console.log('Available slots request (public):', { therapistId, date, startOfDay, endOfDay });
    
    let slot = null;
    
    if (mongoose.Types.ObjectId.isValid(therapistId)) {
      slot = await Slot.findOne({
        therapistId: new mongoose.Types.ObjectId(therapistId),
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        isActive: true
      });
    }
    
    if (slot) {
      const generateTimeSlots = (startTime, endTime, intervalMinutes, breakTimeMinutes) => {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        let current = new Date(start);
        
        while (current < end) {
          const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
          if (slotEnd <= end) {
            slots.push({ start: current.toTimeString().slice(0, 5), end: slotEnd.toTimeString().slice(0, 5) });
          }
          current = new Date(slotEnd.getTime() + breakTimeMinutes * 60000);
        }
        
        return slots;
      };
      
      const availableSlots = generateTimeSlots(slot.startTime, slot.endTime, slot.intervalMinutes, slot.breakTimeMinutes);
      
      res.json({ availableSlots, slot });
    } else {
      res.json({ availableSlots: [] });
    }
  } catch (error) {
    console.error('Error in public available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Temporary endpoint to create sample slots for testing (no auth required)
router.post('/create-sample-slots', async (req, res) => {
  try {
    const therapists = await User.find({ role: 'therapist' });
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let slotsCreated = 0;
    
    for (const therapist of therapists) {
      // Check if therapist already has slots
      const therapistSlots = await Slot.find({ therapistId: therapist._id });
      
      if (therapistSlots.length === 0) {
        const sampleSlot = new Slot({
          therapistId: therapist._id,
          date: tomorrow,
          startTime: '09:00',
          endTime: '17:00',
          intervalMinutes: 30,
          breakTimeMinutes: 5,
          mode: 'In-person',
          hospitalClinicName: 'Sample Clinic',
          isActive: true
        });
        
        await sampleSlot.save();
        slotsCreated++;
      }
    }
    
    res.json({ 
      message: `Created ${slotsCreated} sample slots for ${therapists.length} therapists`,
      slotsCreated,
      totalTherapists: therapists.length
    });
  } catch (error) {
    console.error('Error creating sample slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available slots (public endpoint - before auth)
router.get('/available-slots', async (req, res) => {
  try {
    const { therapistId, date } = req.query;
    
    if (!therapistId || !date) {
      return res.status(400).json({ message: 'Therapist ID and date are required' });
    }
    
    // Parse date string (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    console.log('Available slots request:', { therapistId, date, startOfDay, endOfDay });
    
    let slot = null;
    
    if (mongoose.Types.ObjectId.isValid(therapistId)) {
      slot = await Slot.findOne({
        therapistId: new mongoose.Types.ObjectId(therapistId),
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        },
        isActive: true
      });
      console.log('Slot found:', slot ? 'Yes' : 'No');
    }
    
    if (slot) {
      const generateTimeSlots = (startTime, endTime, intervalMinutes, breakTimeMinutes) => {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        let current = new Date(start);
        
        while (current < end) {
          const slotEnd = new Date(current.getTime() + intervalMinutes * 60000);
          if (slotEnd <= end) {
            slots.push({ start: current.toTimeString().slice(0, 5), end: slotEnd.toTimeString().slice(0, 5) });
          }
          current = new Date(slotEnd.getTime() + breakTimeMinutes * 60000);
        }
        
        return slots;
      };
      
      const availableSlots = generateTimeSlots(slot.startTime, slot.endTime, slot.intervalMinutes, slot.breakTimeMinutes);
      console.log('Generated slots:', availableSlots.length);
      
      res.json({ availableSlots, slot });
    } else {
      console.log('No slot found for therapist:', therapistId, 'on date:', date);
      res.json({ availableSlots: [] });
    }
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// All routes require authentication and parent role
router.use(verifyToken);
router.use(parentCheck);

// Get parent's own profile
router.get('/profile', requireOwnership, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get parent's children (only their own children)
router.get('/children', verifyToken, async (req, res) => {
  try {
    console.log('GET /children - User ID:', req.user.id);
    const children = await Patient.find({ parent_id: req.user.id });
    console.log('GET /children - Found children:', children);
    res.json(children);
  } catch (error) {
    console.error('GET /children - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single child linked to this parent (convenience endpoint)
router.get('/child', verifyToken, async (req, res) => {
  try {
    const child = await Patient.findOne({ parent_id: req.user.id });
    if (!child) {
      return res.status(404).json({ message: 'No child linked to this parent found' });
    }
    res.json({
      id: child._id,
      name: child.name,
      age: child.age,
      gender: child.gender
    });
  } catch (error) {
    console.error('GET /child - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a new child
router.post('/children', verifyToken, async (req, res) => {
  try {
    console.log('POST /children - Request body:', req.body);
    console.log('POST /children - User:', req.user);
    
    const generatePatientId = () => {
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `PAT-${timestamp}-${randomPart}`;
    };

    const patientId = generatePatientId();
    const childData = {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      medical_history: req.body.medical_history,
      parent_id: req.user.id,
      patientId
    };
    console.log('POST /children - Child data to save:', childData);
    
    const child = new Patient(childData);
    await child.save();
    console.log('POST /children - Child saved successfully:', child);
    res.status(201).json(child);
  } catch (error) {
    console.error('POST /children - Error:', error.message, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a child
router.delete('/children/:childId', verifyToken, async (req, res) => {
  try {
    const child = await Patient.findOne({
      _id: req.params.childId,
      parent_id: req.user.id
    });

    if (!child) {
      return res.status(404).json({ message: 'Child not found.' });
    }

    await Patient.deleteOne({ _id: req.params.childId });
    res.json({ message: 'Child deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reports for parent's children only
router.get('/reports', requireResourceAccess('reports'), async (req, res) => {
  try {
    const reports = await Report.find({ parentId: req.user.id });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointments for parent's children
router.get('/appointments', verifyToken, async (req, res) => {
  try {
    const appointments = await Appointment.find({ parentId: req.user.id })
      .populate('childId', 'name')
      .populate('therapistId', 'username email')
      .sort({ appointmentDate: -1 });
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available therapists
router.get('/therapists', async (req, res) => {
  try {
    // Get ALL therapists that are not explicitly inactive
    const therapists = await User.find({ 
      role: 'therapist',
      $and: [
        {
          $or: [
            { status: 'approved' },
            { status: 'Active' },
            { status: 'active' },
            { status: { $exists: false } },
            { status: null }
          ]
        },
        {
          $or: [
            { isActive: { $ne: false } },
            { isActive: { $exists: false } },
            { isActive: null }
          ]
        }
      ]
    }).select('_id username email specialty status isActive');
    
    console.log('GET /therapists - Found therapists:', therapists.length);
    console.log('Therapist details:', therapists.map(t => ({
      id: t._id,
      username: t.username,
      email: t.email,
      status: t.status,
      isActive: t.isActive
    })));
    
    res.json(therapists);
  } catch (error) {
    console.error('GET /therapists - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get care team for a specific child
router.get('/care-team', verifyToken, async (req, res) => {
  try {
    const { childId } = req.query;

    if (!childId) {
      return res.status(400).json({ message: 'childId is required' });
    }

    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id }).select('_id');
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied.' });
    }

    const careTeam = await CareTeamMember.find({
      parentId: req.user.id,
      childId,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(careTeam);
  } catch (error) {
    console.error('GET /care-team - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add therapist to care team for a child
router.post('/care-team', verifyToken, async (req, res) => {
  try {
    const { childId, therapistId } = req.body;

    if (!childId || !therapistId) {
      return res.status(400).json({ message: 'childId and therapistId are required' });
    }

    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id }).select('name');
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied.' });
    }

    const therapist = await User.findOne({
      _id: therapistId,
      role: 'therapist',
      $and: [
        {
          $or: [
            { status: 'approved' },
            { status: 'Active' },
            { status: 'active' },
            { status: { $exists: false } },
            { status: null }
          ]
        },
        {
          $or: [
            { isActive: { $ne: false } },
            { isActive: { $exists: false } },
            { isActive: null }
          ]
        }
      ]
    }).select('username email specialty phone');

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found or not available.' });
    }

    const existing = await CareTeamMember.findOne({
      parentId: req.user.id,
      childId,
      therapistId: therapist._id
    });

    if (existing && existing.isActive) {
      // Return the existing record so clients can reconcile stale UI state.
      return res.status(200).json(existing);
    }

    // If provider was previously removed (soft delete), reactivate it.
    if (existing && !existing.isActive) {
      existing.isActive = true;
      existing.name = therapist.username || therapist.email;
      existing.role = 'Therapist';
      existing.specialty = therapist.specialty || existing.specialty || 'ASD Therapy & Support';
      existing.location = existing.location || 'CORTEXA Therapy Center';
      existing.phone = therapist.phone || existing.phone || '(555) 000-0000';
      existing.email = therapist.email;
      await existing.save();

      return res.status(200).json(existing);
    }

    const careTeamMember = await CareTeamMember.create({
      parentId: req.user.id,
      childId,
      therapistId: therapist._id,
      name: therapist.username || therapist.email,
      role: 'Therapist',
      specialty: therapist.specialty || 'ASD Therapy & Support',
      location: 'CORTEXA Therapy Center',
      phone: therapist.phone || '(555) 000-0000',
      email: therapist.email
    });

    res.status(201).json(careTeamMember);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Provider is already in this child\'s care team.' });
    }
    console.error('POST /care-team - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update care team provider details
router.put('/care-team/:memberId', verifyToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { name, role, specialty, location, phone, email } = req.body;

    const member = await CareTeamMember.findOne({
      _id: memberId,
      parentId: req.user.id,
      isActive: true
    });

    if (!member) {
      return res.status(404).json({ message: 'Care team member not found.' });
    }

    member.name = name || member.name;
    member.role = role || member.role;
    member.specialty = specialty || member.specialty;
    member.location = location || member.location;
    member.phone = phone || member.phone;
    member.email = email || member.email;

    await member.save();
    res.json(member);
  } catch (error) {
    console.error('PUT /care-team/:memberId - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove provider from care team (soft delete)
router.delete('/care-team/:memberId', verifyToken, async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await CareTeamMember.findOne({
      _id: memberId,
      parentId: req.user.id,
      isActive: true
    });

    if (!member) {
      return res.status(404).json({ message: 'Care team member not found.' });
    }

    member.isActive = false;
    await member.save();

    res.json({ message: 'Provider removed from care team.' });
  } catch (error) {
    console.error('DELETE /care-team/:memberId - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send secure message from parent to therapist via care team
router.post('/care-team/:memberId/messages', verifyToken, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { childId, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }

    const member = await CareTeamMember.findOne({
      _id: memberId,
      parentId: req.user.id,
      isActive: true
    });

    if (!member) {
      return res.status(404).json({ message: 'Care team member not found.' });
    }

    // Child must match selected child if provided
    if (childId && String(member.childId) !== String(childId)) {
      return res.status(400).json({ message: 'Care team member does not belong to selected child.' });
    }

    const child = await Patient.findOne({ _id: member.childId, parent_id: req.user.id }).select('_id');
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied.' });
    }

    const query = await ParentTherapistQuery.create({
      parentId: req.user.id,
      childId: member.childId,
      therapistId: member.therapistId,
      careTeamMemberId: member._id,
      subject: String(subject).trim(),
      message: String(message).trim(),
      status: 'unread'
    });

    res.status(201).json({
      message: 'Secure message sent successfully.',
      query
    });
  } catch (error) {
    console.error('POST /care-team/:memberId/messages - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get message/query history (including therapist replies) for a child
router.get('/care-team/messages', verifyToken, async (req, res) => {
  try {
    const { childId } = req.query;

    if (!childId) {
      return res.status(400).json({ message: 'childId is required' });
    }

    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id }).select('_id');
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied.' });
    }

    const messages = await ParentTherapistQuery.find({
      parentId: req.user.id,
      childId
    })
      .populate('careTeamMemberId', 'name role email')
      .sort({ createdAt: -1 })
      .limit(200);

    const normalized = messages.map((item) => ({
      _id: item._id,
      subject: item.subject,
      message: item.message,
      status: item.status,
      readAt: item.readAt,
      createdAt: item.createdAt,
      provider: {
        _id: item.careTeamMemberId?._id,
        name: item.careTeamMemberId?.name || 'Therapist',
        role: item.careTeamMemberId?.role || 'Therapist',
        email: item.careTeamMemberId?.email || null,
      },
      replies: Array.isArray(item.replies) ? item.replies : []
    }));

    res.json(normalized);
  } catch (error) {
    console.error('GET /care-team/messages - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reply to an existing parent-therapist message thread
router.post('/care-team/messages/:queryId/reply', verifyToken, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(queryId)) {
      return res.status(400).json({ message: 'Invalid query id.' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Reply message is required.' });
    }

    const query = await ParentTherapistQuery.findOne({
      _id: queryId,
      parentId: req.user.id
    });

    if (!query) {
      return res.status(404).json({ message: 'Message thread not found.' });
    }

    query.replies = Array.isArray(query.replies) ? query.replies : [];
    query.replies.push({
      senderRole: 'parent',
      senderId: req.user.id,
      message: String(message).trim(),
      createdAt: new Date()
    });

    // Mark as unread for therapist to surface the latest parent follow-up.
    query.status = 'unread';
    query.readAt = null;

    await query.save();

    res.status(201).json({
      message: 'Reply sent successfully.',
      query
    });
  } catch (error) {
    console.error('POST /care-team/messages/:queryId/reply - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Book appointment
router.post('/appointments', verifyToken, async (req, res) => {
  try {
    const { childId, therapistId: therapistIdentifier, appointmentDate, appointmentTime, reason } = req.body;
    const normalizedTherapistIdentifier = typeof therapistIdentifier === 'string' ? therapistIdentifier.trim() : therapistIdentifier;
    
    console.log('POST /appointments - Request body:', req.body);
    console.log('POST /appointments - User ID:', req.user.id);

    if (!childId || !normalizedTherapistIdentifier || !appointmentDate || !appointmentTime) {
      console.log('POST /appointments - Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the child belongs to this parent
    const child = await Patient.findOne({ 
      _id: childId, 
      parent_id: req.user.id 
    });
    
    console.log('POST /appointments - Found child:', child);
    
    if (!child) {
      return res.status(403).json({ message: 'Access denied. Child not found or not yours.' });
    }

    // Verify therapist exists and is active (try both by ID and by email)
    let therapist = null;

    if (normalizedTherapistIdentifier && mongoose.Types.ObjectId.isValid(normalizedTherapistIdentifier)) {
      therapist = await User.findOne({
        _id: normalizedTherapistIdentifier,
        role: 'therapist',
        $and: [
          {
            $or: [
              { status: 'approved' },
              { status: 'Active' },
              { status: 'active' },
              { status: { $exists: false } },
              { status: null }
            ]
          },
          {
            $or: [
              { isActive: { $ne: false } },
              { isActive: { $exists: false } },
              { isActive: null }
            ]
          }
        ]
      });
    }

    if (!therapist && normalizedTherapistIdentifier) {
      therapist = await User.findOne({
        $and: [
          {
            $or: [
              { email: normalizedTherapistIdentifier },
              { username: normalizedTherapistIdentifier }
            ]
          },
          {
            role: 'therapist',
            $and: [
              {
                $or: [
                  { status: 'approved' },
                  { status: 'Active' },
                  { status: 'active' },
                  { status: { $exists: false } },
                  { status: null }
                ]
              },
              {
                $or: [
                  { isActive: { $ne: false } },
                  { isActive: { $exists: false } },
                  { isActive: null }
                ]
              }
            ]
          }
        ]
      });
    }

    console.log('POST /appointments - Found therapist:', therapist);

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found or not available.' });
    }

    // Parse appointment date (YYYY-MM-DD) as local date, not UTC
    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Create appointment
    const appointment = new Appointment({
      parentId: req.user.id,
      childId,
      therapistId: therapist._id,
      appointmentDate: appointmentDateObj,
      appointmentTime,
      reason,
      status: 'pending'
    });

    console.log('POST /appointments - Appointment to save:', {
      parentId: appointment.parentId,
      childId: appointment.childId,
      therapistId: appointment.therapistId,
      therapistId_type: typeof appointment.therapistId,
      'therapist._id': therapist._id,
      'therapist._id_type': typeof therapist._id,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status
    });

    await appointment.save();
    await appointment.populate('childId', 'name');
    await appointment.populate('therapistId', 'username email');

    console.log('POST /appointments - Successfully saved appointment:', {
      _id: appointment._id,
      therapistId: appointment.therapistId._id,
      childName: appointment.childId.name,
      status: appointment.status,
      date: appointment.appointmentDate
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('POST /appointments - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update appointment status
router.put('/appointments/:appointmentId', verifyToken, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      parentId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (req.body.status) {
      appointment.status = req.body.status;
    }
    if (req.body.notes) {
      appointment.notes = req.body.notes;
    }

    await appointment.save();
    await appointment.populate('childId', 'name');
    await appointment.populate('therapistId', 'username email');

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel appointment
router.delete('/appointments/:appointmentId', verifyToken, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      parentId: req.user.id
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activity for parent
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const [appointments, messages] = await Promise.all([
      Appointment.find({ parentId: req.user.id })
        .populate('childId', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
      ParentTherapistQuery.find({ parentId: req.user.id, status: 'replied' })
        .populate('childId', 'name')
        .populate('careTeamMemberId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10)
    ]);
    
    const appointmentActivity = appointments.map(apt => ({
      id: apt._id,
      type: 'appointment_booked',
      message: `Appointment booked for ${apt.childId?.name || 'Child'}`,
      date: apt.createdAt,
      childId: apt.childId?._id,
      childName: apt.childId?.name,
      status: apt.status
    }));

    const messageActivity = messages.map(msg => ({
      id: msg._id,
      type: 'therapist_reply',
      message: `New reply from ${msg.careTeamMemberId?.name || 'Therapist'} for ${msg.childId?.name || 'Child'}`,
      date: msg.updatedAt,
      childId: msg.childId?._id,
      childName: msg.childId?.name,
      subject: msg.subject
    }));
    
    const combinedActivity = [...appointmentActivity, ...messageActivity]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json(combinedActivity);
  } catch (error) {
    console.error('GET /activity - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save mood/behavior check-in for a child
router.post('/mood-checkin', verifyToken, async (req, res) => {
  try {
    const { childId, mood, attention, sleep } = req.body;

    if (!childId || !mood || !attention || !sleep) {
      return res.status(400).json({ message: 'childId, mood, attention, and sleep are required.' });
    }

    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id });
    if (!child) {
      return res.status(404).json({ message: 'Child not found.' });
    }

    const checkIn = await MoodCheckIn.create({
      parentId: req.user.id,
      childId,
      mood,
      attention,
      sleep
    });

    res.status(201).json(checkIn);
  } catch (error) {
    console.error('POST /mood-checkin - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get latest mood/behavior check-in for a child
router.get('/mood-checkin/:childId/latest', verifyToken, async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id });
    if (!child) {
      return res.status(404).json({ message: 'Child not found.' });
    }

    const latest = await MoodCheckIn.findOne({
      parentId: req.user.id,
      childId
    }).sort({ createdAt: -1 });

    if (!latest) {
      return res.json(null);
    }

    res.json(latest);
  } catch (error) {
    console.error('GET /mood-checkin/:childId/latest - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============== SURVEY INSIGHTS ROUTES ==============

router.post('/predict-survey', verifyToken, async (req, res) => {
  try {
    const { answers, patientId } = req.body; // NEW: Accept patientId

    if (!answers) {
      return res.status(400).json({ error: 'Survey answers are required' });
    }

    const pythonBin = process.env.PYTHON_BIN || 'python';
    const workerPath = path.join(__dirname, '..', 'predict_survey.py');
    const trackScreening = require('../utils/trackScreening'); // NEW: Import tracking

    let stdoutData = '';
    let stderrData = '';

    const child = spawn(pythonBin, [workerPath, JSON.stringify(answers)], { stdio: ['ignore', 'pipe', 'pipe'] });

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
        error: 'Failed to run prediction',
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
        console.log('✅ Survey Prediction Success:', result);
        
        // NEW: Track questionnaire screening
        const resultScore = result.probability || result.risk_score || 0.5;
        trackScreening({
          patientId: patientId || null,
          userId: req.user?.id || null,
          screeningType: 'questionnaire',
          resultScore: resultScore,
          resultLabel: result.prediction || result.diagnosis || 'Unknown',
          confidenceScore: result.confidence || resultScore,
          questionnaireAnswers: answers
        });
        
        res.json(result);
      } catch (parseErr) {
        console.error('Failed to parse prediction output:', stdoutData);
        res.status(500).json({ error: 'Failed to parse prediction result' });
      }
    });
  } catch (error) {
    console.error('POST /predict-survey - Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// ============== PAYMENT ROUTES ==============

// Create payment order (Dummy)
router.post('/create-payment-order', verifyToken, async (req, res) => {
  try {
    const { childId, therapistId: therapistIdentifier, appointmentDate, appointmentTime, reason, appointmentFee } = req.body;
    const normalizedTherapistIdentifier = typeof therapistIdentifier === 'string' ? therapistIdentifier.trim() : therapistIdentifier;
    
    console.log('POST /create-payment-order - Request body:', req.body);

    if (!childId || !normalizedTherapistIdentifier || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the child belongs to this parent
    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id });
    if (!child) {
      return res.status(403).json({ message: 'Access denied. Child not found or not yours.' });
    }

    // Verify therapist exists
    let therapist = await User.findOne({ _id: normalizedTherapistIdentifier, role: 'therapist' });
    if (!therapist) {
      therapist = await User.findOne({ email: normalizedTherapistIdentifier, role: 'therapist' });
    }

    if (!therapist) {
      return res.status(404).json({ message: 'Therapist not found or not available.' });
    }

    const [year, month, day] = appointmentDate.split('-').map(Number);
    const appointmentDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Create temporary appointment
    const tempAppointment = new Appointment({
      parentId: req.user.id,
      childId,
      therapistId: therapist._id,
      appointmentDate: appointmentDateObj,
      appointmentTime,
      reason,
      status: 'pending',
      paymentStatus: 'initiated',
      appointmentFee: appointmentFee || 500
    });

    await tempAppointment.save();

    // Create Razorpay order
    const amountInPaise = (appointmentFee || 500) * 100; // Convert to paise
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `appointment_${tempAppointment._id}`,
      notes: {
        appointmentId: tempAppointment._id.toString(),
        childId: child._id.toString(),
        therapistId: therapist._id.toString(),
        parentId: req.user.id
      }
    });

    console.log('Razorpay order created:', razorpayOrder.id);

    res.json({
      orderId: razorpayOrder.id,
      appointmentId: tempAppointment._id,
      amount: appointmentFee || 500,
      keyId: process.env.RAZORPAY_KEY_ID,
      therapistName: therapist.username,
      childName: child.name,
      appointmentDate,
      appointmentTime
    });
  } catch (error) {
    console.error('POST /create-payment-order - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify payment and confirm appointment
router.post('/verify-payment', verifyToken, async (req, res) => {
  try {
    const { appointmentId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Missing appointment ID' });
    }

    const appointment = await Appointment.findOne({ _id: appointmentId, parentId: req.user.id });
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Verify Razorpay signature
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        console.error('❌ Invalid payment signature');
        return res.status(400).json({ 
          success: false,
          message: 'Invalid payment signature' 
        });
      }
      
      console.log('✅ Payment signature verified successfully!');
      
      // Update appointment with payment details
      appointment.paymentStatus = 'completed';
      appointment.razorpayOrderId = razorpay_order_id;
      appointment.razorpayPaymentId = razorpay_payment_id;
      appointment.paymentDate = new Date();
      appointment.status = 'confirmed';
    } else {
      // For backward compatibility or testing (dummy payment)
      appointment.paymentStatus = 'completed';
      appointment.razorpayPaymentId = `pay_dummy_${Date.now()}`;
      appointment.paymentDate = new Date();
      appointment.status = 'confirmed';
    }
    
    await appointment.save();
    await appointment.populate('childId', 'name');
    await appointment.populate('therapistId', 'username email');

    res.json({
      success: true,
      message: 'Payment verified successfully. Appointment confirmed!',
      appointment,
      paymentStatus: 'completed'
    });
  } catch (error) {
    console.error('POST /verify-payment - Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========================================
// ATTENTION GAME ROUTES
// ========================================

const AttentionGameResult = require('../models/AttentionGameResult');

// Save attention game result
router.post('/attention-games/result', verifyToken, parentCheck, async (req, res) => {
  try {
    const {
      childId,
      gameId,
      gameName,
      score,
      accuracy,
      reactionTime,
      completionTime,
      mistakes,
      attentionScore,
      attentionLevel
    } = req.body;

    // Verify that the child belongs to this parent
    const child = await Patient.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Check if the child belongs to the parent
    const parent = await User.findById(req.user.id);
    if (!parent || child.parent_id.toString() !== parent._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to save results for this child' });
    }

    // Create new game result
    const gameResult = new AttentionGameResult({
      childId,
      gameId,
      gameName,
      score,
      accuracy,
      reactionTime: parseFloat(reactionTime),
      completionTime: parseFloat(completionTime),
      mistakes,
      attentionScore,
      attentionLevel
    });

    await gameResult.save();

    res.status(201).json(gameResult);
  } catch (error) {
    console.error('Error saving attention game result:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attention game history for a child
router.get('/attention-games/history/:childId', verifyToken, parentCheck, async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify that the child belongs to this parent
    const child = await Patient.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const parent = await User.findById(req.user.id);
    if (!parent || child.parent_id.toString() !== parent._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to view results for this child' });
    }

    // Get all game results for this child, sorted by most recent first
    const gameHistory = await AttentionGameResult.find({ childId })
      .sort({ playedAt: -1 })
      .limit(50); // Limit to last 50 games

    res.json(gameHistory);
  } catch (error) {
    console.error('Error fetching attention game history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attention game statistics for a child
router.get('/attention-games/stats/:childId', verifyToken, parentCheck, async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify that the child belongs to this parent
    const child = await Patient.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const parent = await User.findById(req.user.id);
    if (!parent || child.parent_id.toString() !== parent._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to view stats for this child' });
    }

    // Get statistics
    const allResults = await AttentionGameResult.find({ childId });

    if (allResults.length === 0) {
      return res.json({
        totalGames: 0,
        averageAccuracy: 0,
        averageAttentionScore: 0,
        mostPlayedGame: null,
        recentAttentionLevel: null
      });
    }

    const totalGames = allResults.length;
    const averageAccuracy = allResults.reduce((sum, r) => sum + r.accuracy, 0) / totalGames;
    const averageAttentionScore = allResults.reduce((sum, r) => sum + r.attentionScore, 0) / totalGames;

    // Find most played game
    const gameCounts = {};
    allResults.forEach(r => {
      gameCounts[r.gameName] = (gameCounts[r.gameName] || 0) + 1;
    });
    const mostPlayedGame = Object.keys(gameCounts).reduce((a, b) => 
      gameCounts[a] > gameCounts[b] ? a : b
    );

    // Get most recent attention level
    const recentResult = allResults.sort((a, b) => b.playedAt - a.playedAt)[0];
    const recentAttentionLevel = recentResult.attentionLevel;

    res.json({
      totalGames,
      averageAccuracy: Math.round(averageAccuracy),
      averageAttentionScore: Math.round(averageAttentionScore),
      mostPlayedGame,
      recentAttentionLevel
    });
  } catch (error) {
    console.error('Error fetching attention game stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
