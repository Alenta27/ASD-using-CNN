import React, { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FiCamera, FiAlertTriangle } from 'react-icons/fi';
import './GameStyles.css';

const SocialAttentionGame = ({ studentId, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(20);
  const [attentionData, setAttentionData] = useState({ humanTime: 0, objectTime: 0, distractions: 0 });
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [currentGaze, setCurrentGaze] = useState(null); // 'left', 'right', or null
  
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    initializeLandmarker();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopCamera();
    };
  }, []);

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
      setCameraError("Failed to load tracking models");
      setIsLoadingModel(false);
    }
  };

  const startTest = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCapturing(true);
          videoRef.current.play();
          requestRef.current = requestAnimationFrame(predictWebcam);
          startTimer();
        };
      }
    } catch (err) {
      setCameraError("Camera required for social attention tracking");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
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

  const predictWebcam = () => {
    if (!videoRef.current || !landmarkerRef.current || !isCapturing) return;

    const startTimeMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        processGaze(results.faceLandmarks[0]);
      } else {
        setAttentionData(prev => ({ ...prev, distractions: prev.distractions + 1 }));
        setCurrentGaze(null);
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

    // Map gaze to screen halves
    // Human is on left (0.0 to 0.5 in screen space, which might mean iris x > 0.55 if mirrored)
    // For simplicity, let's assume mirrored webcam: looking left means iris x is smaller
    
    if (irisAvgX < 0.45) {
      setAttentionData(prev => ({ ...prev, humanTime: prev.humanTime + 1 }));
      setCurrentGaze('left');
    } else if (irisAvgX > 0.55) {
      setAttentionData(prev => ({ ...prev, objectTime: prev.objectTime + 1 }));
      setCurrentGaze('right');
    } else {
      setCurrentGaze(null);
    }
  };

  const finishTest = () => {
    const total = attentionData.humanTime + attentionData.objectTime + attentionData.distractions || 1;
    const socialPreference = (attentionData.humanTime / (attentionData.humanTime + attentionData.objectTime || 1)) * 100;

    const assessmentData = {
      studentId,
      assessmentType: 'social-attention',
      score: Math.round(socialPreference),
      metrics: {
        humanVideoViewTime: Math.round(attentionData.humanTime / 30),
        objectAnimationViewTime: Math.round(attentionData.objectTime / 30),
        socialResponseTime: parseFloat(socialPreference.toFixed(2))
      },
      indicators: [
        {
          label: 'Social Preference',
          status: socialPreference > 55 ? 'Social Interest' : socialPreference > 40 ? 'Balanced' : 'Object Interest',
          color: socialPreference > 55 ? '#10b981' : socialPreference > 40 ? '#3b82f6' : '#f59e0b'
        },
        {
          label: 'Attention Distribution',
          status: socialPreference > 70 ? 'Highly Social' : socialPreference > 30 ? 'Balanced' : 'Restricted',
          color: socialPreference > 70 ? '#10b981' : socialPreference > 30 ? '#3b82f6' : '#ef4444'
        }
      ],
      rawGameData: attentionData
    };

    stopCamera();
    onComplete(assessmentData);
  };

  if (cameraError) {
    return (
      <div className="game-error-state">
        <FiAlertTriangle size={48} color="#ef4444" />
        <h3>Camera Required</h3>
        <p>{cameraError}</p>
        <button className="option-button correct" onClick={startTest}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="game-wrapper">
      <div className="game-card" style={{ maxWidth: '900px' }}>
        <div className="game-progress">Time Remaining: {timeLeft}s</div>
        
        {!isCapturing ? (
          <div className="start-screen">
            <h2>Social Attention Test</h2>
            <p className="game-instruction">
              {isLoadingModel ? "Loading tracking models..." : "Two videos will play side by side. We'll measure which one you prefer looking at."}
            </p>
            <button 
              className="option-button correct" 
              onClick={startTest}
              disabled={isLoadingModel}
            >
              <FiCamera style={{ marginRight: '8px' }} />
              {isLoadingModel ? "Initializing..." : "Start Test"}
            </button>
          </div>
        ) : (
          <div className="social-attention-active">
            <div className="split-screen-game">
              <div className={`attention-side human ${currentGaze === 'left' ? 'focused' : ''}`}>
                <div className="placeholder-video">👤 Social Stimulus</div>
                <p>Human Interaction</p>
              </div>
              <div className={`attention-side object ${currentGaze === 'right' ? 'focused' : ''}`}>
                <div className="placeholder-video">⚙️ Geometric Pattern</div>
                <p>Moving Objects</p>
              </div>
            </div>
            
            <div className="video-container tracking-hidden">
              <video ref={videoRef} playsInline muted style={{ width: '100px', height: '75px' }} />
              <div className="tracking-status">
                <span className="status-dot pulsing"></span> Tracking Gaze
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialAttentionGame;
