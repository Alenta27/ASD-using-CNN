const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Screening = require('../models/screening');
const Patient = require('../models/patient');
const Report = require('../models/report');
const sendEmail = require('../utils/email');
const { verifyToken, adminCheck } = require('../middlewares/auth');

// GET /api/admin/metrics - Real database-driven dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Count users with pending status (Pending Approvals)
    const pendingCount = await User.countDocuments({
      status: 'pending'
    });

    // Count all active users (Total Active Users)
    const activeUserCount = await User.countDocuments({
      isActive: true,
      status: { $ne: 'rejected' }
    });

    // Get screenings for current month (Screenings This Month)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

    const screeningsThisMonth = await Screening.countDocuments({
      createdAt: {
        $gte: firstDayOfMonth,
        $lt: firstDayOfNextMonth
      }
    });

    // Get total screenings ever (All Screenings)
    const totalScreenings = await Screening.countDocuments({});

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingCount,
        totalActiveUsers: activeUserCount,
        screeningsThisMonth: screeningsThisMonth,
        totalScreenings: totalScreenings
      }
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin metrics',
      details: error.message
    });
  }
});

// GET /api/admin/screenings - Live screening list for All Screenings page
router.get('/screenings', async (req, res) => {
  try {
    const screenings = await Screening.find({})
      .sort({ createdAt: -1 })
      .populate('patientId', 'name parent_id')
      .lean();

    const parentIds = screenings
      .map((s) => s?.patientId?.parent_id)
      .filter(Boolean);

    const parents = parentIds.length
      ? await User.find({ _id: { $in: parentIds } }).select('_id username name email').lean()
      : [];

    const parentMap = parents.reduce((acc, parent) => {
      acc[String(parent._id)] = parent;
      return acc;
    }, {});

    const normalizeRiskLevel = (screening) => {
      const fromLabel = String(screening?.resultLabel || '').toLowerCase();
      const fromLegacy = String(screening?.result || '').toLowerCase();

      if (fromLabel.includes('high') || fromLegacy.includes('high')) return 'High';
      if (fromLabel.includes('medium') || fromLabel.includes('moderate') || fromLegacy.includes('medium')) return 'Medium';
      if (fromLabel.includes('low') || fromLabel.includes('no asd') || fromLegacy.includes('low')) return 'Low';
      return 'Unknown';
    };

    const normalizeStatus = (status) => {
      const value = String(status || '').toLowerCase();
      if (value === 'completed') return 'Completed';
      if (value === 'in-progress') return 'In Progress';
      if (value === 'failed') return 'Failed';
      return 'Pending';
    };

    const data = screenings.map((screening) => {
      const patient = screening.patientId;
      const parent = patient?.parent_id ? parentMap[String(patient.parent_id)] : null;

      return {
        id: String(screening._id),
        childName: patient?.name || screening.childName || 'Unknown Child',
        parentName: parent?.name || parent?.username || parent?.email || 'Unknown Parent',
        type: screening.screeningType || 'Screening',
        date: new Date(screening.createdAt).toISOString().split('T')[0],
        riskLevel: normalizeRiskLevel(screening),
        status: normalizeStatus(screening.status)
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching screenings list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch screenings', details: error.message });
  }
});

// GET /api/admin/screenings/:id - View screening details
router.get('/screenings/:id', verifyToken, adminCheck, async (req, res) => {
  try {
    const screening = await Screening.findById(req.params.id)
      .populate({ path: 'patientId', populate: { path: 'parent_id', select: 'username name email' } })
      .lean();

    if (!screening) {
      return res.status(404).json({ success: false, error: 'Screening not found' });
    }

    const patient = screening.patientId;
    const parent = patient?.parent_id;

    res.json({
      success: true,
      data: {
        id: String(screening._id),
        childName: patient?.name || screening.childName || 'Unknown Child',
        parentName: parent?.name || parent?.username || parent?.email || 'Unknown Parent',
        type: screening.screeningType || 'Screening',
        date: screening.createdAt,
        status: screening.status || 'pending',
        resultLabel: screening.resultLabel || null,
        resultScore: screening.resultScore ?? null,
        confidenceScore: screening.confidenceScore ?? null,
        notes: screening.notes || '',
        raw: screening
      }
    });
  } catch (error) {
    console.error('Error fetching screening details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch screening details', details: error.message });
  }
});

// DELETE /api/admin/screenings/:id - Delete screening
router.delete('/screenings/:id', verifyToken, adminCheck, async (req, res) => {
  try {
    const deleted = await Screening.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Screening not found' });
    }

    res.json({ success: true, message: 'Screening deleted successfully' });
  } catch (error) {
    console.error('Error deleting screening:', error);
    res.status(500).json({ success: false, error: 'Failed to delete screening', details: error.message });
  }
});

// GET /api/admin/screenings/:id/download - Download screening report as JSON
router.get('/screenings/:id/download', verifyToken, adminCheck, async (req, res) => {
  try {
    const screening = await Screening.findById(req.params.id)
      .populate({ path: 'patientId', populate: { path: 'parent_id', select: 'username name email' } })
      .lean();

    if (!screening) {
      return res.status(404).json({ success: false, error: 'Screening not found' });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      screeningId: String(screening._id),
      childName: screening.patientId?.name || screening.childName || 'Unknown Child',
      parentName: screening.patientId?.parent_id?.name || screening.patientId?.parent_id?.username || screening.patientId?.parent_id?.email || 'Unknown Parent',
      screeningType: screening.screeningType || 'Screening',
      status: screening.status || 'pending',
      resultLabel: screening.resultLabel || null,
      resultScore: screening.resultScore ?? null,
      confidenceScore: screening.confidenceScore ?? null,
      notes: screening.notes || '',
      createdAt: screening.createdAt,
      updatedAt: screening.updatedAt
    };

    const fileName = `screening-report-${String(screening._id)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('Error downloading screening report:', error);
    res.status(500).json({ success: false, error: 'Failed to download screening report', details: error.message });
  }
});

// GET /api/admin/user-breakdown - Live user role counts for pie chart
router.get('/user-breakdown', async (req, res) => {
  try {
    const roles = ['parent', 'therapist', 'teacher', 'researcher'];
    const counts = await Promise.all(
      roles.map(role =>
        User.countDocuments({ role, isActive: true, status: { $ne: 'rejected' } })
      )
    );
    const pendingCount = await User.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: [
        { name: 'Parents', value: counts[0] },
        { name: 'Therapists', value: counts[1] },
        { name: 'Teachers', value: counts[2] },
        { name: 'Researchers', value: counts[3] },
        { name: 'Pending', value: pendingCount },
      ].filter(d => d.value > 0) // Only show roles that exist
    });
  } catch (error) {
    console.error('Error fetching user breakdown:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user breakdown' });
  }
});


// Legacy endpoint for backward compatibility
router.get('/stats', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Count all users with pending status (not just therapists)
    const pendingCount = await User.countDocuments({
      status: 'pending'
    });

    // Count all active users
    const userCount = await User.countDocuments({
      isActive: true
    });

    // Get screenings for current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);

    const screeningCount = await Screening.countDocuments({
      createdAt: {
        $gte: firstDayOfMonth,
        $lt: firstDayOfNextMonth
      }
    });

    res.json({
      pendingCount,
      userCount,
      screeningCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// GET /api/admin/screening-trends - Month-wise screening trends for the last 6 months
router.get('/screening-trends', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = January, 11 = December

    // Calculate the last 6 months ending with the current month
    const monthRanges = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Build date ranges for last 6 months (including current month)
    for (let i = 5; i >= 0; i--) {
      let monthToProcess = currentMonth - i;
      let yearToProcess = currentYear;

      // Handle negative months (previous years)
      if (monthToProcess < 0) {
        yearToProcess = currentYear - 1;
        monthToProcess = 12 + monthToProcess; // e.g., -1 becomes 11 (December)
      }

      const start = new Date(yearToProcess, monthToProcess, 1);
      const end = new Date(yearToProcess, monthToProcess + 1, 1); // First day of next month
      
      monthRanges.push({
        month: monthNames[monthToProcess],
        monthNumber: monthToProcess + 1, // 1-12 for MongoDB
        year: yearToProcess,
        start,
        end
      });
    }

    // Fetch all data in the range
    const startDate = monthRanges[0].start;
    const endDate = monthRanges[monthRanges.length - 1].end;

    // Use MongoDB aggregation for efficient counting
    const results = await Screening.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Create a map for easy lookup
    const countsMap = {};
    results.forEach(result => {
      const key = `${result._id.year}-${result._id.month}`;
      countsMap[key] = result.count;
    });

    // Build the response with proper labels
    const trendsData = monthRanges.map(range => {
      const key = `${range.year}-${range.monthNumber}`;
      return {
        month: range.month,
        screenings: countsMap[key] || 0
      };
    });

    res.json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Error fetching screening trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch screening trends',
      details: error.message
    });
  }
});

router.get('/therapist-requests', async (req, res) => {
  try {
    const pendingTherapists = await User.find({
      role: 'therapist',
      status: 'pending'
    }).select('-password -otp');

    res.json(pendingTherapists);
  } catch (error) {
    console.error('Error fetching therapist requests:', error);
    res.status(500).json({ error: 'Failed to fetch therapist requests', details: error.message });
  }
});

router.put('/therapist-requests/:userId/approve', verifyToken, adminCheck, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'therapist' || user.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid therapist request' });
    }

    user.status = 'approved';
    user.isActive = true;
    await user.save();

    const message = `Your therapist account has been approved! You can now access the therapist dashboard.`;
    await sendEmail({
      email: user.email,
      subject: 'Your Therapist Account Has Been Approved',
      message
    }).catch(err => console.error('Email send error:', err));

    res.json({ message: 'Therapist approved successfully', user });
  } catch (error) {
    console.error('Error approving therapist:', error);
    res.status(500).json({ error: 'Failed to approve therapist', details: error.message });
  }
});

router.put('/therapist-requests/:userId/reject', verifyToken, adminCheck, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'therapist' || user.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid therapist request' });
    }

    user.status = 'rejected';
    user.isActive = false;
    await user.save();

    const message = `Your therapist account registration has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;
    await sendEmail({
      email: user.email,
      subject: 'Your Therapist Account Registration',
      message
    }).catch(err => console.error('Email send error:', err));

    res.json({ message: 'Therapist rejected successfully', user });
  } catch (error) {
    console.error('Error rejecting therapist:', error);
    res.status(500).json({ error: 'Failed to reject therapist', details: error.message });
  }
});

// Get notifications (therapist requests + new registrations)
router.get('/notifications', verifyToken, adminCheck, async (req, res) => {
  try {
    const pendingTherapists = await User.countDocuments({
      role: 'therapist',
      status: 'pending'
    });

    const recentRegistrations = await Patient.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    });

    const pendingScreenings = await Patient.countDocuments({
      screeningStatus: { $regex: /^pending$/i }
    });

    const pendingReports = await Patient.countDocuments({
      reportStatus: { $regex: /^pending$/i }
    });

    res.json({
      pendingTherapists,
      recentRegistrations,
      pendingScreenings,
      pendingReports
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
  }
});

// Get children registered by parents with their screening and report data
router.get('/children-data', verifyToken, adminCheck, async (req, res) => {
  try {
    const children = await Patient.find()
      .populate('parent_id', 'username email')
      .sort({ createdAt: -1 })
      .limit(100);

    const childrenWithData = await Promise.all(children.map(async (child) => {
      const screening = await Screening.findOne({ patientId: child._id });
      const report = await Report.findOne({ patientId: child._id });

      return {
        ...child.toObject(),
        screeningData: screening || null,
        reportData: report || null
      };
    }));

    res.json(childrenWithData);
  } catch (error) {
    console.error('Error fetching children data:', error);
    res.status(500).json({ error: 'Failed to fetch children data', details: error.message });
  }
});

// Get children by parent ID with screening and report data
router.get('/children-data/:parentId', verifyToken, adminCheck, async (req, res) => {
  try {
    const { parentId } = req.params;
    const children = await Patient.find({ parent_id: parentId })
      .sort({ createdAt: -1 });

    const childrenWithData = await Promise.all(children.map(async (child) => {
      const screening = await Screening.findOne({ patientId: child._id });
      const report = await Report.findOne({ patientId: child._id });

      return {
        ...child.toObject(),
        screeningData: screening || null,
        reportData: report || null
      };
    }));

    res.json(childrenWithData);
  } catch (error) {
    console.error('Error fetching children data:', error);
    res.status(500).json({ error: 'Failed to fetch children data', details: error.message });
  }
});

// Get recent therapist requests (for notification dropdown)
router.get('/recent-therapist-requests', verifyToken, adminCheck, async (req, res) => {
  try {
    const requests = await User.find({
      role: 'therapist',
      status: 'pending'
    })
      .select('-password -otp')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(requests);
  } catch (error) {
    console.error('Error fetching recent therapist requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
  }
});

// Get all active therapists
router.get('/therapists', verifyToken, adminCheck, async (req, res) => {
  try {
    const therapists = await User.find({
      role: 'therapist',
      isActive: true,
      status: 'approved'
    })
      .select('_id username firstName lastName email')
      .sort({ username: 1 });

    const formattedTherapists = therapists.map(t => ({
      id: t._id,
      name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.username || t.email,
      email: t.email
    }));

    res.json(formattedTherapists);
  } catch (error) {
    console.error('Error fetching therapists:', error);
    res.status(500).json({ error: 'Failed to fetch therapists', details: error.message });
  }
});

// Assign therapist to patient
router.put('/children/:childId/assign-therapist', verifyToken, adminCheck, async (req, res) => {
  try {
    const { childId } = req.params;
    const { therapistId } = req.body;

    if (!therapistId) {
      return res.status(400).json({ error: 'Therapist ID is required' });
    }

    const patient = await Patient.findById(childId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const therapist = await User.findOne({
      _id: therapistId,
      role: 'therapist',
      isActive: true,
      status: 'approved'
    });

    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found or inactive' });
    }

    patient.therapist_user_id = therapistId;
    await patient.save();

    const therapistName = `${therapist.firstName || ''} ${therapist.lastName || ''}`.trim() || therapist.username;
    res.json({
      success: true,
      message: `Patient assigned to therapist ${therapistName}`,
      patient
    });
  } catch (error) {
    console.error('Error assigning therapist:', error);
    res.status(500).json({ error: 'Failed to assign therapist', details: error.message });
  }
});

// Unassign therapist from patient
router.put('/children/:childId/unassign-therapist', verifyToken, adminCheck, async (req, res) => {
  try {
    const { childId } = req.params;

    const patient = await Patient.findById(childId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    patient.therapist_user_id = null;
    await patient.save();

    res.json({
      success: true,
      message: 'Therapist unassigned from patient',
      patient
    });
  } catch (error) {
    console.error('Error unassigning therapist:', error);
    res.status(500).json({ error: 'Failed to unassign therapist', details: error.message });
  }
});

// GET /api/admin/search?q=<query> - Global admin search across users, children, screenings
router.get('/search', verifyToken, adminCheck, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: { users: [], children: [], screenings: [] } });
    }

    const regex = new RegExp(q.trim(), 'i');

    const [users, children, screenings] = await Promise.all([
      User.find({
        $or: [
          { username: regex },
          { email: regex },
          { firstName: regex },
          { lastName: regex },
          { role: regex }
        ]
      })
        .select('_id username email role status isActive firstName lastName')
        .limit(6),

      Patient.find({
        $or: [
          { name: regex },
          { childName: regex },
          { firstName: regex },
          { lastName: regex }
        ]
      })
        .select('_id name childName firstName lastName age gender')
        .limit(6),

      Screening.find({
        $or: [
          { screeningType: regex },
          { result: regex }
        ]
      })
        .select('_id screeningType result createdAt userId childId')
        .sort({ createdAt: -1 })
        .limit(6)
    ]);

    res.json({
      success: true,
      data: { users, children, screenings }
    });
  } catch (error) {
    console.error('Error in admin search:', error);
    res.status(500).json({ success: false, error: 'Search failed', details: error.message });
  }
});

module.exports = router;

