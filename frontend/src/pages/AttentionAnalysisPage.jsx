import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaHome, FaCalendar, FaChartLine, FaBrain, FaUserTie, FaBook, FaCog, FaBell, FaSearch, FaClock, FaLightbulb, FaGamepad, FaPuzzlePiece, FaEye, FaMousePointer, FaMemory, FaSortNumericUp, FaShapes } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';

// Import game components (will create these next)
import ChronoCodeGame from '../components/games/ChronoCodeGame';
import IconicRecallGame from '../components/games/IconicRecallGame';
import MatchMasteryGame from '../components/games/MatchMasteryGame';
import NumericShuffleGame from '../components/games/NumericShuffleGame';
import OddOneOutGame from '../components/games/OddOneOutGame';
import PatternMatchGame from '../components/games/PatternMatchGame';
import ReflexTapGame from '../components/games/ReflexTapGame';
import SignalSwitchGame from '../components/games/SignalSwitchGame';

const AttentionAnalysisPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');
  const [activeNav, setActiveNav] = useState('attention');
  const [activeGame, setActiveGame] = useState(null);
  const [childName, setChildName] = useState('');
  const [parentInfo, setParentInfo] = useState({ name: '', email: '' });
  const [gameHistory, setGameHistory] = useState([]);

  useEffect(() => {
    const fetchParentInfo = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:5000/api/parent/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setParentInfo({
            name: data.name || data.fullName || data.username || '',
            email: data.email || data.contactEmail || ''
          });
        }
      } catch (error) {
        console.error('Error fetching parent info:', error);
      }
    };

    fetchParentInfo();
  }, []);

  useEffect(() => {
    const fetchChildInfo = async () => {
      if (!childId) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await fetch('http://localhost:5000/api/parent/children', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const children = await response.json();
          const child = children.find(c => (c._id || c.id) === childId);
          if (child) {
            setChildName(child.name);
          }
        }
      } catch (error) {
        console.error('Error fetching child info:', error);
      }
    };

    fetchChildInfo();
  }, [childId]);

  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!childId) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await fetch(`http://localhost:5000/api/parent/attention-games/history/${childId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setGameHistory(data);
        }
      } catch (error) {
        console.error('Error fetching game history:', error);
      }
    };

    fetchGameHistory();
  }, [childId]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome, path: '/dashboard' },
    { id: 'appointments', label: 'Appointments', icon: FaCalendar, path: '/parent/appointments' },
    { id: 'screening', label: 'Screening Results', icon: FaChartLine, path: '/parent/screening-results' },
    { id: 'attention', label: 'Attention Analysis', icon: FaBrain, path: '/parent/attention-analysis' },
    { id: 'care-team', label: 'Care Team', icon: FaUserTie, path: '/parent/care-team' },
    { id: 'resources', label: 'Resources', icon: FaBook, path: '/parent/resources' },
    { id: 'settings', label: 'Settings', icon: FaCog, path: '/parent/settings' },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const parentName = parentInfo.name?.trim() || parentInfo.email?.split('@')[0] || 'Parent';
  const parentInitial = parentName?.[0]?.toUpperCase() || 'P';

  const games = [
    // Memory Category
    {
      id: 'chrono-code',
      name: 'Chrono Code',
      category: 'Memory',
      description: 'Remember and recall number sequences',
      difficulty: 'Medium',
      icon: FaClock,
      color: 'from-purple-400 to-purple-600',
      component: ChronoCodeGame
    },
    {
      id: 'iconic-recall',
      name: 'Iconic Recall',
      category: 'Memory',
      description: 'Remember icons and symbols',
      difficulty: 'Easy',
      icon: FaMemory,
      color: 'from-blue-400 to-blue-600',
      component: IconicRecallGame
    },
    {
      id: 'match-mastery',
      name: 'Match Mastery',
      category: 'Memory',
      description: 'Find matching pairs',
      difficulty: 'Easy',
      icon: FaPuzzlePiece,
      color: 'from-green-400 to-green-600',
      component: MatchMasteryGame
    },
    // Logic Category
    {
      id: 'numeric-shuffle',
      name: 'Numeric Shuffle',
      category: 'Logic',
      description: 'Arrange numbers in correct order',
      difficulty: 'Medium',
      icon: FaSortNumericUp,
      color: 'from-orange-400 to-orange-600',
      component: NumericShuffleGame
    },
    {
      id: 'odd-one-out',
      name: 'Odd One Out',
      category: 'Logic',
      description: 'Identify the item that doesn\'t belong',
      difficulty: 'Hard',
      icon: FaLightbulb,
      color: 'from-yellow-400 to-yellow-600',
      component: OddOneOutGame
    },
    {
      id: 'pattern-match',
      name: 'Pattern Match',
      category: 'Logic',
      description: 'Recognize and complete patterns',
      difficulty: 'Medium',
      icon: FaShapes,
      color: 'from-pink-400 to-pink-600',
      component: PatternMatchGame
    },
    // Focus Category
    {
      id: 'reflex-tap',
      name: 'Reflex Tap',
      category: 'Focus',
      description: 'Tap when target appears',
      difficulty: 'Easy',
      icon: FaMousePointer,
      color: 'from-red-400 to-red-600',
      component: ReflexTapGame
    },
    {
      id: 'signal-switch',
      name: 'Signal Switch',
      category: 'Focus',
      description: 'Respond to color signal changes',
      difficulty: 'Medium',
      icon: FaEye,
      color: 'from-indigo-400 to-indigo-600',
      component: SignalSwitchGame
    }
  ];

  const handleGameComplete = async (gameId, results) => {
    if (!childId) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/api/parent/attention-games/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          childId,
          gameId,
          ...results
        })
      });

      if (response.ok) {
        const savedResult = await response.json();
        setGameHistory(prev => [savedResult, ...prev]);
      }
    } catch (error) {
      console.error('Error saving game result:', error);
    }

    setActiveGame(null);
  };

  const categories = ['Memory', 'Logic', 'Focus'];

  const getDifficultyColor = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // If a game is active, render the game component
  if (activeGame) {
    const game = games.find(g => g.id === activeGame);
    if (game) {
      const GameComponent = game.component;
      return (
        <div className="min-h-screen bg-gray-100">
          <div className="bg-white shadow-md px-8 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{game.name}</h2>
              <p className="text-sm text-gray-600">{childName ? `Playing as ${childName}` : 'Attention Game'}</p>
            </div>
            <button
              onClick={() => setActiveGame(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Exit Game
            </button>
          </div>
          <GameComponent 
            onComplete={(results) => handleGameComplete(activeGame, results)}
            onExit={() => setActiveGame(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-blue-200 shadow-lg flex flex-col">
        <div className="p-6 border-b border-blue-300">
          <h1 className="text-2xl font-bold text-blue-800">CORTEXA</h1>
          <p className="text-xs text-blue-600 mt-1">ASD Detection & Support</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  navigate(item.path + (childId ? `?childId=${childId}` : ''));
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeNav === item.id
                    ? 'bg-blue-300 text-blue-900 font-semibold shadow-md'
                    : 'text-blue-700 hover:bg-blue-250'
                }`}
              >
                <Icon className="text-blue-600" size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-300">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 bg-red-300 text-red-900 px-4 py-2 rounded-lg hover:bg-red-400 transition font-semibold"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Attention Behaviour Analysis</h1>
              <p className="text-gray-500 text-sm mt-1">
                {childName ? `Interactive cognitive games for ${childName}` : 'Interactive cognitive training games'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <FaBell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-300 to-blue-400 rounded-full flex items-center justify-center text-white font-bold" title={parentName}>
                {parentInitial}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-8 space-y-8">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-4">
                <FaBrain size={48} className="text-white opacity-90" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome to Attention Analysis</h2>
                  <p className="text-purple-100">
                    These interactive mini-games evaluate attention, memory, logic, and focus through fun challenges.
                    Track your child's progress and identify strengths and areas for improvement.
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Performance */}
            {gameHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Average Accuracy</p>
                    <p className="text-3xl font-bold text-green-700">
                      {Math.round(gameHistory.reduce((sum, h) => sum + h.accuracy, 0) / gameHistory.length)}%
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Games Played</p>
                    <p className="text-3xl font-bold text-blue-700">{gameHistory.length}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Attention Level</p>
                    <p className="text-3xl font-bold text-purple-700">
                      {gameHistory.length > 0 && gameHistory[0].attentionLevel || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Games by Category */}
            {categories.map(category => (
              <div key={category} className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  {category === 'Memory' && <FaMemory className="text-purple-600" />}
                  {category === 'Logic' && <FaLightbulb className="text-orange-600" />}
                  {category === 'Focus' && <FaEye className="text-red-600" />}
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {games.filter(game => game.category === category).map(game => {
                    const Icon = game.icon;
                    return (
                      <div
                        key={game.id}
                        onClick={() => setActiveGame(game.id)}
                        className="cursor-pointer bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-blue-300 transition-all transform hover:-translate-y-1"
                      >
                        <div className={`w-16 h-16 bg-gradient-to-br ${game.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                          <Icon className="text-white" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{game.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{game.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getDifficultyColor(game.difficulty)}`}>
                            {game.difficulty}
                          </span>
                          <FaGamepad className="text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttentionAnalysisPage;
