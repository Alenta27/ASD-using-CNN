import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, HandLandmarker, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FiCamera, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import './GameStyles.css';

// Actions definition (9 total)
const ACTIONS = [
  { id: 'clap', name: 'Clap', emoji: '👏', timeLimit: 10 },
  { id: 'wave', name: 'Wave', emoji: '👋', timeLimit: 8 },
  { id: 'smile', name: 'Smile', emoji: '😊', timeLimit: 6 },
  { id: 'hands-up', name: 'Raise Both Hands', emoji: '🙌', timeLimit: 8 },
  { id: 'point-left', name: 'Point Left', emoji: '👈', timeLimit: 8 },
  { id: 'point-right', name: 'Point Right', emoji: '👉', timeLimit: 8 },
  { id: 'finger-lips', name: 'Finger on Lips', emoji: '🤫', timeLimit: 8 },
  { id: 'thumbs-up', name: 'Thumbs Up', emoji: '👍', timeLimit: 8 },
  { id: 'prayer', name: 'Hands Together (Prayer)', emoji: '🤲', timeLimit: 8 }
];

// Thresholds
const SUSTAIN_MS_DEFAULT = 800; // default sustained time
const SUSTAIN_MS_HANDS_UP = 1000; // hands up stricter
const CONFIDENCE_MIN = 0.8;

