const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { verifyToken, teacherCheck, requireResourceAccess } = require('../middlewares/auth');
const User = require('../models/user');
const Patient = require('../models/patient');
const Screening = require('../models/screening');
const Report = require('../models/report');
const SocialResponseGame = require('../models/socialResponseGame');

const clampDateToRange = (value) => {
  const start = new Date(Date.UTC(2025, 7, 1));
  const end = new Date(Date.UTC(2025, 9, 31, 23, 59, 59, 999));
  const fallback = new Date(Date.UTC(2025, 8, 15));
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  if (date < start) return start;
  if (date > end) return end;
  return date;
};

const formatDateInRange = (value) => clampDateToRange(value).toISOString().split('T')[0];
const normalizeRiskLevel = (value) => {
  const input = typeof value === 'string' ? value : '';
  const lower = input.toLowerCase();
  if (lower === 'high') return 'High';
  if (lower === 'medium' || lower === 'moderate') return 'Medium';
  return 'Low';
};

const buildTeacherStudentQuery = (teacherUserId, legacyTeacherId) => {
  const orConditions = [
    { assignedTeacherId: teacherUserId },
    { teacherId: teacherUserId }
  ];

  if (legacyTeacherId) {
    orConditions.push({ teacherId: legacyTeacherId });
  }

  return { $or: orConditions };
};

const getTeacherStudentQuery = async (teacherUserId) => {
  const teacher = await User.findById(teacherUserId).select('teacherId');
  return buildTeacherStudentQuery(teacherUserId, teacher?.teacherId);
};

const titleCase = (value) => {
  const text = typeof value === 'string' ? value : '';
  if (!text.trim()) return 'Unknown';
  return text
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const deriveRiskFromLabel = (label, fallbackRisk) => {
  const lower = (label || '').toLowerCase();
  if (lower.includes('high')) return 'High';
  if (lower.includes('medium') || lower.includes('moderate')) return 'Medium';
  if (lower.includes('low') || lower.includes('no asd')) return 'Low';
  return normalizeRiskLevel(fallbackRisk);
};

const screeningStatusText = (value) => {
  const lower = (value || '').toLowerCase();
  if (lower === 'completed') return 'Completed';
  if (lower === 'in-progress') return 'In Progress';
  if (lower === 'failed') return 'Needs Review';
  return 'Pending';
};

// All routes require authentication and teacher role
router.use(verifyToken);
router.use(teacherCheck);

// Get teacher's profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teacher's students (only students in their class)
router.get('/students', requireResourceAccess('children'), async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find(teacherQuery);
    const formattedStudents = students.map((student) => {
      const doc = student.toObject();
      return { ...doc, submittedDate: formatDateInRange(doc.submittedDate) };
    });
    res.json(formattedStudents);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get class statistics
router.get('/class-stats', async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find(teacherQuery);
    
    const stats = {
      totalStudents: students.length,
      studentsAtRisk: students.filter(s => {
        const risk = normalizeRiskLevel(s.riskLevel);
        return risk === 'High' || risk === 'Medium';
      }).length,
      pendingScreenings: students.filter(s => (s.screeningStatus || '').toLowerCase() === 'pending').length,
      completedReports: students.filter(s => (s.reportStatus || '').toLowerCase() === 'completed').length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get month-wise class progress for dashboard chart
router.get('/class-progress', async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find(teacherQuery).select('_id').lean();

    if (!students.length) {
      return res.json([]);
    }

    const studentIds = students.map((student) => student._id);
    const totalStudents = students.length;
    const now = new Date();
    const months = [];

    for (let offset = 7; offset >= 0; offset -= 1) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      months.push({
        key: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
        label: monthStart.toLocaleString('en-US', { month: 'short' }),
        start: monthStart,
        end: monthEnd
      });
    }

    const monthRanges = months.map(({ start, end, label }) => ({
      month: label,
      progress: 0,
      start,
      end
    }));

    const [screeningAgg, reportAgg] = await Promise.all([
      Screening.aggregate([
        {
          $match: {
            patientId: { $in: studentIds },
            createdAt: {
              $gte: monthRanges[0].start,
              $lt: monthRanges[monthRanges.length - 1].end
            },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            uniqueStudents: { $addToSet: '$patientId' }
          }
        },
        {
          $project: {
            _id: 0,
            key: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $toString: '$_id.month' }
              ]
            },
            count: { $size: '$uniqueStudents' }
          }
        }
      ]),
      Report.aggregate([
        {
          $match: {
            teacherId: new mongoose.Types.ObjectId(req.user.id),
            patientId: { $in: studentIds },
            createdAt: {
              $gte: monthRanges[0].start,
              $lt: monthRanges[monthRanges.length - 1].end
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            uniqueStudents: { $addToSet: '$patientId' }
          }
        },
        {
          $project: {
            _id: 0,
            key: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $toString: '$_id.month' }
              ]
            },
            count: { $size: '$uniqueStudents' }
          }
        }
      ])
    ]);

    const screeningMap = new Map(screeningAgg.map((item) => [item.key, item.count]));
    const reportMap = new Map(reportAgg.map((item) => [item.key, item.count]));

    const chart = months.map((month) => {
      const screenedStudents = screeningMap.get(month.key) || 0;
      const reportedStudents = reportMap.get(month.key) || 0;

      // Weighted progress: screening completion (70%) + report completion (30%)
      const screeningRatio = totalStudents ? screenedStudents / totalStudents : 0;
      const reportRatio = totalStudents ? reportedStudents / totalStudents : 0;
      const progress = Math.round(Math.min(1, (screeningRatio * 0.7) + (reportRatio * 0.3)) * 100);

      return {
        month: month.label,
        progress,
        completedScreenings: screenedStudents,
        completedReports: reportedStudents,
        totalStudents
      };
    });

    return res.json(chart);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get pending screenings for teacher's students
