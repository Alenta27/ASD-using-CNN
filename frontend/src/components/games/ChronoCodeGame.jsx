import React, { useState, useEffect } from 'react';

const ChronoCodeGame = ({ onComplete, onExit }) => {
  const [gameState, setGameState] = useState('instructions'); // instructions, memorize, input, results
  const [sequence, setSequence] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const generateSequence = (length) => {
    const seq = [];
    for (let i = 0; i < length; i++) {
      seq.push(Math.floor(Math.random() * 10));
    }
    return seq;
  };

  const startGame = () => {
    const newSequence = generateSequence(3 + level);
    setSequence(newSequence);
    setGameState('memorize');
    setStartTime(Date.now());
    
    setTimeout(() => {
      setGameState('input');
    }, 2000 + level * 500); // Show sequence for longer on higher levels
  };

  const handleSubmit = () => {
    const endTime = Date.now();
    const reactionTime = (endTime - startTime) / 1000;
    setReactionTimes([...reactionTimes, reactionTime]);
    
    const correct = userInput === sequence.join('');
    setAttempts(attempts + 1);
    
    if (correct) {
      setScore(score + level * 10);
      if (level < 5) {
        setLevel(level + 1);
        setUserInput('');
        startGame();
      } else {
        showResults();
      }
    } else {
      setMistakes(mistakes + 1);
      if (attempts < 4) {
        setFeedbackMessage('❌ Incorrect! Try again.');
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          setUserInput('');
          startGame();
        }, 1500);
      } else {
        showResults();
      }
    }
  };

  const showResults = () => {
    setGameState('results');
    
    const totalAttempts = attempts + 1;
    const accuracy = ((totalAttempts - mistakes) / totalAttempts) * 100;
    const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const completionTime = (Date.now() - startTime) / 1000;
    
    // Calculate attention score
    const attentionScore = (accuracy * 0.6) + ((100 - Math.min(avgReactionTime * 10, 100)) * 0.4);
    
    // Determine attention level
    let attentionLevel = 'Low';
    if (attentionScore >= 80) attentionLevel = 'High';
    else if (attentionScore >= 60) attentionLevel = 'Moderate';
    
    const results = {
      gameName: 'Chrono Code',
      score,
      accuracy: Math.round(accuracy),
      reactionTime: avgReactionTime.toFixed(2),
      completionTime: completionTime.toFixed(2),
      mistakes,
      attentionScore: Math.round(attentionScore),
      attentionLevel
    };
    
    setTimeout(() => {
      onComplete(results);
    }, 3000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        {gameState === 'instructions' && (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-purple-700 mb-6">Chrono Code</h2>
            <div className="text-left bg-purple-50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">How to Play:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• A sequence of numbers will appear on the screen</li>
                <li>• Memorize the sequence</li>
                <li>• After it disappears, type the sequence from memory</li>
                <li>• The sequence gets longer as you progress</li>
                <li>• Complete 5 levels to finish the game</li>
              </ul>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-xl text-xl font-bold hover:from-purple-600 hover:to-purple-800 transition shadow-lg"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'memorize' && (
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Level {level}</h3>
            <p className="text-gray-600 mb-8">Memorize this sequence:</p>
            <div className="text-6xl font-bold text-purple-700 mb-8 tracking-widest">
              {sequence.join(' ')}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-purple-600 h-3 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {gameState === 'input' && (
          <div className="text-center">
            {showFeedback && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg animate-bounce">
                <p className="text-red-700 font-semibold">{feedbackMessage}</p>
              </div>
            )}
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Level {level}</h3>
            <p className="text-gray-600 mb-8">Enter the sequence you memorized:</p>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="text-4xl font-bold text-center w-full border-4 border-purple-300 rounded-xl p-4 mb-6 focus:outline-none focus:border-purple-600"
              placeholder="Enter numbers..."
              autoFocus
            />
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-800 transition shadow-lg"
              >
                Submit
              </button>
              <button
                onClick={onExit}
                className="px-8 py-3 bg-gray-300 text-gray-800 rounded-xl font-bold hover:bg-gray-400 transition"
              >
                Exit
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">Score: {score} | Mistakes: {mistakes}</p>
          </div>
        )}

        {gameState === 'results' && (
          <div className="text-center">
            <h2 className="text-4xl font-bold text-purple-700 mb-6">Game Complete!</h2>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600">Final Score</p>
                  <p className="text-3xl font-bold text-purple-700">{score}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <p className="text-3xl font-bold text-green-700">
                    {Math.round(((attempts + 1 - mistakes) / (attempts + 1)) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Reaction Time</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(2)}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mistakes</p>
                  <p className="text-2xl font-bold text-red-700">{mistakes}</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600">Saving results and returning to menu...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChronoCodeGame;
