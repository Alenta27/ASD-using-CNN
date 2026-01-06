import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { FaCamera, FaSpinner, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const GazeSnapshotCapture = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleStartCamera = () => {
    setCameraActive(true);
    setError(null);
  };

  const handleTakeSnapshot = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setSnapshot(imageSrc);
      setCameraActive(false);
    }
  };

  const handleAnalyze = async () => {
    if (!snapshot) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      console.log('📷 Sending base64 snapshot for analysis...');

      const apiResponse = await fetch('http://localhost:5000/api/gaze/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: snapshot }),
      });

      const data = await apiResponse.json();

      console.log('📨 API Response status:', apiResponse.status);
      console.log('📨 API Response data:', data);

      if (!apiResponse.ok) {
        console.error('❌ Server error:', data);
        throw new Error(data.error || `HTTP error! status: ${apiResponse.status}`);
      }

      if (data.error) {
        console.error('❌ Analysis error:', data);
        throw new Error(data.error);
      }

      console.log('✅ Gaze analysis complete:', data);
      setResult(data);
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setSnapshot(null);
    setResult(null);
    setCameraActive(true);
  };

  const handleBack = () => {
    navigate('/');
  };

  const GazeIcon = () => (
    <svg className="w-20 h-20 mx-auto mb-6" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" fill="#4f46e5" opacity="0.1" stroke="#4f46e5" strokeWidth="2"/>
      
      {/* Left Eye */}
      <circle cx="22" cy="28" r="6" fill="none" stroke="#4f46e5" strokeWidth="2"/>
      <circle cx="22" cy="28" r="3" fill="#4f46e5"/>
      <circle cx="23" cy="27" r="1" fill="white"/>
      
      {/* Right Eye */}
      <circle cx="42" cy="28" r="6" fill="none" stroke="#4f46e5" strokeWidth="2"/>
      <circle cx="42" cy="28" r="3" fill="#4f46e5"/>
      <circle cx="43" cy="27" r="1" fill="white"/>
      
      {/* Gaze Direction Lines */}
      <line x1="22" y1="28" x2="12" y2="20" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <line x1="42" y1="28" x2="52" y2="20" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      
      {/* Attention Indicator */}
      <circle cx="32" cy="45" r="4" fill="#10b981" opacity="0.8"/>
      <circle cx="32" cy="45" r="8" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-400 via-indigo-300 to-blue-400 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-white mb-8 hover:opacity-80 transition-opacity font-semibold"
        >
          <FaArrowLeft className="mr-2" />
          Back
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <GazeIcon />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">Live Gaze Analysis</h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Capture a single snapshot for real-time gaze direction and attention score analysis
            </p>
          </div>

          {/* Camera Active State */}
          {cameraActive && !snapshot ? (
            <div className="mb-8">
              <div className="rounded-2xl overflow-hidden shadow-lg mb-6 bg-black">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/png"
                  width="100%"
                  height="auto"
                  videoConstraints={{ width: 1280, height: 720 }}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  Position yourself in the center of the frame. Ensure good lighting and clear view of your face.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCameraActive(false)}
                  className="flex-1 py-3 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTakeSnapshot}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FaCamera /> Take Snapshot
                </button>
              </div>
            </div>
          ) : null}

          {/* Snapshot Review State */}
          {snapshot && !analyzing && !result ? (
            <div className="mb-8">
              <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
                <img src={snapshot} alt="Gaze snapshot" className="w-full" />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  Review your snapshot. Click "Analyze Gaze" to process or "Retake" for a new snapshot.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
                >
                  Retake Snapshot
                </button>
                <button
                  onClick={handleAnalyze}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #4f46e5 0%, #6366f1 100%)' }}
                >
                  🔍 Analyze Gaze
                </button>
              </div>
            </div>
          ) : null}

          {/* Initial State - No Camera */}
          {!cameraActive && !snapshot && !analyzing && !result ? (
            <div className="mb-8">
              <button
                onClick={handleStartCamera}
                className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-300 flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(to right, #4f46e5 0%, #6366f1 100%)' }}
              >
                <FaCamera className="text-xl" />
                Start Camera
              </button>
            </div>
          ) : null}

          {/* Error Display */}
          {error ? (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-center">
                <FaExclamationTriangle className="text-red-500 text-xl mr-3" />
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Analyzing State */}
          {analyzing ? (
            <div className="mb-8 text-center">
              <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-700 font-semibold">Analyzing gaze patterns...</p>
            </div>
          ) : null}

          {/* Results Display */}
          {result ? (
            <div className="space-y-6">
              {/* Result Summary */}
              <div className="bg-indigo-50 rounded-xl p-8 border-2 border-indigo-300">
                <div className="text-center">
                  <h2 className="text-sm uppercase tracking-wider text-gray-600 font-semibold mb-2">Gaze Analysis Result</h2>
                  <p className="text-4xl font-bold text-indigo-600 mb-2">
                    {result.attention_score >= 0.7 ? '👁️ High Attention' : result.attention_score >= 0.4 ? '👀 Moderate Attention' : '👁️ Low Attention'}
                  </p>
                  <p className="text-gray-600 text-lg mt-3">
                    {result.attention_score >= 0.7 
                      ? 'Your gaze pattern shows strong attention focus.'
                      : result.attention_score >= 0.4
                      ? 'Your gaze pattern shows moderate attention focus.'
                      : 'Your gaze pattern indicates divided attention.'}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Gaze Direction</h3>
                  <p className="text-2xl font-bold text-indigo-600 capitalize">{result.gaze_direction}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Attention Score</h3>
                  <p className="text-2xl font-bold text-green-600">{(result.attention_score * 100).toFixed(1)}%</p>
                </div>
                              </div>

              {/* Snapshot Display */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Analyzed Snapshot</h3>
                <img src={snapshot} alt="Analyzed snapshot" className="w-full rounded-lg" />
              </div>

              {/* About This Tool */}
              <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-500">
                <h3 className="text-blue-900 font-bold text-lg mb-3">About This Tool</h3>
                <div className="space-y-2 text-gray-700 text-sm">
                  <p><span className="font-semibold">Technology:</span> MediaPipe Face Mesh for facial landmark detection</p>
                  <p><span className="font-semibold">Analysis:</span> Gaze direction, head pose, and attention consistency estimation</p>
                  <p className="text-blue-900 font-semibold mt-3">⚠️ Note: This is a screening tool for educational purposes, not a clinical diagnosis</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setResult(null);
                    setSnapshot(null);
                  }}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                >
                  Analyze Another
                </button>
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GazeSnapshotCapture;