router.get('/pending-screenings', async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find({ 
      ...teacherQuery,
      screeningStatus: { $regex: /^pending$/i }
    });
    
    const pendingScreenings = students.map(student => ({
      id: student._id,
      studentName: student.name,
      age: student.age,
      screeningType: student.screeningType,
      submittedDate: formatDateInRange(student.submittedDate),
      status: student.screeningStatus
    }));
    
    res.json(pendingScreenings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const updates = {};
    const { name, age, gender, grade, riskLevel, lastScreening } = req.body;
    if (typeof name !== 'undefined') updates.name = name;
    if (typeof age !== 'undefined') updates.age = Number(age);
    if (typeof gender !== 'undefined') updates.gender = gender;
    if (typeof grade !== 'undefined') updates.grade = grade;
    if (typeof riskLevel !== 'undefined') updates.riskLevel = riskLevel;
    if (typeof lastScreening !== 'undefined') updates.submittedDate = clampDateToRange(lastScreening || Date.now());
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    const updated = await Patient.findOneAndUpdate(
      { _id: studentId, assignedTeacherId: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const doc = updated.toObject();
    return res.json({ ...doc, submittedDate: formatDateInRange(doc.submittedDate) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/students/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const deleted = await Patient.findOneAndDelete({ _id: studentId, assignedTeacherId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/screenings', async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find(teacherQuery).lean();

    if (!students.length) {
      return res.json([]);
    }

    const studentIds = students.map((student) => student._id);
    const screeningDocs = await Screening.find({
      patientId: { $in: studentIds }
    }).sort({ createdAt: -1 }).lean();

    const latestScreeningByStudent = new Map();
    screeningDocs.forEach((screening) => {
      const key = screening.patientId ? String(screening.patientId) : '';
      if (key && !latestScreeningByStudent.has(key)) {
        latestScreeningByStudent.set(key, screening);
      }
    });

    const formatDate = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    };

    const toDisplayStatus = (value) => {
      const lower = (value || '').toLowerCase();
      if (lower === 'completed') return 'Completed';
      if (lower === 'in-progress') return 'In Progress';
      if (lower === 'failed') return 'Failed';
      return 'Pending';
    };

    const resolveRiskLevel = (studentRisk, resultLabel) => {
      const label = (resultLabel || '').toLowerCase();
      if (label.includes('high')) return 'High';
      if (label.includes('medium') || label.includes('moderate')) return 'Medium';
      if (label.includes('low') || label.includes('no asd')) return 'Low';
      return normalizeRiskLevel(studentRisk);
    };

    const screeningsFromDb = students.map((student) => {
      const latest = latestScreeningByStudent.get(String(student._id));
      const assignedDateSource = latest?.createdAt || student.submittedDate || student.createdAt;
      const assignedDate = formatDate(assignedDateSource);
      const dueDate = assignedDateSource
        ? formatDate(new Date(new Date(assignedDateSource).getTime() + 7 * 24 * 60 * 60 * 1000))
        : null;
      const statusSource = latest?.status || student.screeningStatus;
      const status = toDisplayStatus(statusSource);
      const riskLevel = resolveRiskLevel(student.riskLevel, latest?.resultLabel);
      const score = typeof latest?.resultScore === 'number'
        ? Math.round(latest.resultScore * 100)
        : null;

      return {
        id: student._id,
        studentName: student.name,
        type: latest?.screeningType || student.screeningType || 'Unknown',
        assignedDate,
        dueDate,
        status,
        score,
        riskLevel
      };
    });
    res.json(screeningsFromDb);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/screenings/:studentId/report', async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const student = await Patient.findOne({
      _id: studentId,
      ...teacherQuery
    }).lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const latestScreening = await Screening.findOne({
      patientId: student._id
    }).sort({ createdAt: -1 }).lean();

    const screeningType = titleCase(latestScreening?.screeningType || student.screeningType || 'Questionnaire');
    const riskLevel = deriveRiskFromLabel(latestScreening?.resultLabel, student.riskLevel);
    const screeningStatus = screeningStatusText(latestScreening?.status || student.screeningStatus);
    const scorePercent = typeof latestScreening?.resultScore === 'number'
      ? Math.round(latestScreening.resultScore * 100)
      : null;
    const screeningDate = latestScreening?.createdAt || student.submittedDate || student.createdAt || new Date();

    const strengthsLine =
      riskLevel === 'Low'
        ? 'Current indicators suggest stable developmental patterns and good responsiveness during screening tasks.'
        : riskLevel === 'Medium'
          ? 'The student demonstrates several positive responses and engagement moments during structured screening prompts.'
          : 'The screening captured meaningful baseline responses that help guide targeted intervention planning.';

    const recommendationsLine =
      riskLevel === 'Low'
        ? 'Continue routine classroom observation and periodic check-ins to track consistency over time.'
        : riskLevel === 'Medium'
          ? 'Schedule focused follow-up activities for communication and social interaction, and reassess within 4 to 6 weeks.'
          : 'Prioritize specialist consultation and structured intervention planning, with close monitoring and short-cycle reassessment.';

    const scoreText = scorePercent === null ? 'N/A' : `${scorePercent}%`;
    const summary = [
      `This report summarizes the latest ${screeningType} screening for ${student.name}.`,
      `Screening status is ${screeningStatus} with a risk indication of ${riskLevel} and a score of ${scoreText}.`,
      `These findings should be interpreted alongside classroom behavior, parent observations, and follow-up assessments for a comprehensive view.`
    ].join(' ');

    const reportPayload = {
      teacherId: req.user.id,
      patientId: student._id,
      title: `${screeningType} Screening Report - ${student.name}`,
      author: 'Teacher Dashboard',
      date: screeningDate,
      period: `${new Date(screeningDate).getFullYear()} Screening Cycle`,
      summary,
      strengths: strengthsLine,
      recommendations: recommendationsLine,
      status: 'final'
    };

    const report = await Report.findOneAndUpdate(
      { teacherId: req.user.id, patientId: student._id, title: reportPayload.title },
      { $set: reportPayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      report,
      screening: {
        studentId: student._id,
        studentName: student.name,
        type: screeningType,
        riskLevel,
        status: screeningStatus,
        score: scorePercent,
        screeningDate: new Date(screeningDate).toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get reports for teacher's students
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ teacherId: req.user.id }).populate('patientId', 'name');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reports for a specific student
router.get('/reports/student/:studentId', async (req, res) => {
  try {
    const reports = await Report.find({ 
      teacherId: req.user.id,
      patientId: req.params.studentId 
    }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a report for a student
router.post('/reports', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: 'studentId is required' });
    }

    // Verify the student belongs to this teacher
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const student = await Patient.findOne({
      _id: studentId,
      ...teacherQuery
    });
    
    if (!student) {
      return res.status(403).json({ message: 'Access denied. Student not found or not in your class.' });
    }

    const reportData = {
      ...req.body,
      teacherId: req.user.id,
      patientId: studentId,
    };
    
    const report = new Report(reportData);
    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a report created by the teacher
router.delete('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const deleted = await Report.findOneAndDelete({
      _id: reportId,
      teacherId: req.user.id
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get AI insights for class trends
router.get('/insights', async (req, res) => {
  try {
    const teacherQuery = await getTeacherStudentQuery(req.user.id);
    const students = await Patient.find(teacherQuery);
    
    // Mock AI insights
    const insights = {
      classTrends: {
        averageAge: students.reduce((sum, s) => sum + s.age, 0) / students.length,
        commonConcerns: ['Speech delay', 'Social interaction', 'Behavioral issues'],
        riskDistribution: {
          low: students.filter(s => normalizeRiskLevel(s.riskLevel) === 'Low').length,
          medium: students.filter(s => normalizeRiskLevel(s.riskLevel) === 'Medium').length,
          high: students.filter(s => normalizeRiskLevel(s.riskLevel) === 'High').length
        }
      },
      recommendations: [
        'Consider group activities for social development',
        'Implement visual schedules for routine management',
        'Focus on communication skills development'
      ],
      alerts: [
        {
          type: 'warning',
          message: '3 students show signs of speech delay',
          priority: 'medium'
        },
        {
          type: 'info',
          message: 'Class shows good progress in social skills',
          priority: 'low'
        }
      ]
    };
    
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback for teacher
router.get('/feedback', async (req, res) => {
  try {
    // Mock feedback data
    const feedback = [
      {
        id: 1,
        from: 'Parent of Alex Johnson',
        message: 'Thank you for the detailed report on Alex\'s progress',
        date: '2024-01-15',
        type: 'positive'
      },
      {
        id: 2,
        from: 'Parent of Emma Smith',
        message: 'Could you provide more information about Emma\'s social interactions?',
        date: '2024-01-14',
        type: 'question'
      }
    ];
    
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit feedback response
router.post('/feedback/:feedbackId/response', async (req, res) => {
  try {
    const { response } = req.body;
    
    // Mock response submission
    const feedbackResponse = {
      id: req.params.feedbackId,
      response,
      respondedAt: new Date(),
      teacherId: req.user.id
    };
    
    res.json(feedbackResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new student (teachers can add students to their class)
router.post('/students', async (req, res) => {
  try {
    
    // Verify user is a teacher
    if (req.user && req.user.role !== 'teacher') {
      return res.status(403).json({ 
        message: 'Access denied. Only teachers can add students.' 
      });
    }

    const { name, age, gender, grade, riskLevel, lastScreening } = req.body;
    
    // Generate unique patient ID
    const patientIdGenerator = require('../utils/patientIdGenerator');
    const patientId = patientIdGenerator.generatePatientId();
    
    // Create a mock parent ID (in real app, this would come from the parent account)
    const mockParentId = new mongoose.Types.ObjectId();
    
    // Convert teacher ID to ObjectId
    const teacherId = new mongoose.Types.ObjectId(req.user.id);
    
    const newStudent = new Patient({
      patient_id: patientId,
      patientId: patientId, // Keep both for compatibility
      name,
      age,
      gender: gender || 'Prefer not to say',
      grade: req.body.grade || '',
      assignedTeacherId: teacherId,
      riskLevel: riskLevel || 'Low',
      screeningType: 'Questionnaire',
      screeningStatus: 'completed',
      submittedDate: clampDateToRange(lastScreening || Date.now()),
      parent_id: mockParentId
    });
    
    await newStudent.save();
    
    // Populate teacher details for response
    await newStudent.populate('assignedTeacherId', 'username email');
    
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error adding student:', error);
    
    // Return more specific error message
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to add student',
      error: error.message 
    });
  }
});

router.post('/social-response-game', async (req, res) => {
  try {
    console.log('Received game submission:', { 
      body: req.body, 
      user: req.user?.id 
    });

    const { studentId, gameResults, completedAt, totalTime } = req.body;
    const teacherId = req.user?.id;

    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId' });
    }
    if (!gameResults || gameResults.length === 0) {
      return res.status(400).json({ error: 'Missing gameResults' });
    }
    if (!teacherId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const accuracy = (gameResults.filter(r => r.isCorrect).length / gameResults.length) * 100;
    const avgReactionTime = gameResults.reduce((sum, r) => sum + r.reactionTime, 0) / gameResults.length;
    const missedResponses = gameResults.filter(r => !r.isCorrect).length;

    let studentObjectId, teacherObjectId;
    try {
      studentObjectId = new mongoose.Types.ObjectId(studentId);
      teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid student or teacher ID format' });
    }

    const gameRecord = new SocialResponseGame({
      studentId: studentObjectId,
      teacherId: teacherObjectId,
      gameResults,
      totalTime,
      accuracy,
      avgReactionTime,
      missedResponses,
      completedAt: new Date(completedAt),
      modelPrediction: {
        prediction: accuracy > 75 ? 'No ASD Indicators' : 'Possible ASD Indicators',
        confidence: Math.abs((accuracy - 50) / 50),
        severity: accuracy > 85 ? 'Low' : accuracy > 70 ? 'Medium' : 'High'
      }
    });

    const savedRecord = await gameRecord.save();
    console.log('Game record saved:', savedRecord._id);

    triggerKNNAnalysis(savedRecord._id, studentId, {
      accuracy,
      avgReactionTime,
      missedResponses
    }).catch(err => console.error('KNN analysis error:', err));

    res.status(201).json({
      resultId: savedRecord._id,
      accuracy,
      avgReactionTime,
      missedResponses,
      prediction: savedRecord.modelPrediction
    });
  } catch (error) {
    console.error('Error saving game results:', error);
    res.status(500).json({ 
      error: 'Failed to save game results', 
      details: error.message,
      stack: error.stack 
    });
  }
});

router.get('/social-response-game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameRecord = await SocialResponseGame.findById(gameId)
      .populate('studentId', 'name age')
      .populate('teacherId', 'username email');

    if (!gameRecord) {
      return res.status(404).json({ error: 'Game record not found' });
    }

    res.json(gameRecord);
  } catch (error) {
    console.error('Error fetching game record:', error);
    res.status(500).json({ error: 'Failed to fetch game record' });
  }
});

router.get('/social-response-game/:gameId/similar-cases', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameRecord = await SocialResponseGame.findById(gameId);

    if (!gameRecord) {
      return res.status(404).json({ error: 'Game record not found' });
    }

    const similarCases = await SocialResponseGame.find({
      _id: { $ne: gameId },
      accuracy: {
        $gte: gameRecord.accuracy - 10,
        $lte: gameRecord.accuracy + 10
      }
    })
      .populate('studentId', 'name age')
      .limit(5)
      .sort({ createdAt: -1 });

    res.json({
      currentCase: {
        accuracy: gameRecord.accuracy,
        avgReactionTime: gameRecord.avgReactionTime,
        missedResponses: gameRecord.missedResponses
      },
      similarCases: similarCases.map(c => ({
        id: c._id,
        studentName: c.studentId.name,
        accuracy: c.accuracy,
        avgReactionTime: c.avgReactionTime,
        missedResponses: c.missedResponses,
        prediction: c.modelPrediction.prediction,
        confidence: c.modelPrediction.confidence,
        completedAt: c.completedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching similar cases:', error);
    res.status(500).json({ error: 'Failed to fetch similar cases' });
  }
});

router.post('/asd-risk-estimate', async (req, res) => {
  try {
    const behaviorRatings = req.body;
    
    if (!behaviorRatings || typeof behaviorRatings !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const pythonBin = process.env.PYTHON_BIN || 'python';
    const scriptPath = path.join(__dirname, '..', 'predict_asd_risk.py');

    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: 'Prediction script not found' });
    }

    const { spawn } = require('child_process');
    
    let stdoutData = '';
    let stderrData = '';

    const child = spawn(pythonBin, [scriptPath, JSON.stringify(behaviorRatings)], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });

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
        error: 'Failed to start Python worker',
        details: String(err)
      });
    });

    child.on('close', (code) => {
      console.log(`ASD Risk Estimate exit code: ${code}`);

      if (code !== 0) {
        console.error('❌ Python worker failed with code:', code);
        console.error('Full stderr:', stderrData);
        return res.status(500).json({ 
          error: 'Python worker failed',
          details: stderrData.trim()
        });
      }

      try {
        const output = stdoutData.trim();
        const result = JSON.parse(output);
        console.log('✅ ASD Risk Estimate Success:', JSON.stringify(result));
        return res.json(result);
      } catch (parseErr) {
        console.error('❌ Failed to parse Python output:', stdoutData);
        return res.status(500).json({ 
          error: 'Failed to parse prediction result',
          details: parseErr.message
        });
      }
    });
  } catch (error) {
    console.error('Error in ASD risk estimation:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message
    });
  }
});

async function triggerKNNAnalysis(gameId, studentId, metrics) {
  try {
    const gameRecord = await SocialResponseGame.findById(gameId);
    const allGames = await SocialResponseGame.find({ _id: { $ne: gameId } }).select('accuracy avgReactionTime missedResponses');

    if (allGames.length === 0) {
      console.log('No previous cases for KNN analysis');
      return;
    }

    const knnResults = allGames
      .map(game => {
        const distance = Math.sqrt(
          Math.pow(metrics.accuracy - game.accuracy, 2) +
          Math.pow((metrics.avgReactionTime - game.avgReactionTime) * 10, 2) +
          Math.pow(metrics.missedResponses - game.missedResponses, 2)
        );
        return {
          caseId: game._id,
          distance,
          similarity: 1 / (1 + distance)
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    gameRecord.knnResults = knnResults;
    await gameRecord.save();

    console.log('KNN analysis completed for game:', gameId);
  } catch (error) {
    console.error('Error in KNN analysis:', error);
  }
}

module.exports = router;