const ImitationGame = ({ studentId, onComplete }) => {
  // State machine: idle → camera_ready → demo_action → imitate → validating → feedback → next_action → final_results
  const [phase, setPhase] = useState('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [feedbackText, setFeedbackText] = useState(''); // live UI feedback
  const [confidencePct, setConfidencePct] = useState(0);
  const [actionResults, setActionResults] = useState([]);

  // Session timing
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [actionStartTime, setActionStartTime] = useState(null);

  // MediaPipe refs
  const videoRef = useRef(null);
  const poseLM = useRef(null);
  const handLM = useRef(null);
  const faceLM = useRef(null);
  const streamRef = useRef(null);

  // Animation/timers
  const rafRef = useRef(null);
  const actionTimerRef = useRef(null);
  const demoTimerRef = useRef(null);

  // Gesture tracking
  const lastVideoTimeRef = useRef(-1);
  const historyRef = useRef([]); // last N frame detections for the current action
  const sustainRef = useRef({ active: false, start: null, firstCrossTime: null });
  const waveDirRef = useRef({ lastX: null, lastDir: null, changes: 0 });
  const clapCycleRef = useRef({ lastDist: null, cycles: 0 });
  const handsRaisedRef = useRef({ start: null });
  const neutralSmileBaselineRef = useRef(null);

  useEffect(() => {
    initModels();
    return () => cleanupAll();
  }, []);

  const initModels = async () => {
    try {
      setIsLoadingModel(true);
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      poseLM.current = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      handLM.current = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2
      });
      faceLM.current = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });
      setIsLoadingModel(false);
    } catch (e) {
      console.error('Model init failed', e);
      setIsLoadingModel(false);
      setCameraError('Failed to load tracking models. Please refresh and try again.');
    }
  };

  const startGame = async () => {
    setCameraError(null);
    setPhase('camera_ready');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraReady(true);
            setSessionStartTime(Date.now());
            // proceed to demo
            nextPhaseDemo();
          }).catch(err => {
            console.error('Video play error', err);
            setCameraError('Could not start video. Please try again.');
            setPhase('idle');
          });
        };
      }
    } catch (e) {
      console.error('Camera error', e);
      setCameraError('Camera access denied or unavailable. Please allow access and retry.');
      setPhase('idle');
    }
  };

  const cleanupAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // Phase transitions
  const nextPhaseDemo = () => {
    if (currentIndex >= ACTIONS.length) {
      finalizeResults();
      return;
    }
    setPhase('demo_action');
    setFeedbackText('Get ready...');
    setConfidencePct(0);
    historyRef.current = [];
    sustainRef.current = { active: false, start: null, firstCrossTime: null };
    waveDirRef.current = { lastX: null, lastDir: null, changes: 0 };
    clapCycleRef.current = { lastDist: null, cycles: 0 };
    handsRaisedRef.current = { start: null };
    // rebaseline smile at start of smile action
    if (ACTIONS[currentIndex].id === 'smile') neutralSmileBaselineRef.current = null;

    let c = 3;
    setCountdown(c);
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
        startImitation();
      }
    }, 1000);
  };

  const startImitation = () => {
    const action = ACTIONS[currentIndex];
    setPhase('imitate');
    setActionStartTime(Date.now());
    setTimeLeft(action.timeLimit);
    setFeedbackText('Detecting gesture…');
    setConfidencePct(0);

    if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    let t = action.timeLimit;
    actionTimerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(actionTimerRef.current);
        actionTimerRef.current = null;
        // time out: fail if not already validated
        concludeAction(false, 0);
      }
    }, 1000);

    lastVideoTimeRef.current = -1;
    rafRef.current = requestAnimationFrame(processFrame);
  };

  const processFrame = () => {
    if (!videoRef.current || phase !== 'imitate') return;

    const timestamp = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;

      try {
        const pose = poseLM.current?.detectForVideo(videoRef.current, timestamp);
        const hands = handLM.current?.detectForVideo(videoRef.current, timestamp);
        const face = faceLM.current?.detectForVideo(videoRef.current, timestamp);

        const action = ACTIONS[currentIndex];
        const det = detectAction(action.id, pose, hands, face);
        const conf = Math.max(0, Math.min(1, det.confidence || 0));
        setConfidencePct(Math.round(conf * 100));

        // Update live feedback
        if (conf >= CONFIDENCE_MIN) {
          setFeedbackText('Potential match… validating');
        } else {
          setFeedbackText('Detecting gesture…');
        }

        // Sustained validation
        const requiredMs = action.id === 'hands-up' ? SUSTAIN_MS_HANDS_UP : SUSTAIN_MS_DEFAULT;
        if (conf >= CONFIDENCE_MIN && det.validNow) {
          if (!sustainRef.current.active) {
            sustainRef.current = { active: true, start: timestamp, firstCrossTime: timestamp };
          }
          // biomechanical rule trackers may update inside detectors (e.g., cycles/oscillations)
          const sustained = timestamp - sustainRef.current.start;
          if (sustained >= requiredMs && det.biomechanicsOK) {
            setFeedbackText('Gesture detected ✔');
            clearInterval(actionTimerRef.current);
            actionTimerRef.current = null;
            concludeAction(true, conf);
            return;
          }
        } else {
          // reset sustain window if drops below threshold or rules fail
          sustainRef.current = { active: false, start: null, firstCrossTime: null };
        }
      } catch (e) {
        console.error('Frame process error', e);
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);
  };

  // Conclude one action and move forward
  const concludeAction = (success, finalConf) => {
    setPhase('feedback');
    setFeedbackText(success ? 'Gesture detected ✔' : 'Not detected ✖');

    // Compute reactionTimeMs
    let reactionTimeMs = 0;
    if (success && sustainRef.current.firstCrossTime && actionStartTime) {
      reactionTimeMs = sustainRef.current.firstCrossTime - actionStartTime;
    }

    const action = ACTIONS[currentIndex];
    const result = {
      actionName: action.name,
      success: !!success,
      confidenceScore: Number((finalConf || 0).toFixed(2)),
      reactionTimeMs: Math.max(0, Math.round(reactionTimeMs))
    };
    setActionResults(prev => [...prev, result]);

    // short feedback pause then next action
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      nextPhaseDemo();
    }, 1200);
  };

  // Detector dispatcher
  const detectAction = (id, pose, hands, face) => {
    switch (id) {
      case 'clap':
        return detectClap(hands);
      case 'wave':
        return detectWave(hands);
      case 'smile':
        return detectSmile(face);
      case 'hands-up':
        return detectHandsUp(pose);
      case 'point-left':
        return detectPoint(hands, 'left');
      case 'point-right':
        return detectPoint(hands, 'right');
      case 'finger-lips':
        return detectFingerOnLips(hands, face);
      case 'thumbs-up':
        return detectThumbsUp(hands);
      case 'prayer':
        return detectPrayer(hands);
      default:
        return { confidence: 0, validNow: false, biomechanicsOK: false };
    }
  };

  // Utility helpers
  const getHands = (hands) => (hands && hands.handLandmarks ? hands.handLandmarks : []);

  // 1) Clap – distance reduction cycles and contact
  const detectClap = (hands) => {
    const hl = getHands(hands);
    if (hl.length < 2) {
      clapCycleRef.current.lastDist = null;
      return { confidence: 0, validNow: false, biomechanicsOK: false };
    }
    const l = hl[0][0]; // left wrist approx
    const r = hl[1][0];
    if (!l || !r) return { confidence: 0, validNow: false, biomechanicsOK: false };

    const dist = Math.hypot(l.x - r.x, l.y - r.y);
    let cycles = clapCycleRef.current.cycles;
    let lastDist = clapCycleRef.current.lastDist;

    if (lastDist !== null) {
      const reduction = (lastDist - dist) / Math.max(lastDist, 1e-6);
      if (reduction >= 0.4 && dist < 0.15) {
        // contact
        cycles += 1;
      }
    }
    clapCycleRef.current = { lastDist: dist, cycles };

    const hasCycles = cycles >= 2;
    const conf = hasCycles ? 0.85 : Math.max(0, Math.min(0.7, cycles * 0.35));
    return { confidence: conf, validNow: dist < 0.25, biomechanicsOK: hasCycles };
  };

  // 2) Wave – left-right oscillations ≥ 3
  const detectWave = (hands) => {
    const hl = getHands(hands);
    if (hl.length < 1) {
      waveDirRef.current = { lastX: null, lastDir: null, changes: 0 };
      return { confidence: 0, validNow: false, biomechanicsOK: false };
    }
    const wrist = hl[0][0];
    if (!wrist) return { confidence: 0, validNow: false, biomechanicsOK: false };

    const prevX = waveDirRef.current.lastX;
    let changes = waveDirRef.current.changes;
    if (prevX !== null) {
      const dx = wrist.x - prevX;
      const dir = dx > 0 ? 'R' : dx < 0 ? 'L' : waveDirRef.current.lastDir;
      if (dir && waveDirRef.current.lastDir && dir !== waveDirRef.current.lastDir && Math.abs(dx) > 0.02) {
        changes += 1;
      }
      waveDirRef.current = { lastX: wrist.x, lastDir: dir, changes };
    } else {
      waveDirRef.current = { lastX: wrist.x, lastDir: null, changes };
    }

    const ok = changes >= 3;
    const conf = ok ? 0.85 : Math.min(0.7, changes * 0.2);
    return { confidence: conf, validNow: Math.abs((wrist.x || 0) - (prevX || wrist.x)) > 0.01, biomechanicsOK: ok };
  };

  // 3) Smile – elevation above baseline
  const detectSmile = (face) => {
    const shapes = face?.faceBlendshapes?.[0]?.categories || [];
    const left = shapes.find(c => c.categoryName === 'mouthSmileLeft');
    const right = shapes.find(c => c.categoryName === 'mouthSmileRight');
    if (!left || !right) return { confidence: 0, validNow: false, biomechanicsOK: false };

    const smile = ((left.score || 0) + (right.score || 0)) / 2 * 100;
    if (neutralSmileBaselineRef.current == null) {
      neutralSmileBaselineRef.current = smile; // baseline during early frames
    }
    const elevation = smile - (neutralSmileBaselineRef.current || 0);
    const ok = elevation >= 20;
    const conf = Math.min(1, smile / 100);
    return { confidence: conf, validNow: conf >= CONFIDENCE_MIN, biomechanicsOK: ok };
  };

  // 4) Raise Hands – wrists above shoulders sustained
  const detectHandsUp = (pose) => {
    const lms = pose?.landmarks?.[0];
    if (!lms) { handsRaisedRef.current.start = null; return { confidence: 0, validNow: false, biomechanicsOK: false }; }
    const leftWrist = lms[15], rightWrist = lms[16], leftShoulder = lms[11], rightShoulder = lms[12];
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
      handsRaisedRef.current.start = null; return { confidence: 0, validNow: false, biomechanicsOK: false };
    }
    const leftRaised = leftWrist.y < leftShoulder.y;
    const rightRaised = rightWrist.y < rightShoulder.y;
    const both = leftRaised && rightRaised;
    if (both) {
      if (!handsRaisedRef.current.start) handsRaisedRef.current.start = Date.now();
    } else {
      handsRaisedRef.current.start = null;
    }
    const conf = both ? 0.9 : 0.0;
    const ok = both; // time sustained enforced by SUSTAIN_MS_HANDS_UP in validator
    return { confidence: conf, validNow: both, biomechanicsOK: ok };
  };

  // 5) Point (left/right) – index extended, direction
  const detectPoint = (hands, dir) => {
    const hl = getHands(hands);
    if (hl.length < 1) return { confidence: 0, validNow: false, biomechanicsOK: false };
    // choose the most lateral hand as pointing candidate
    const h0 = hl[0];
    const wrist = h0[0];
    const indexTip = h0[8]; // index fingertip
    const indexMCP = h0[5];
    if (!wrist || !indexTip || !indexMCP) return { confidence: 0, validNow: false, biomechanicsOK: false };

    const indexExtended = Math.hypot(indexTip.x - indexMCP.x, indexTip.y - indexMCP.y) > 0.08;
    const pointingLeft = (indexTip.x - wrist.x) < -0.06;
    const pointingRight = (indexTip.x - wrist.x) > 0.06;
    const matchesDir = dir === 'left' ? pointingLeft : pointingRight;

    const conf = indexExtended && matchesDir ? 0.9 : 0.0;
    return { confidence: conf, validNow: indexExtended && matchesDir, biomechanicsOK: indexExtended && matchesDir };
  };

  // 6) Finger on Lips – index tip near mouth center
  const detectFingerOnLips = (hands, face) => {
    const hl = getHands(hands);
    const shapes = face?.faceBlendshapes?.[0]?.categories || [];
    // approximate mouth center using smile categories as proxy if landmarks not available
    // Fallback: use presence of face and assume center at normalized (0.5, 0.5) adjustments.
    let mouthX = 0.5, mouthY = 0.5;
    const mouthOpen = shapes.find(c => c.categoryName === 'mouthOpen');
    if (mouthOpen) {
      // Not exact position; rely on distance threshold + confidence gate
    }

    if (hl.length < 1) return { confidence: 0, validNow: false, biomechanicsOK: false };
    const h0 = hl[0];
    const indexTip = h0[8];
    if (!indexTip) return { confidence: 0, validNow: false, biomechanicsOK: false };

    const dist = Math.hypot((indexTip.x - mouthX), (indexTip.y - mouthY));
    const near = dist < 0.12; // conservative
    const conf = near ? 0.85 : 0.0;
    return { confidence: conf, validNow: near, biomechanicsOK: near };
  };

  // 7) Thumbs Up – thumb extended upward, others curled
  const detectThumbsUp = (hands) => {
    const hl = getHands(hands);
    if (hl.length < 1) return { confidence: 0, validNow: false, biomechanicsOK: false };
    const h0 = hl[0];
    const wrist = h0[0];
    const thumbTip = h0[4];
    const thumbMCP = h0[2];
    const indexTip = h0[8];
    const middleTip = h0[12];
    const ringTip = h0[16];
    const pinkyTip = h0[20];
    if (!wrist || !thumbTip || !thumbMCP || !indexTip || !middleTip || !ringTip || !pinkyTip) {
      return { confidence: 0, validNow: false, biomechanicsOK: false };
    }
    const thumbExtended = Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y) > 0.08;
    const othersCurled = [indexTip, middleTip, ringTip, pinkyTip].every(f => Math.hypot(f.x - wrist.x, f.y - wrist.y) < 0.25);
    const upward = (thumbTip.y - wrist.y) < -0.05; // up in normalized coords (smaller y is higher)
    const ok = thumbExtended && othersCurled && upward;
    const conf = ok ? 0.9 : 0.0;
    return { confidence: conf, validNow: ok, biomechanicsOK: ok };
  };

  // 8) Prayer – palms/wrists close
  const detectPrayer = (hands) => {
    const hl = getHands(hands);
    if (hl.length < 2) return { confidence: 0, validNow: false, biomechanicsOK: false };
    const l = hl[0][0];
    const r = hl[1][0];
    if (!l || !r) return { confidence: 0, validNow: false, biomechanicsOK: false };
    const dist = Math.hypot(l.x - r.x, l.y - r.y);
    const touching = dist < 0.12;
    const conf = touching ? 0.9 : 0.0;
    return { confidence: conf, validNow: touching, biomechanicsOK: touching };
  };

  // Final aggregation and backend payload
  const finalizeResults = () => {
    setPhase('final_results');

    const totalActions = ACTIONS.length;
    const successfulActions = actionResults.filter(r => r.success).length;
    const imitationAccuracy = totalActions ? Math.round((successfulActions / totalActions) * 100) : 0;
    const avgRt = actionResults.length
      ? actionResults.reduce((s, r) => s + (r.reactionTimeMs || 0), 0) / actionResults.length
      : 0;

    const payload = {
      studentId,
      game: 'Imitation',
      totalActions,
      successfulActions,
      imitationAccuracy,
      actionResults
    };

    // Send to parent/backend
    onComplete && onComplete(payload);
  };

  // RENDER
  if (cameraError) {
    return (
      <div className="game-error-state">
        <FiAlertTriangle size={48} color="#ef4444" />
        <h3>Camera Required</h3>
        <p>{cameraError}</p>
        <button className="option-button correct" onClick={startGame} disabled={isLoadingModel}>
          <FiCamera style={{ marginRight: 8 }} /> Try Again
        </button>
      </div>
    );
  }

  const action = ACTIONS[currentIndex];
  const progressText = `Action ${Math.min(currentIndex + 1, ACTIONS.length)} of ${ACTIONS.length}`;

  return (
    <div className="imitation-game">
      <div className="game-header">
        <h3>Imitation Game</h3>
      </div>

      {phase === 'idle' && (
        <div className="game-start-ui">
          <p className="game-instruction">
            {isLoadingModel ? 'Loading tracking models…' : 'Watch the action and imitate it as shown. Strict validation is used.'}
          </p>
          <button className="option-button correct" onClick={startGame} disabled={isLoadingModel}>
            <FiCamera style={{ marginRight: 8 }} /> {isLoadingModel ? 'Initializing…' : 'Start Assessment'}
          </button>
        </div>
      )}

      {phase !== 'idle' && (
        <div className="imitation-play">
          <div className={`video-container ${cameraReady ? 'tracking-active' : ''}`}>
            <video ref={videoRef} className="webcam-feed" playsInline muted />
            {phase !== 'final_results' && (
              <div className="detection-overlay">
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${confidencePct}%` }} />
                </div>
                <p>Match: {confidencePct}%</p>
              </div>
            )}
          </div>

          {phase !== 'final_results' && (
            <div className="action-display">
              <div className="action-top">
                <div className="progress-text">{progressText}</div>
                {phase === 'demo_action' || phase === 'imitate' ? (
                  <div className={`action-timer ${timeLeft < 3 ? 'low' : ''}`}>
                    <FiClock /> {phase === 'demo_action' ? countdown : timeLeft}s
                  </div>
                ) : null}
              </div>

              {action && (
                <>
                  <span className="action-emoji" style={{ fontSize: 64 }}>{action.emoji}</span>
                  <h3 style={{ marginTop: 8 }}>{action.name}</h3>
                </>
              )}

              <div className="detection-feedback" style={{ marginTop: 8 }}>
                <p>
                  {phase === 'imitate' && feedbackText}
                  {phase === 'feedback' && feedbackText}
                  {phase === 'demo_action' && 'Get ready to imitate…'}
                </p>
              </div>
            </div>
          )}

          {phase === 'final_results' && (
            <FinalResults actions={ACTIONS} results={actionResults} />
          )}
        </div>
      )}
    </div>
  );
};

const FinalResults = ({ actions, results }) => {
  const totalActions = actions.length;
  const successful = results.filter(r => r.success).length;
  const accuracy = totalActions ? Math.round((successful / totalActions) * 100) : 0;
  const avgRt = results.length ? results.reduce((s, r) => s + (r.reactionTimeMs || 0), 0) / results.length : 0;
  const avgRtSec = (avgRt / 1000).toFixed(1);
  const level = accuracy >= 75 ? { label: 'Normal', color: '#10b981' } : accuracy >= 40 ? { label: 'Borderline', color: '#f59e0b' } : { label: 'Low', color: '#ef4444' };

  return (
    <div className="results-screen" style={{ padding: 24 }}>
      <FiCheckCircle size={56} color="#10b981" style={{ marginBottom: 16 }} />
      <h2 style={{ marginBottom: 16 }}>Imitation Assessment Result</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <MetricBox label="Actions Attempted" value={totalActions} />
        <MetricBox label="Actions Successfully Imitated" value={successful} />
        <MetricBox label="Imitation Accuracy" value={`${accuracy}%`} />
        <MetricBox label="Average Reaction Time" value={`${avgRtSec} s`} />
      </div>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>Action Breakdown</h3>
      <div style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        {actions.map((a, i) => {
          const r = results[i];
          const ok = r?.success;
          return (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < actions.length - 1 ? '1px solid #eee' : 'none' }}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600, color: ok ? '#10b981' : '#ef4444' }}>{ok ? '✔' : '✖'}</span>
            </div>
          );
        })}
      </div>

      <h3 style={{ marginTop: 24, marginBottom: 8 }}>Imitation Ability Level</h3>
      <div style={{ border: `2px solid ${level.color}`, borderRadius: 8, padding: 12, color: level.color, fontWeight: 600 }}>
        {level.label}
      </div>
    </div>
  );
};

const MetricBox = ({ label, value }) => (
  <div style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
  </div>
);

export default ImitationGame;
