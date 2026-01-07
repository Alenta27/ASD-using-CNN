import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { FaCamera, FaSpinner, FaExclamationTriangle, FaArrowLeft, FaStop, FaPlay } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const GazeSnapshotCapture = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const webcamRef = useRef(null);
  
  // Get patientId from query params
  const queryParams = new URLSearchParams(location.search);
  const patientId = queryParams.get('patientId');

  const [cameraActive, setCameraActive] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Automatic mode states
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [autoCounter, setAutoCounter] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleStartCamera = () => {
    setCameraActive(true);
    setError(null);
  };

  const startSession = async () => {
    if (!patientId) {
      setError("No patient selected. Please start from the therapist dashboard.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/gaze/session/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ patientId })
      });

      if (!response.ok) throw new Error("Failed to start session");
      
      const session = await response.json();
      setSessionId(session._id);
      setIsAutoMode(true);
      setCameraActive(true);
      
      // Start auto capturing
      scheduleNextCapture();
    } catch (err) {
      setError(`Session failed: ${err.message}`);
    }
  };

  const scheduleNextCapture = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      await captureAndUpload();
      scheduleNextCapture();
    }, 4000); // Capture every 4 seconds
  };

  const stopSession = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAutoMode(false);
    
    if (sessionId) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/gaze/session/end/${sessionId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }
    setSessionId(null);
  };

  const captureAndUpload = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      setAutoCounter(prev => prev + 1);
      
      try {
        // Convert base64 to blob
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        
        const formData = new FormData();
        formData.append('image', blob, 'snapshot.png');
        formData.append('analyze', 'true');

        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/gaze/snapshot/${sessionId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        console.log(`Snapshot ${autoCounter + 1} uploaded`);
      } catch (err) {
        console.error("Auto-capture upload failed:", err);
      }
    }
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
      // 1. Analyze for immediate feedback
      const apiResponse = await fetch('http://localhost:5000/api/gaze/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: snapshot }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);

      // 2. If a session is active, upload to therapist dashboard
      if (sessionId) {
        const res = await fetch(snapshot);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('image', blob, 'manual-snapshot.png');
        formData.append('analyze', 'false'); // We already have results
        formData.append('sessionId', sessionId);

        const token = localStorage.getItem('token');
        await fetch(`http://localhost:5000/api/gaze/snapshot/${sessionId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => {
    if (isAutoMode) stopSession();
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 text-white">
      <div className="max-w-4xl mx-auto">
        <button onClick={handleBack} className="flex items-center mb-8 hover:text-indigo-400 transition-colors">
          <FaArrowLeft className="mr-2" /> Back
        </button>

        <div className="bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Live Gaze Analysis</h1>
              <p className="text-slate-400">
                {isAutoMode ? `Session Active - Capturing snapshots automatically` : 'Capturing live gaze patterns for ASD screening'}
              </p>
            </div>
            
            <div className="flex gap-4">
              {!isAutoMode ? (
                <button 
                  onClick={startSession}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                  <FaPlay /> Start Live Session
                </button>
              ) : (
                <button 
                  onClick={stopSession}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all animate-pulse"
                >
                  <FaStop /> End Session ({autoCounter})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Camera Preview */}
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-200">
                  <FaExclamationTriangle className="flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-slate-700">
                {cameraActive || isAutoMode ? (
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/png"
                    className="w-full h-full object-cover"
                    videoConstraints={{ width: 1280, height: 720 }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button onClick={handleStartCamera} className="bg-slate-700 p-6 rounded-full hover:bg-slate-600 transition">
                      <FaCamera size={40} />
                    </button>
                  </div>
                )}
                
                {isAutoMode && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/80 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    Live Recording
                  </div>
                )}
              </div>

              {!isAutoMode && cameraActive && (
                <button 
                  onClick={handleTakeSnapshot}
                  className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition"
                >
                  Manual Snapshot
                </button>
              )}
            </div>

            {/* Analysis / Results */}
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
              {analyzing ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-indigo-500 mb-4" />
                  <p className="text-slate-400">Processing facial landmarks...</p>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${result.attention_score > 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {(result.attention_score * 100).toFixed(0)}%
                    </div>
                    <p className="text-slate-400 uppercase tracking-widest text-sm font-semibold">Attention Score</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Direction</p>
                      <p className="text-xl font-bold capitalize">{result.gaze_direction}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <p className="text-xl font-bold">{result.attention_score > 0.6 ? 'Engaged' : 'Distracted'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-400">Quick Tips</h3>
                    <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                      <li>Maintain natural lighting</li>
                      <li>Face the camera directly</li>
                      <li>Avoid heavy backlighting</li>
                    </ul>
                  </div>
                </div>
              ) : snapshot ? (
                <div className="space-y-4">
                  <img src={snapshot} alt="Preview" className="w-full rounded-xl border border-slate-700" />
                  <div className="flex gap-2">
                    <button onClick={() => setSnapshot(null)} className="flex-1 py-2 bg-slate-700 rounded-lg hover:bg-slate-600">Retake</button>
                    <button onClick={handleAnalyze} className="flex-1 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 font-bold">Analyze</button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                    <FaCamera size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">No Analysis Data</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Start a live session or take a manual snapshot to see gaze analysis metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GazeSnapshotCapture;
