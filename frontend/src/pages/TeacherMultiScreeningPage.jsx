import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const DISORDERS = [
  { value: 'ADHD', label: 'ADHD' },
  { value: 'Speech & Language Delay', label: 'Speech & Language Delay' },
  { value: 'Dyslexia', label: 'Dyslexia' },
  { value: 'Anxiety / Behavioral Issues', label: 'Anxiety / Behavioral Issues' }
];

const ADHD_QUESTIONS = [
  'Has difficulty staying focused on tasks?',
  'Gets easily distracted by surroundings?',
  'Often fidgets or cannot sit still?',
  'Has trouble following instructions completely?'
];

const ANXIETY_QUESTIONS = [
  'Seems nervous in social situations?',
  'Worries excessively about small things?',
  'Avoids school activities due to fear?',
  'Shows frequent irritability or emotional outbursts?'
];

const DYSLEXIA_TASKS = [
  {
    question: 'Identify the correct letter for the sound "b"',
    options: [
      { text: 'd', score: 0 },
      { text: 'b', score: 2 },
      { text: 'p', score: 1 }
    ]
  },
  {
    question: 'Which word matches the image: cat',
    options: [
      { text: 'cta', score: 0 },
      { text: 'act', score: 1 },
      { text: 'cat', score: 2 }
    ]
  },
  {
    question: 'Pick the correctly ordered word',
    options: [
      { text: 'from', score: 2 },
      { text: 'form', score: 1 },
      { text: 'frmo', score: 0 }
    ]
  }
];

const getRiskLabel = (accuracy) => {
  if (accuracy >= 0.8) return 'Low Risk';
  if (accuracy >= 0.5) return 'Moderate Risk';
  return 'High Risk';
};

const DYSLEXIA_CORRECT_BY_INDEX = ['b', 'cat', 'from'];

