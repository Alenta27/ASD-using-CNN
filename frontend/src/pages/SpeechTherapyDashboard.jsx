import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Volume2, ThumbsUp, ThumbsDown, MinusCircle, Clock, CheckCircle, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';

export default function SpeechTherapyDashboard() {
  const [pendingSessions, setPendingSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rating, setRating] = useState('');
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending or progress
  const [selectedChildForProgress, setSelectedChildForProgress] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    fetchPendingSessions();
    fetchChildren();
  }, []);

  const fetchPendingSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/speech-therapy/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pending sessions:', error);
    }
  };

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      let endpoint = '';
      if (user.role === 'teacher') {
        endpoint = 'http://localhost:5000/api/teacher/students';
      } else if (user.role === 'therapist') {
        endpoint = 'http://localhost:5000/api/therapist/patients';
      }

      if (endpoint) {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChildren(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchProgressData = async (childId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/speech-therapy/progress/${childId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressData(response.data);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    }
  };

  const playAudio = (sessionId) => {
    const token = localStorage.getItem('token');
    const audioUrl = `http://localhost:5000/api/speech-therapy/audio/${sessionId}?token=${token}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      alert('Could not play audio. Please try again.');
    });
  };

  const handleEvaluate = async () => {
    if (!rating) {
      alert('Please select a rating!');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/speech-therapy/evaluate/${selectedSession._id}`,
        { rating, feedback, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmitStatus({ type: 'success', message: 'Evaluation submitted successfully!' });
      
      // Refresh pending sessions and clear form
      fetchPendingSessions();
      setSelectedSession(null);
      setRating('');
      setFeedback('');
      setNotes('');

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit evaluation. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Good': return 'text-green-600 bg-green-50 border-green-300';
      case 'Average': return 'text-yellow-600 bg-yellow-50 border-yellow-300';
      case 'Poor': return 'text-red-600 bg-red-50 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-300';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Speech Therapy Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Review recordings, provide feedback, and track student progress
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pending Reviews ({pendingSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'progress'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Progress Reports
          </button>
        </div>

        {/* Pending Reviews Tab */}
        {activeTab === 'pending' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Pending Sessions
              </h2>
              
              {pendingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                  <p className="text-gray-600">All caught up! No pending reviews.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {pendingSessions.map((session) => (
                    <div
                      key={session._id}
                      onClick={() => setSelectedSession(session)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedSession?._id === session._id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {session.childId?.name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {session.childId?.age} years • Grade {session.childId?.grade || 'N/A'}
                          </p>
                          <p className="text-sm text-indigo-600 mt-1 font-medium">
                            "{session.practicePrompt}"
                          </p>
                        </div>
                        <Clock className="text-gray-400" size={18} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(session.sessionDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evaluation Panel */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
              {!selectedSession ? (
                <div className="flex items-center justify-center h-full text-center py-20">
                  <div>
                    <AlertCircle className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="text-gray-600 text-lg">
                      Select a session to review and evaluate
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Session Details */}
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedSession.childId?.name}'s Recording
                    </h2>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span>Age: {selectedSession.childId?.age}</span>
                      <span>•</span>
                      <span>Session #{selectedSession.sessionNumber}</span>
                      <span>•</span>
                      <span>{formatDate(selectedSession.sessionDate)}</span>
                    </div>
                  </div>

                  {/* Practice Prompt */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Practice Prompt:</p>
                    <p className="text-2xl font-bold text-blue-700">
                      "{selectedSession.practicePrompt}"
                    </p>
                  </div>

                  {/* Audio Player */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-800 mb-3">Listen to Recording:</h3>
                    <button
                      onClick={() => playAudio(selectedSession._id)}
                      className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-3 transition"
                    >
                      <Volume2 size={24} />
                      Play Audio
                    </button>
                  </div>

                  {/* Rating Selection */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rate the Performance:</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setRating('Poor')}
                        className={`p-4 rounded-lg border-2 transition ${
                          rating === 'Poor'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 hover:border-red-300'
                        }`}
                      >
                        <ThumbsDown className={`mx-auto mb-2 ${rating === 'Poor' ? 'text-red-600' : 'text-gray-400'}`} size={32} />
                        <p className="font-semibold">Poor</p>
                      </button>
                      <button
                        onClick={() => setRating('Average')}
                        className={`p-4 rounded-lg border-2 transition ${
                          rating === 'Average'
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-300 hover:border-yellow-300'
                        }`}
                      >
                        <MinusCircle className={`mx-auto mb-2 ${rating === 'Average' ? 'text-yellow-600' : 'text-gray-400'}`} size={32} />
                        <p className="font-semibold">Average</p>
                      </button>
                      <button
                        onClick={() => setRating('Good')}
                        className={`p-4 rounded-lg border-2 transition ${
                          rating === 'Good'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 hover:border-green-300'
                        }`}
                      >
                        <ThumbsUp className={`mx-auto mb-2 ${rating === 'Good' ? 'text-green-600' : 'text-gray-400'}`} size={32} />
                        <p className="font-semibold">Good</p>
                      </button>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Feedback Comments:</h3>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide constructive feedback and encouragement..."
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      rows="4"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Additional Notes (Optional):</h3>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional observations or recommendations..."
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      rows="3"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleEvaluate}
                    disabled={isSubmitting || !rating}
                    className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                  </button>

                  {/* Status Message */}
                  {submitStatus && (
                    <div className={`rounded-lg p-4 flex items-center gap-3 ${
                      submitStatus.type === 'success'
                        ? 'bg-green-50 border-2 border-green-300 text-green-800'
                        : 'bg-red-50 border-2 border-red-300 text-red-800'
                    }`}>
                      {submitStatus.type === 'success' ? (
                        <CheckCircle size={24} />
                      ) : (
                        <AlertCircle size={24} />
                      )}
                      <p className="font-semibold">{submitStatus.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Reports Tab */}
        {activeTab === 'progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Children List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Select a Child
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {children.map((child) => (
                  <div
                    key={child._id}
                    onClick={() => {
                      setSelectedChildForProgress(child);
                      fetchProgressData(child._id);
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedChildForProgress?._id === child._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800">{child.name}</h3>
                    <p className="text-sm text-gray-600">
                      {child.age} years • Grade {child.grade || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Report */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
              {!progressData ? (
                <div className="flex items-center justify-center h-full text-center py-20">
                  <div>
                    <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="text-gray-600 text-lg">
                      Select a child to view their progress report
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedChildForProgress?.name}'s Progress
                    </h2>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-blue-700">
                        {progressData.totalSessions}
                      </p>
                      <p className="text-sm text-gray-600">Total Sessions</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-700">
                        {progressData.evaluatedSessions}
                      </p>
                      <p className="text-sm text-gray-600">Evaluated</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-700">
                        {progressData.pendingSessions}
                      </p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-purple-700">
                        {progressData.averageRating.toFixed(1)}/3
                      </p>
                      <p className="text-sm text-gray-600">Avg Rating</p>
                    </div>
                  </div>

                  {/* Improvement Status */}
                  <div className={`rounded-lg p-4 flex items-center gap-3 ${
                    progressData.improvement === 'Improving'
                      ? 'bg-green-50 border-2 border-green-300'
                      : progressData.improvement === 'Needs attention'
                      ? 'bg-orange-50 border-2 border-orange-300'
                      : 'bg-blue-50 border-2 border-blue-300'
                  }`}>
                    <TrendingUp size={32} />
                    <div>
                      <p className="font-bold text-lg">
                        Progress: {progressData.improvement}
                      </p>
                      <p className="text-sm text-gray-600">
                        Based on recent session performance
                      </p>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rating Distribution:</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm font-semibold text-green-700">Good</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-green-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{
                              width: `${(progressData.ratingDistribution.good / progressData.evaluatedSessions) * 100}%`
                            }}
                          >
                            {progressData.ratingDistribution.good}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm font-semibold text-yellow-700">Average</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-yellow-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{
                              width: `${(progressData.ratingDistribution.average / progressData.evaluatedSessions) * 100}%`
                            }}
                          >
                            {progressData.ratingDistribution.average}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 text-sm font-semibold text-red-700">Poor</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-red-500 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                            style={{
                              width: `${(progressData.ratingDistribution.poor / progressData.evaluatedSessions) * 100}%`
                            }}
                          >
                            {progressData.ratingDistribution.poor}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session History */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Recent Sessions:</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {progressData.sessions.slice(0, 10).map((session, idx) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">
                                Session #{session.sessionNumber}
                              </p>
                              <p className="text-sm text-gray-600">
                                "{session.practicePrompt}"
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getRatingColor(session.rating)}`}>
                              {session.rating}
                            </span>
                          </div>
                          {session.feedback && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              "{session.feedback}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(session.date)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
