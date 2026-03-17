const ScreeningResult = require('../models/ScreeningResult');

const ALLOWED_SCREENING_TYPES = ['MCHAT', 'ATTENTION', 'MRI'];

const toNumberOrDefault = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeMriPrediction = (value) => {
  if (!value) return 'Unknown';
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'ASD' || normalized === 'ASD DETECTED') return 'ASD';
  if (normalized === 'NO ASD' || normalized === 'NO_ASD' || normalized === 'NO ASD DETECTED') return 'No ASD';
  return 'Unknown';
};

const buildRecommendation = (riskLevel, screeningType) => {
  if (riskLevel === 'High') {
    return 'High ASD risk indicators detected. Please schedule a specialist evaluation as soon as possible.';
  }
  if (riskLevel === 'Medium') {
    return 'Moderate ASD risk indicators observed. Continue monitoring and consider a professional follow-up.';
  }

  if (screeningType === 'ATTENTION') {
    return 'Low ASD risk from current signals. Maintain regular cognitive and behavioral monitoring.';
  }
  if (screeningType === 'MRI') {
    return 'Low ASD risk based on MRI prediction. Continue routine developmental follow-up.';
  }
  return 'Low ASD risk based on current screening. Continue regular developmental monitoring.';
};

const buildConfidence = ({ riskLevel, questionnaireScore, attentionScore, mriPrediction }) => {
  if (riskLevel === 'High') {
    return mriPrediction === 'ASD' ? 95 : 90;
  }

  if (riskLevel === 'Medium') {
    const qDelta = questionnaireScore > 10 ? Math.min((questionnaireScore - 10) * 2, 10) : 0;
    const aDelta = attentionScore < 40 ? Math.min((40 - attentionScore) * 0.5, 10) : 0;
    return Math.round(Math.min(90, 72 + qDelta + aDelta));
  }

  return 85;
};

const deriveRisk = ({ questionnaireScore, attentionScore, mriPrediction }) => {
  // Optional fusion behavior by design: MRI outcome has highest priority when present.
  if (mriPrediction === 'ASD') {
    return 'High';
  }

  if (questionnaireScore > 10 || attentionScore < 40) {
    return 'Medium';
  }

  return 'Low';
};

const normalizePayload = (body) => {
  const screeningTypeRaw = String(body?.screeningType || '').toUpperCase();
  const screeningType = ALLOWED_SCREENING_TYPES.includes(screeningTypeRaw) ? screeningTypeRaw : null;

  const questionnaireScore = toNumberOrDefault(body?.scores?.questionnaireScore, 0);
  const attentionScore = toNumberOrDefault(body?.scores?.attentionScore, 100);
  const mriPrediction = normalizeMriPrediction(body?.scores?.mriPrediction);

  return {
    childName: String(body?.childName || '').trim(),
    screeningType,
    scores: {
      questionnaireScore,
      attentionScore,
      mriPrediction
    }
  };
};

const saveScreeningResult = async (req, res) => {
  try {
    const { childName, screeningType, scores } = normalizePayload(req.body);

    if (!childName || !screeningType) {
      return res.status(400).json({
        error: 'childName and screeningType are required. screeningType must be one of MCHAT, ATTENTION, MRI.'
      });
    }

    const riskLevel = deriveRisk(scores);
    const confidence = buildConfidence({ ...scores, riskLevel });
    const recommendation = buildRecommendation(riskLevel, screeningType);

    // Data integrity: always create a new record (never overwrite prior screenings).
    const saved = await ScreeningResult.create({
      userId: req.user.id,
      childName,
      screeningType,
      scores,
      riskLevel,
      confidence,
      recommendation
    });

    return res.status(201).json(saved);
  } catch (error) {
    console.error('POST /api/screening/save - Error:', error);
    return res.status(500).json({ error: 'Failed to save screening result' });
  }
};

const getLatestScreeningResult = async (req, res) => {
  try {
    const latestResult = await ScreeningResult.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 });

    if (!latestResult) {
      return res.status(404).json({ message: 'No screening results found for this user' });
    }

    return res.json(latestResult);
  } catch (error) {
    console.error('GET /api/screening/latest - Error:', error);
    return res.status(500).json({ error: 'Failed to fetch latest screening result' });
  }
};

module.exports = {
  saveScreeningResult,
  getLatestScreeningResult
};