export default function TeacherMultiScreeningPage() {
  const navigate = useNavigate();

  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [disorderType, setDisorderType] = useState('');

  const [adhdAnswers, setAdhdAnswers] = useState({});
  const [anxietyAnswers, setAnxietyAnswers] = useState({});
  const [dyslexiaAnswers, setDyslexiaAnswers] = useState({});

  const [speechObservation, setSpeechObservation] = useState('');
  const [speechTextInput, setSpeechTextInput] = useState('');
  const [speechAudioFileName, setSpeechAudioFileName] = useState('');
  const [speechManualScore, setSpeechManualScore] = useState({
    clarity: 0,
    vocabulary: 0,
    fluency: 0
  });

  const [validationMessage, setValidationMessage] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/api/teacher/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = Array.isArray(response.data) ? response.data : [];
        setChildren(data);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };

    fetchChildren();
  }, []);

  const resetCurrentTestInputs = () => {
    setAdhdAnswers({});
    setAnxietyAnswers({});
    setDyslexiaAnswers({});
    setSpeechObservation('');
    setSpeechTextInput('');
    setSpeechAudioFileName('');
    setSpeechManualScore({ clarity: 0, vocabulary: 0, fluency: 0 });
  };

  const calculateSubmissionData = () => {
    let responses = [];
    let score = 0;
    let correctAnswers = 0;
    let totalQuestions = 0;

    if (disorderType === 'ADHD') {
      responses = ADHD_QUESTIONS.map((question, index) => {
        const answer = adhdAnswers[index] || '';
        const expectedAnswer = 'No';
        const isCorrect = answer === expectedAnswer;
        return { question, answer, expectedAnswer, isCorrect, score: isCorrect ? 1 : 0 };
      });
      correctAnswers = responses.filter((item) => item.isCorrect).length;
      score = correctAnswers;
      totalQuestions = ADHD_QUESTIONS.length;
    }

    if (disorderType === 'Anxiety / Behavioral Issues') {
      responses = ANXIETY_QUESTIONS.map((question, index) => {
        const answer = anxietyAnswers[index] || '';
        const expectedAnswer = 'No';
        const isCorrect = answer === expectedAnswer;
        return { question, answer, expectedAnswer, isCorrect, score: isCorrect ? 1 : 0 };
      });
      correctAnswers = responses.filter((item) => item.isCorrect).length;
      score = correctAnswers;
      totalQuestions = ANXIETY_QUESTIONS.length;
    }

    if (disorderType === 'Dyslexia') {
      responses = DYSLEXIA_TASKS.map((task, index) => {
        const selectedOptionIndex = dyslexiaAnswers[index];
        const option = typeof selectedOptionIndex === 'number' ? task.options[selectedOptionIndex] : null;
        const answer = option ? option.text : '';
        const expectedAnswer = DYSLEXIA_CORRECT_BY_INDEX[index];
        const isCorrect = answer.toLowerCase() === expectedAnswer.toLowerCase();
        return { question: task.question, answer, expectedAnswer, isCorrect, score: isCorrect ? 1 : 0 };
      });
      correctAnswers = responses.filter((item) => item.isCorrect).length;
      score = correctAnswers;
      totalQuestions = DYSLEXIA_TASKS.length;
    }

    if (disorderType === 'Speech & Language Delay') {
      const clarity = Number(speechManualScore.clarity) || 0;
      const vocabulary = Number(speechManualScore.vocabulary) || 0;
      const fluency = Number(speechManualScore.fluency) || 0;

      responses = [
        { question: 'Speech sample text', answer: speechTextInput.trim(), score: 0 },
        { question: 'Speech audio file', answer: speechAudioFileName || 'No file selected', score: 0 },
        { question: 'Teacher observation', answer: speechObservation.trim(), score: 0 },
        { question: 'Manual score - Clarity', answer: String(clarity), score: clarity },
        { question: 'Manual score - Vocabulary', answer: String(vocabulary), score: vocabulary },
        { question: 'Manual score - Fluency', answer: String(fluency), score: fluency }
      ];

      score = clarity + vocabulary + fluency;
      correctAnswers = score;
      totalQuestions = 9;
    }

    const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
    const result = getRiskLabel(accuracy);
    const accuracyPercent = Math.round(accuracy * 100);

    return { responses, correctAnswers, score, accuracy, accuracyPercent, result };
  };

  const handleSubmit = async () => {
    setValidationMessage('');
    setSubmitMessage('');
    setSubmittedResult(null);

    if (!childId) {
      setValidationMessage('Please select a child.');
      return;
    }

    if (!disorderType) {
      setValidationMessage('Please select a disorder type before submitting.');
      return;
    }

    if (disorderType === 'ADHD') {
      const allAnswered = ADHD_QUESTIONS.every((_, index) => ['Yes', 'No'].includes(adhdAnswers[index]));
      if (!allAnswered) {
        setValidationMessage('Please answer all ADHD questions before submitting.');
        return;
      }
    }

    if (disorderType === 'Anxiety / Behavioral Issues') {
      const allAnswered = ANXIETY_QUESTIONS.every((_, index) => ['Yes', 'No'].includes(anxietyAnswers[index]));
      if (!allAnswered) {
        setValidationMessage('Please answer all Anxiety questions before submitting.');
        return;
      }
    }

    if (disorderType === 'Dyslexia') {
      const allAnswered = DYSLEXIA_TASKS.every((_, index) => typeof dyslexiaAnswers[index] === 'number');
      if (!allAnswered) {
        setValidationMessage('Please complete all Dyslexia tasks before submitting.');
        return;
      }
    }

    if (disorderType === 'Speech & Language Delay') {
      const hasText = speechTextInput.trim().length > 0;
      const hasAudio = speechAudioFileName.trim().length > 0;
      const hasObservation = speechObservation.trim().length > 0;
      const manualTotal = (Number(speechManualScore.clarity) || 0)
        + (Number(speechManualScore.vocabulary) || 0)
        + (Number(speechManualScore.fluency) || 0);

      const hasMeaningfulInput = hasText || hasAudio || hasObservation || manualTotal > 0;
      if (!hasMeaningfulInput) {
        setValidationMessage('Please provide at least one speech input (text, audio, observation, or manual score) before submitting.');
        return;
      }
    }

    const submissionData = calculateSubmissionData();

    if (submissionData.responses.length === 0) {
      setValidationMessage('Please complete the screening before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_BASE}/api/multi-screening`,
        {
          childId,
          disorderType,
          responses: submissionData.responses,
          correctAnswers: submissionData.correctAnswers,
          score: submissionData.score,
          accuracy: submissionData.accuracy,
          result: submissionData.result
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmitMessage('Screening submitted successfully.');
      setSubmittedResult({
        score: submissionData.score,
        accuracyPercent: submissionData.accuracyPercent,
        riskLevel: submissionData.result
      });

      // Optional UX improvement: clear answers for a fresh attempt after successful submission.
      resetCurrentTestInputs();
    } catch (error) {
      console.error('Failed to submit multi-disorder screening:', error);
      setValidationMessage(error?.response?.data?.error || 'Failed to submit screening. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderYesNoQuestionnaire = (questions, answerState, setAnswerState) => (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question} className="p-4 border rounded-lg bg-white">
          <p className="font-medium text-gray-800 mb-3">{index + 1}. {question}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAnswerState((prev) => ({ ...prev, [index]: 'Yes' }))}
              className={`px-4 py-2 rounded-lg border ${answerState[index] === 'Yes' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setAnswerState((prev) => ({ ...prev, [index]: 'No' }))}
              className={`px-4 py-2 rounded-lg border ${answerState[index] === 'No' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
            >
              No
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDyslexiaUI = () => (
    <div className="space-y-4">
      {DYSLEXIA_TASKS.map((task, index) => (
        <div key={task.question} className="p-4 border rounded-lg bg-white">
          <p className="font-medium text-gray-800 mb-3">{index + 1}. {task.question}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {task.options.map((option, optionIndex) => (
              <button
                key={option.text}
                type="button"
                onClick={() => setDyslexiaAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                className={`px-3 py-2 rounded-lg border ${dyslexiaAnswers[index] === optionIndex ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-300'}`}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSpeechDelayUI = () => (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-1">Speech text sample (optional)</label>
        <textarea
          value={speechTextInput}
          onChange={(e) => setSpeechTextInput(e.target.value)}
          rows={3}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Type or paste a short speech sample..."
        />
      </div>

      <div className="p-4 border rounded-lg bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-1">Audio sample (optional)</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            setSpeechAudioFileName(file ? file.name : '');
          }}
          className="block w-full text-sm"
        />
        {speechAudioFileName && <p className="text-xs text-gray-500 mt-2">Selected: {speechAudioFileName}</p>}
      </div>

      <div className="p-4 border rounded-lg bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-1">Teacher observation</label>
        <textarea
          value={speechObservation}
          onChange={(e) => setSpeechObservation(e.target.value)}
          rows={3}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Write short notes about speech clarity and language use..."
        />
      </div>

      <div className="p-4 border rounded-lg bg-white">
        <p className="text-sm font-medium text-gray-700 mb-3">Manual scoring (0 to 3 each)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['clarity', 'vocabulary', 'fluency'].map((field) => (
            <div key={field}>
              <label className="block text-xs text-gray-600 capitalize mb-1">{field}</label>
              <input
                type="number"
                min="0"
                max="3"
                value={speechManualScore[field]}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(3, Number(e.target.value) || 0));
                  setSpeechManualScore((prev) => ({ ...prev, [field]: value }));
                }}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Multi-Disorder Screening</h1>
          <button
            onClick={() => navigate('/teacher')}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Child</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Choose child</option>
              {children.map((child) => (
                <option key={child._id || child.id} value={child._id || child.id}>
                  {child.name} ({child.age || 'N/A'} yrs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Disorder</label>
            <select
              value={disorderType}
              onChange={(e) => setDisorderType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Choose disorder</option>
              {DISORDERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!disorderType && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
            Please select a disorder type to start screening.
          </div>
        )}

        {disorderType === 'ADHD' && renderYesNoQuestionnaire(ADHD_QUESTIONS, adhdAnswers, setAdhdAnswers)}
        {disorderType === 'Anxiety / Behavioral Issues' && renderYesNoQuestionnaire(ANXIETY_QUESTIONS, anxietyAnswers, setAnxietyAnswers)}
        {disorderType === 'Dyslexia' && renderDyslexiaUI()}
        {disorderType === 'Speech & Language Delay' && renderSpeechDelayUI()}

        {validationMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{validationMessage}</div>
        )}

        {submitMessage && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">{submitMessage}</div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Screening'}
          </button>

          {submittedResult && (
            <div className="mt-5 p-5 rounded-xl border border-indigo-100 bg-indigo-50 shadow-sm">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">Screening Result</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Risk Level:</span>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                      submittedResult.riskLevel === 'High Risk'
                        ? 'bg-red-100 text-red-700'
                        : submittedResult.riskLevel === 'Moderate Risk'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {submittedResult.riskLevel}
                  </span>
                </div>
                <p className="text-gray-700">
                  Accuracy: <span className="font-bold text-gray-900">{submittedResult.accuracyPercent}%</span>
                </p>
                <p className="text-gray-700">
                  Total Score: <span className="font-bold text-gray-900">{submittedResult.score}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
