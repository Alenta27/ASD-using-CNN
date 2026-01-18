import React, { useState, useEffect, useRef } from 'react';
import './GameStyles.css';

const TurnTakingGame = ({ studentId, onComplete }) => {
  const [turn, setTurn] = useState('computer'); // 'computer' or 'player'
  const [timeLeft, setTimeLeft] = useState(3);
  const [rounds, setRounds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [waitingScore, setWaitingScore] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const timerRef = useRef(null);

  const startLevel = () => {
    setIsStarted(true);
    startComputerTurn();
  };

  const startComputerTurn = () => {
    setTurn('computer');
    setTimeLeft(Math.floor(Math.random() * 3) + 3); // Computer takes 3-5 seconds
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTurn('player');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePlayerAction = () => {
    if (turn === 'computer') {
      setInterruptions(prev => prev + 1);
    } else {
      setWaitingScore(prev => prev + 1);
      setRounds(prev => {
        const next = prev + 1;
        if (next >= 5) {
          finishGame();
        } else {
          startComputerTurn();
        }
        return next;
      });
    }
  };

  const finishGame = () => {
    clearInterval(timerRef.current);
    const reciprocity = (waitingScore / (waitingScore + interruptions)) * 100;

    const assessmentData = {
      studentId,
      assessmentType: 'turn-taking',
      score: Math.round(reciprocity),
      metrics: {
        waitingBehaviorScore: Math.round(reciprocity),
        interruptionCount: interruptions
      },
      indicators: [
        {
          label: 'Social Reciprocity',
          status: reciprocity > 80 ? 'Optimal' : reciprocity > 40 ? 'Moderate' : 'Limited',
          color: reciprocity > 80 ? '#10b981' : reciprocity > 40 ? '#f59e0b' : '#ef4444'
        },
        {
          label: 'Impulse Control',
          status: interruptions === 0 ? 'Excellent' : interruptions < 3 ? 'Typical' : 'Reduced',
          color: interruptions === 0 ? '#10b981' : interruptions < 3 ? '#3b82f6' : '#ef4444'
        }
      ],
      rawGameData: { interruptions, successfulTurns: waitingScore }
    };

    onComplete(assessmentData);
  };

  return (
    <div className="game-wrapper">
      <div className="game-card">
        <div className="game-progress">Round {rounds + 1} of 5</div>
        
        {!isStarted ? (
          <div className="start-screen">
            <h2>Turn Taking Game</h2>
            <p className="game-instruction">Wait for your turn! Only click when the light is green.</p>
            <button className="option-button correct" onClick={startLevel}>Start Game</button>
          </div>
        ) : (
          <div className="turn-taking-play">
            <div className={`turn-indicator ${turn}`}>
              {turn === 'computer' ? '⌛ Computer\'s Turn...' : '✅ YOUR TURN!'}
            </div>
            
            <div 
              className={`interaction-zone ${turn}`}
              onClick={handlePlayerAction}
            >
              {turn === 'computer' ? 'WAIT' : 'CLICK NOW!'}
            </div>

            {interruptions > 0 && (
              <div className="interruption-alert">
                Wait for your turn!
              </div>
            )}
            
            <p className="game-instruction">
              {turn === 'computer' ? 'Wait patiently...' : 'Your turn! Click the box!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnTakingGame;
