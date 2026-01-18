import React, { useState, useEffect, useRef } from 'react';
import './GameStyles.css';

const PATTERNS = [
  { id: 1, color: '#f87171', shape: 'square' },
  { id: 2, color: '#60a5fa', shape: 'circle' },
  { id: 3, color: '#4ade80', shape: 'triangle' },
  { id: 4, color: '#fbbf24', shape: 'square' },
  { id: 5, color: '#a78bfa', shape: 'circle' },
  { id: 6, color: '#f472b6', shape: 'triangle' }
];

const PatternFixationGame = ({ studentId, onComplete }) => {
  const [selections, setSelections] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isStarted, setIsStarted] = useState(false);
  const startTime = useRef(null);
  const intervalRef = useRef(null);

  const startLevel = () => {
    setIsStarted(true);
    startTime.current = Date.now();
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePatternClick = (pattern) => {
    setSelections(prev => [...prev, { ...pattern, time: Date.now() }]);
  };

  const finishGame = () => {
    const totalSelections = selections.length;
    // Count repetitive selections (same shape/color in a row)
    let repetitions = 0;
    for (let i = 1; i < selections.length; i++) {
      if (selections[i].id === selections[i-1].id) repetitions++;
    }

    const assessmentData = {
      studentId,
      assessmentType: 'pattern-fixation',
      score: Math.round((repetitions / totalSelections) * 100) || 0,
      metrics: {
        repetitiveSelectionCount: repetitions,
        fixationDuration: parseFloat((repetitions / (totalSelections || 1)).toFixed(2))
      },
      indicators: [
        {
          label: 'Repetitive Interest',
          status: repetitions > 5 ? 'High' : repetitions > 2 ? 'Moderate' : 'Typical',
          color: repetitions > 5 ? '#ef4444' : repetitions > 2 ? '#f59e0b' : '#10b981'
        },
        {
          label: 'Visual Exploration',
          status: totalSelections > 10 ? 'Active' : 'Restricted',
          color: totalSelections > 10 ? '#10b981' : '#f59e0b'
        }
      ],
      rawGameData: selections
    };

    onComplete(assessmentData);
  };

  return (
    <div className="game-wrapper">
      <div className="game-card">
        <div className="game-progress">Time: {timeLeft}s</div>
        
        {!isStarted ? (
          <div className="start-screen">
            <h2>Pattern Fixation</h2>
            <p className="game-instruction">Explore the patterns on the screen. Click on the ones you like.</p>
            <button className="option-button correct" onClick={startLevel}>Start Exploration</button>
          </div>
        ) : (
          <div className="patterns-play">
            <div className="patterns-grid">
              {PATTERNS.map(p => (
                <div 
                  key={p.id}
                  className={`pattern-item ${p.shape}`}
                  style={{ backgroundColor: p.color }}
                  onClick={() => handlePatternClick(p)}
                />
              ))}
            </div>
            <p className="game-instruction">Feel free to click any patterns as many times as you want.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternFixationGame;
