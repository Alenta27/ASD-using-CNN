const express = require('express');
const mongoose = require('mongoose');
const { verifyToken, teacherCheck } = require('../middlewares/auth');
const MultiDisorderResult = require('../models/MultiDisorderResult');
const Patient = require('../models/patient');

const router = express.Router();

const getRiskLabel = (accuracy) => {
  if (accuracy >= 0.8) return 'Low Risk';
  if (accuracy >= 0.5) return 'Moderate Risk';
  return 'High Risk';
};

const normalizeText = (value) => String(value || '').trim();

const DYSLEXIA_CORRECT_ANSWERS = {
  'Identify the correct letter for the sound "b"': 'b',
  'Which word matches the image: cat': 'cat',
  'Pick the correctly ordered word': 'from'
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const evaluateSubmission = (disorderType, responses) => {
  if (disorderType === 'ADHD' || disorderType === 'Anxiety / Behavioral Issues') {
    const normalizedResponses = responses.map((item) => {
      const answer = normalizeText(item.answer);
      const isCorrect = answer === 'No';
      return {
        question: normalizeText(item.question),
        answer,
        expectedAnswer: 'No',
        isCorrect,
        score: isCorrect ? 1 : 0
      };
    });

    const allAnswered = normalizedResponses.every((item) => item.question && (item.answer === 'Yes' || item.answer === 'No'));
    if (!allAnswered) {
      return { error: 'Please answer all questionnaire items before submitting.' };
    }

    const totalQuestions = normalizedResponses.length;
    const correctAnswers = normalizedResponses.filter((item) => item.isCorrect).length;
    const score = correctAnswers;
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

    return { normalizedResponses, correctAnswers, score, accuracy };
  }

  if (disorderType === 'Dyslexia') {
    const normalizedResponses = responses.map((item) => {
      const question = normalizeText(item.question);
      const answer = normalizeText(item.answer);
      const expectedAnswer = DYSLEXIA_CORRECT_ANSWERS[question] || '';
      const isCorrect = answer.toLowerCase() === expectedAnswer.toLowerCase();

      return {
        question,
        answer,
        expectedAnswer,
        isCorrect,
        score: isCorrect ? 1 : 0
      };
    });

    const allAnswered = normalizedResponses.every((item) => item.question && item.answer);
    if (!allAnswered) {
      return { error: 'Please complete all dyslexia tasks before submitting.' };
    }

    const totalQuestions = normalizedResponses.length;
    const correctAnswers = normalizedResponses.filter((item) => item.isCorrect).length;
    const score = correctAnswers;
    const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

    return { normalizedResponses, correctAnswers, score, accuracy };
  }

  if (disorderType === 'Speech & Language Delay') {
    const normalizedResponses = responses.map((item) => ({
      question: normalizeText(item.question),
      answer: normalizeText(item.answer),
      score: Number(item.score) || 0
    }));

    const hasMeaningfulAnswer = normalizedResponses.some((item) => {
      const normalized = item.answer.toLowerCase();
      return (item.answer && normalized !== 'no file selected') || Number(item.score) > 0;
    });

    if (!hasMeaningfulAnswer) {
      return { error: 'Please provide at least one speech input before submitting.' };
    }

    const manualScore = normalizedResponses
      .filter((item) => item.question.startsWith('Manual score -'))
      .reduce((sum, item) => sum + clamp(Number(item.score) || 0, 0, 3), 0);

    const score = clamp(manualScore, 0, 9);
    const accuracy = score / 9;

    return {
      normalizedResponses,
      correctAnswers: score,
      score,
      accuracy
    };
  }

  return { error: 'Invalid disorderType' };
};

router.post('/', verifyToken, teacherCheck, async (req, res) => {
  try {
    const { childId, disorderType, responses } = req.body;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ error: 'Invalid childId' });
    }

    if (!disorderType) {
      return res.status(400).json({ error: 'disorderType is required' });
    }

    const allowedDisorders = ['ADHD', 'Speech & Language Delay', 'Dyslexia', 'Anxiety / Behavioral Issues'];
    if (!allowedDisorders.includes(disorderType)) {
      return res.status(400).json({ error: 'Invalid disorderType' });
    }

    const student = await Patient.findOne({
      _id: childId,
      $or: [{ assignedTeacherId: req.user.id }, { teacherId: req.user.id }]
    });
    if (!student) {
      return res.status(403).json({ error: 'Student not found or not assigned to this teacher' });
    }

    const safeResponses = Array.isArray(responses)
      ? responses.map((item) => ({
          question: normalizeText(item?.question),
          answer: normalizeText(item?.answer),
          score: Number(item?.score) || 0,
          expectedAnswer: normalizeText(item?.expectedAnswer),
          isCorrect: Boolean(item?.isCorrect)
        }))
      : [];

    if (safeResponses.length === 0) {
      return res.status(400).json({ error: 'Please complete the screening before submitting.' });
    }

    const evaluated = evaluateSubmission(disorderType, safeResponses);
    if (evaluated.error) {
      return res.status(400).json({ error: evaluated.error });
    }

    const finalScore = evaluated.score;
    const finalCorrectAnswers = evaluated.correctAnswers;
    const finalAccuracy = clamp(evaluated.accuracy, 0, 1);
    const finalResult = getRiskLabel(finalAccuracy);

    const saved = await MultiDisorderResult.create({
      childId,
      disorderType,
      responses: evaluated.normalizedResponses,
      correctAnswers: finalCorrectAnswers,
      score: finalScore,
      totalScore: finalScore,
      accuracy: finalAccuracy,
      result: finalResult
    });

    return res.status(201).json({
      message: 'Multi-disorder screening saved successfully',
      data: saved,
      computed: {
        correctAnswers: evaluated.correctAnswers,
        score: evaluated.score,
        accuracy: evaluated.accuracy,
        result: getRiskLabel(evaluated.accuracy)
      }
    });
  } catch (error) {
    console.error('Error saving multi-disorder screening:', error);
    return res.status(500).json({ error: 'Failed to save screening' });
  }
});

module.exports = router;
