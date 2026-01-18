import React, { useState, useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FiCamera, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import './GameStyles.css';

const ACTIONS = [
  { name: 'Smile', emoji: '😊', blendshape: 'mouthSmileLeft', threshold: 0.5 },
  { name: 'Open Mouth', emoji: '😮', blendshape: 'jawOpen', threshold: 0.4 },
  { name: 'Blink Both Eyes', emoji: '😉', blendshape: 'eyeBlinkLeft', threshold: 0.6 },
  { name: 'Tilt Head Left', emoji: '👈', type: 'tilt', direction: 'left' }
];

const ImitationGame = ({ studentId, onComplete }) => {
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [imitationScores, setImitationScores] = useState([]);
  const [timer, setTimer] = useState(5);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [detectionFeedback, setDetectionFeedback] = useState("");
  
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const requestRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const currentRoundScoreRef = useRef(0);

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
        outputFaceBlendshapes: true,
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

  const startImitation = async () => {
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
          setTimer(5);
          requestRef.current = requestAnimationFrame(predictWebcam);
        };
      }
    } catch (err) {
      setCameraError("Camera required for assessment");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  useEffect(() => {
    let interval = null;
    if (isCapturing && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (isCapturing && timer === 0) {
      handleRoundEnd();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCapturing, timer]);

  const predictWebcam = () => {
    if (!videoRef.current || !landmarkerRef.current || !isCapturing) return;

    const startTimeMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        processImitation(results.faceBlendshapes[0].categories, results.faceLandmarks[0]);
      }
    }

    if (isCapturing) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  };

  const processImitation = (blendshapes, landmarks) => {
    const action = ACTIONS[currentActionIndex];
    if (!action) return;

    let detected = false;
    if (action.type === 'tilt') {
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const tilt = (leftEye.y - rightEye.y);
      if (action.direction === 'left' && tilt > 0.05) detected = true;
      if (action.direction === 'right' && tilt < -0.05) detected = true;
    } else {
      const category = blendshapes.find(c => c.categoryName === action.blendshape);
      if (category && category.score > action.threshold) {
        detected = true;
      }
    }

    if (detected) {
      currentRoundScoreRef.current = Math.min(currentRoundScoreRef.current + 5, 100);
      setDetectionFeedback("Great job! Keep holding it!");
    } else {
      setDetectionFeedback("");
    }
  };

  const handleRoundEnd = () => {
    const finalRoundScore = currentRoundScoreRef.current;
    const newScores = [...imitationScores, finalRoundScore];
    setImitationScores(newScores);
    currentRoundScoreRef.current = 0;

    if (currentActionIndex < ACTIONS.length - 1) {
      setCurrentActionIndex(prev => prev + 1);
      setTimer(5);
    } else {
      finishGame(newScores);
    }
  };

  const finishGame = (finalScores) => {
    const avgScore = finalScores.length > 0 
      ? finalScores.reduce((a, b) => a + b, 0) / finalScores.length 
      : 0;

    const assessmentData = {
      studentId,
      assessmentType: 'imitation',
      score: Math.round(avgScore),
      metrics: {
        imitationScore: Math.round(avgScore),
        facialResponsiveness: Math.round(avgScore * 0.8) // Simplified derived metric
      },
      indicators: [
        {
          label: 'Motor Imitation',
          status: avgScore > 75 ? 'Strong' : avgScore > 40 ? 'Developing' : 'Limited',
          color: avgScore > 75 ? '#10b981' : avgScore > 40 ? '#f59e0b' : '#ef4444'
        },
        {
          label: 'Social Mirroring',
          status: avgScore > 60 ? 'Active' : 'Needs Support',
          color: avgScore > 60 ? '#10b981' : '#ef4444'
        }
      ],
      rawGameData: finalScores
    };

    stopCamera();
    setIsCapturing(false);
    onComplete(assessmentData);
  };

  if (cameraError) {
    return (
      <div className="game-error-state">
        <FiAlertTriangle size={48} color="#ef4444" />
        <h3>Camera Required</h3>
        <p>{cameraError}</p>
        <button className="option-button correct" onClick={startImitation}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="game-wrapper">
      <div className="game-card">
        <div className="game-progress">
          Action {Math.min(currentActionIndex + 1, ACTIONS.length)} of {ACTIONS.length}
        </div>
        
        {!isCapturing && imitationScores.length === 0 ? (
          <div className="start-screen">
            <h2>Imitation Game</h2>
            <p className="game-instruction">
              {isLoadingModel ? "Loading tracking models..." : "Watch the action and try to copy it exactly!"}
            </p>
            <button 
              className="option-button correct" 
              onClick={startImitation}
              disabled={isLoadingModel}
            >
              <FiCamera style={{ marginRight: '8px' }} />
              {isLoadingModel ? "Initializing..." : "I'm Ready"}
            </button>
          </div>
        ) : (
          <div className="imitation-play">
            <div className="action-display">
              <span className="action-emoji">{ACTIONS[currentActionIndex]?.emoji || '🏁'}</span>
              <h3>
                {ACTIONS[currentActionIndex] 
                  ? `Do this: ${ACTIONS[currentActionIndex].name}` 
                  : "Assessment Complete!"}
              </h3>
              {isCapturing && (
                <div className={`round-timer ${timer < 2 ? 'low' : ''}`}>{timer}s</div>
              )}
            </div>
            
            <div className="video-container tracking-active">
              <video ref={videoRef} className="webcam-feed" playsInline muted />
              {detectionFeedback && (
                <div className="detection-feedback-toast">
                  <FiCheckCircle /> {detectionFeedback}
                </div>
              )}
            </div>

            <p className="game-instruction">
              {isCapturing ? "Copy the action shown above!" : "Processing results..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImitationGame;
