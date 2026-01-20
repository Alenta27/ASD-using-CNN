import React, { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FiCamera, FiAlertTriangle, FiLoader, FiCheckCircle } from 'react-icons/fi';
import './GameStyles.css';

const SocialAttentionGame = ({ studentId, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentGaze, setCurrentGaze] = useState('center');
  const [testResults, setTestResults] = useState(null);
  const [videosReady, setVideosReady] = useState({ left: false, right: false });
  const [videoSources, setVideoSources] = useState({
    left: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    right: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  });
  
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const leftStimulusRef = useRef(null);
  const rightStimulusRef = useRef(null);
  const logIntervalRef = useRef(null);
  const containerRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    initializeLandmarker();
    fetchInitialVideoSources();
    setupCamera(); // Request camera early for smoother transition
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      stopCamera();
    };
  }, []);

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access deferred or denied:", err);
      // We don't set error here yet, let startTest handle it if they click start
    }
  };

  // Pre-fetch video URLs so the previews show local videos if available
  const fetchInitialVideoSources = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/social-attention/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId, dryRun: true }) // Dry run to just get URLs
      });
      if (res.ok) {
        const { leftVideo, rightVideo } = await res.json();
        if (leftVideo && rightVideo) {
          console.log("Local videos detected:", { leftVideo, rightVideo });
          setVideoSources({ left: leftVideo, right: rightVideo });
        }
      }
    } catch (err) {
      console.warn("Could not pre-fetch local video URLs, using defaults.");
    }
  };

  const initializeLandmarker = async () => {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numFaces: 1
      });
      setIsLoadingModel(false);
    } catch (err) {
      console.error("Error initializing MediaPipe:", err);
      setCameraError("Assessment service unavailable. (Model Load Failed)");
      setIsLoadingModel(false);
    }
  };

  const startTest = async () => {
    setCameraError(null);
    try {
      const token = localStorage.getItem('token');
      const startRes = await fetch(`${API_BASE}/api/social-attention/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId })
      });

      if (!startRes.ok) {
        throw new Error("Assessment service unavailable. (Backend error)");
      }

      const { sessionId: newSessionId, leftVideo, rightVideo } = await startRes.json();
      setSessionId(newSessionId);
      
      if (leftVideo && rightVideo) {
        setVideoSources({ left: leftVideo, right: rightVideo });
      }

      let stream = cameraStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        }).catch(err => {
          throw new Error("Camera Required for assessment.");
        });
        setCameraStream(stream);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCapturing(true);
          videoRef.current.play();
          
          if (containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
          }

          // Start BOTH stimulus videos simultaneously
          setTimeout(() => {
            if (leftStimulusRef.current) leftStimulusRef.current.play().catch(e => console.error("Left video play error", e));
            if (rightStimulusRef.current) rightStimulusRef.current.play().catch(e => console.error("Right video play error", e));
          }, 800);
          
          requestRef.current = requestAnimationFrame(predictWebcam);
          startTimer();
          startGazeLogging(newSessionId);
        };
      }
    } catch (err) {
      console.error(err);
      setCameraError(err.message);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startTimer = () => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGazeLogging = (id) => {
    logIntervalRef.current = setInterval(() => {
      logFrameToBackend(id, currentGaze);
    }, 300); 
  };

  const logFrameToBackend = async (id, gaze) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/social-attention/frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: id,
          gaze,
          timestamp: Date.now()
        })
      });
    } catch (err) {
      console.error("Failed to log frame:", err);
    }
  };

  const predictWebcam = () => {
    if (!videoRef.current || !landmarkerRef.current || !isCapturing) return;

    const startTimeMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        processGaze(results.faceLandmarks[0]);
      } else {
        setCurrentGaze('center');
      }
    }

    if (isCapturing && timeLeft > 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const processGaze = (landmarks) => {
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    const irisAvgX = (leftIris.x + rightIris.x) / 2;

    if (irisAvgX < 0.45) {
      setCurrentGaze('left');
    } else if (irisAvgX > 0.55) {
      setCurrentGaze('right');
    } else {
      setCurrentGaze('center');
    }
  };

  const finishTest = async () => {
    setIsCapturing(false);
    stopCamera();
    if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    
    if (leftStimulusRef.current) leftStimulusRef.current.pause();
    if (rightStimulusRef.current) rightStimulusRef.current.pause();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    try {
      const token = localStorage.getItem('token');
      const finishRes = await fetch(`${API_BASE}/api/social-attention/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (finishRes.ok) {
        const results = await finishRes.json();
        setTestResults(results);
      }
    } catch (err) {
      console.error("Error finishing test:", err);
    }
  };

  if (testResults) {
    return (
      <div className="social-attention-results-view">
        <div className="results-card">
          <FiCheckCircle size={64} color="#10b981" />
          <h2>Social Attention Result</h2>
          <div className="results-stats">
            <div className="stat-row">
              <span>Social Preference Score:</span>
              <strong style={{ color: testResults.riskFlag ? '#ef4444' : '#10b981' }}>
                {testResults.socialPreferenceScore.toFixed(1)}%
              </strong>
            </div>
            <div className="stat-row">
              <span>Social (Left) Time:</span>
              <strong>{(testResults.leftLookTime / 1000).toFixed(1)}s</strong>
            </div>
            <div className="stat-row">
              <span>Non-Social (Right) Time:</span>
              <strong>{(testResults.rightLookTime / 1000).toFixed(1)}s</strong>
            </div>
          </div>
          <div className="interpretation-box">
             <p><strong>Interpretation:</strong> {testResults.clinicalSummary}</p>
          </div>
          <button className="finish-btn" onClick={() => onComplete(testResults)}>
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="game-error-state">
        <FiAlertTriangle size={48} color="#ef4444" />
        <h3>Assessment Error</h3>
        <p>{cameraError}</p>
        <button className="option-button correct" onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="social-attention-test-fullscreen" ref={containerRef}>
      {!isCapturing ? (
        <div className="start-screen-clinical">
          <div className="clinical-header">
            <h2>Social Attention Test</h2>
            <p>Behavioural Assessment (Preferential Looking Paradigm)</p>
          </div>
          <div className="clinical-instructions">
            <p>Two videos will play side by side for 30 seconds. Gaze tracking will measure social preference.</p>
            <div className="video-previews">
                <div className="preview-box">
                    <span>SOCIAL VIDEO (LEFT)</span>
                    <video 
                        src={videoSources.left}
                        muted 
                        playsInline 
                        crossOrigin="anonymous"
                        onCanPlay={() => setVideosReady(v => ({...v, left: true}))}
                        onError={(e) => {
                          console.error("Left Video Load Error:", e);
                          setVideoSources(prev => ({...prev, left: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"}));
                        }}
                        style={{ width: '100%', borderRadius: '8px', marginTop: '10px' }}
                    />
                </div>
                <div className="preview-box">
                    <span>NON-SOCIAL VIDEO (RIGHT)</span>
                    <video 
                        src={videoSources.right}
                        muted 
                        playsInline 
                        crossOrigin="anonymous"
                        onCanPlay={() => setVideosReady(v => ({...v, right: true}))}
                        onError={(e) => {
                          console.error("Right Video Load Error:", e);
                          setVideoSources(prev => ({...prev, right: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}));
                        }}
                        style={{ width: '100%', borderRadius: '8px', marginTop: '10px' }}
                    />
                </div>
            </div>
            <p className="highlight-instruction">"Please let the child watch naturally. Assessment will begin in fullscreen."</p>
          </div>
          <button 
            className="clinical-start-btn" 
            onClick={startTest}
            disabled={isLoadingModel}
          >
            {isLoadingModel ? <FiLoader className="spin" /> : "Start 30s Assessment"}
          </button>
        </div>
      ) : (
        <div className="clinical-test-active">
          <div className="test-top-bar" style={{ zIndex: 100 }}>
            <h3>Social Attention Test</h3>
            <div className="test-progress-container">
                <div className="test-progress-bar" style={{ width: `${(30 - timeLeft) / 30 * 100}%` }}></div>
            </div>
            <span className="test-timer">{timeLeft}s</span>
          </div>

          <div className="clinical-video-panels" style={{ display: 'flex', width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
            <div className="video-panel left-social" style={{ flex: 1, overflow: 'hidden' }}>
                <video 
                  ref={leftStimulusRef}
                  src={videoSources.left}
                  muted 
                  playsInline 
                  loop
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            </div>
            <div className="video-panel right-non-social" style={{ flex: 1, overflow: 'hidden' }}>
                <video 
                  ref={rightStimulusRef}
                  src={videoSources.right}
                  muted 
                  playsInline 
                  loop
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
            </div>
          </div>

          <div className="clinical-bottom-instruction" style={{ zIndex: 100, position: 'absolute', bottom: '20px', width: '100%', textAlign: 'center', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            "Please let the child watch naturally. Gaze Tracking Active."
          </div>
        </div>
      )}
      {/* Hidden video for MediaPipe processing - MUST be always present in DOM for refs to work */}
      <video 
        ref={videoRef} 
        playsInline 
        muted 
        style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }} 
      />
    </div>
  );
};

export default SocialAttentionGame;
