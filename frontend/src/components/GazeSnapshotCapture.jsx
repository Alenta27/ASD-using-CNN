import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { FaCamera, FaSpinner, FaExclamationTriangle, FaArrowLeft, FaStop, FaPlay, FaPaperPlane, FaUser, FaEnvelope, FaTimes } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const GazeSnapshotCapture = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const webcamRef = useRef(null);
  
  // API Base URL from environment or default
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // Get patientId from query params (only for authenticated users starting from dashboard)
  const queryParams = new URLSearchParams(location.search);
  const patientId = queryParams.get('patientId');
  const token = localStorage.getItem('token');

  const [cameraActive, setCameraActive] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [localSnapshots, setLocalSnapshots] = useState([]); // Store snapshots locally
  const [sending, setSending] = useState(false);
  
  // Automatic mode states
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [autoCounter, setAutoCounter] = useState(0);
  const timeoutRef = useRef(null);

  // Guest details state
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [isGuest, setIsGuest] = useState(!patientId);
  const [guestInfo, setGuestInfo] = useState({
    childName: '',
    parentName: '',
    email: ''
  });

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

  const startSession = async (guestData = null) => {
    // If no patientId provided and no guest data yet, show form
    if (!patientId && !guestData) {
      setShowGuestForm(true);
      return;
    }

    try {
      const endpoint = patientId ? `${apiBaseUrl}/api/gaze/session/start` : `${apiBaseUrl}/api/gaze/session/guest/start`;
      const body = patientId ? { patientId } : guestData;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start session");
      
      const session = data;
      setSessionId(session._id);
      setIsAutoMode(true);
      setCameraActive(true);
      setAutoCounter(0);
      setShowGuestForm(false);
      
      // Start auto capturing
      scheduleNextCapture();
      return session._id;
    } catch (err) {
      setError(`Session failed: ${err.message}`);
      throw err;
    }
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (!guestInfo.childName || !guestInfo.parentName) {
      setError("Please fill in mandatory fields.");
      return;
    }
    await startSession(guestInfo);
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
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        await fetch(`${apiBaseUrl}/api/gaze/session/end/${sessionId}`, {
          method: 'POST',
          headers
        });
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }
  };

  const captureAndUpload = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      setAutoCounter(prev => prev + 1);
      
      try {
        // 1. Analyze for immediate feedback
        const apiResponse = await fetch(`${apiBaseUrl}/api/gaze/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageSrc }),
        });
        const data = await apiResponse.json();
        
        if (apiResponse.ok) {
          setResult(data);
          
          // Store locally for bulk upload if live upload fails or as backup
          const snapshotInfo = {
            image: imageSrc,
            timestamp: new Date().toISOString(),
            attentionScore: data.attention_score,
            gazeDirection: data.gaze_direction
          };
          
          setLocalSnapshots(prev => [...prev, snapshotInfo]);

          // 2. SEND LIVE TO THERAPIST DASHBOARD
          if (sessionId) {
            try {
              const res = await fetch(imageSrc);
              const blob = await res.blob();
              const formData = new FormData();
              formData.append('image', blob, `auto-${Date.now()}.png`);
              formData.append('analyze', 'false'); // Already analyzed
              formData.append('sessionId', sessionId);
              formData.append('attentionScore', data.attention_score);
              formData.append('gazeDirection', data.gaze_direction);

              const uploadHeaders = {};
              if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;

              await fetch(`${apiBaseUrl}/api/gaze/snapshot/${sessionId}`, {
                method: 'POST',
                headers: uploadHeaders,
                body: formData
              });
            } catch (liveErr) {
              console.error("Live upload failed, kept in localSnapshots:", liveErr);
            }
          }
        }
      } catch (err) {
        console.error("Analysis failed:", err);
        // Still store the image even if analysis failed
        setLocalSnapshots(prev => [...prev, {
          image: imageSrc,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  };

  const sendForReview = async () => {
    let currentSessionId = sessionId;
    
    // If no active session but we have snapshots, start one
    if (!currentSessionId) {
      if (!patientId && !guestInfo.childName) {
        setShowGuestForm(true);
        return;
      }

      if (localSnapshots.length === 0) {
        setError("No analysis data to send. Please take a snapshot first.");
        return;
      }
      
      setSending(true);
      try {
        currentSessionId = await startSession(token ? null : guestInfo);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsAutoMode(false);
      } catch (err) {
        setSending(false);
        return;
      }
    } else {
      setSending(true);
    }
    
    setError(null);
    
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${apiBaseUrl}/api/gaze/session/send-for-review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: currentSessionId,
          patientId: token ? patientId : null,
          endTime: new Date().toISOString(),
          snapshots: localSnapshots 
        })
      });

      if (!response.ok) throw new Error("Failed to send for review");
      
      alert("Session sent to therapist dashboard successfully!");
      setLocalSnapshots([]);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsAutoMode(false);
      setSessionId(null); 
      navigate(token ? '/dashboard' : '/'); 
    } catch (err) {
      setError(`Submit failed: ${err.message}`);
    } finally {
      setSending(false);
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
      const apiResponse = await fetch(`${apiBaseUrl}/api/gaze/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: snapshot }),
      });

      const data = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);

      // Add to local snapshots so it can be sent for review
      setLocalSnapshots(prev => [...prev, {
        image: snapshot,
        timestamp: new Date().toISOString(),
        attentionScore: data.attention_score,
        gazeDirection: data.gaze_direction
      }]);

      // 2. If a session is active, upload to therapist dashboard live
      if (sessionId) {
        const res = await fetch(snapshot);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('image', blob, 'manual-snapshot.png');
        formData.append('analyze', 'false');
        formData.append('sessionId', sessionId);
        formData.append('attentionScore', data.attention_score);
        formData.append('gazeDirection', data.gaze_direction);

        const uploadHeaders = {};
        if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;

        await fetch(`${apiBaseUrl}/api/gaze/snapshot/${sessionId}`, {
          method: 'POST',
          headers: uploadHeaders,
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

        <div className="bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-700 relative">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Live Gaze Analysis</h1>
              <p className="text-slate-400">
                {isAutoMode ? `Session Active - Capturing snapshots automatically` : 'Capturing live gaze patterns for ASD screening'}
              </p>
              {!patientId && (
                <div className="mt-2 inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/20">
                  <FaUser size={10} /> Guest Mode Enabled
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={sendForReview}
                disabled={sending || (!sessionId && localSnapshots.length === 0)}
                className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
              >
                {sending ? <FaSpinner className="animate-spin" /> : <><FaPaperPlane /> Send for Review</>}
              </button>

              {isAutoMode ? (
                <button 
                  onClick={stopSession}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all animate-pulse shadow-lg shadow-red-500/20"
                >
                  <FaStop /> End Session ({autoCounter})
                </button>
              ) : (
                <button 
                  onClick={() => startSession()}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                >
                  <FaPlay /> Start Live Session
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

          {/* Guest Form Modal */}
          {showGuestForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-indigo-600">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FaUser /> Guest Information
                  </h2>
                  <button onClick={() => setShowGuestForm(false)} className="text-white/80 hover:text-white transition-colors">
                    <FaTimes size={20} />
                  </button>
                </div>
                <form onSubmit={handleGuestSubmit} className="p-8 space-y-5">
                  <p className="text-slate-400 text-sm mb-6">Please provide these details so a therapist can review your session results.</p>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Child's Name *</label>
                    <div className="relative">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        required
                        type="text" 
                        value={guestInfo.childName}
                        onChange={(e) => setGuestInfo({...guestInfo, childName: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                        placeholder="John Doe Jr."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Parent/Guardian Name *</label>
                    <div className="relative">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        required
                        type="text" 
                        value={guestInfo.parentName}
                        onChange={(e) => setGuestInfo({...guestInfo, parentName: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                        placeholder="John Doe Sr."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Contact Email</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="email" 
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                        placeholder="parent@example.com"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      <FaPlay /> Start Analysis
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GazeSnapshotCapture;
