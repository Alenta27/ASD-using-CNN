import React from 'react';
import { Target, CheckCircle, Zap, AlertTriangle, Download, RotateCcw, Home, BrainCircuit } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/**
 * Professional Cognitive Assessment Dashboard UI
 * Displays result analytics for Chrono Code Attention Game
 */
const AttentionAnalysisResults = ({ 
  data = {}, 
  childName = "Alex Johnson", 
  sessionDate = new Date().toLocaleDateString(),
  testDuration = "4m 12s",
  onPlayAgain, 
  onReturnHome,
  onDownload
}) => {
  // Extract results with fallbacks for dummy/backend data
  const score = data.score || 150;
  const accuracy = data.accuracy || 86;
  const reactionTime = data.reactionTime || "6.28s";
  const mistakes = data.mistakes || 1;
  const attentionScore = data.attentionScore || 85;

  // Chart dummy data if not provided
  const reactionData = data.reactionRounds || [
    { round: '1', time: 5.2 },
    { round: '2', time: 5.8 },
    { round: '3', time: 6.1 },
    { round: '4', time: 6.5 },
    { round: '5', time: 7.0 },
    { round: '6', time: 6.3 },
    { round: '7', time: 6.8 },
    { round: '8', time: 6.6 },
  ];

  const accuracyPieData = [
    { name: 'Correct', value: accuracy },
    { name: 'Incorrect', value: 100 - accuracy },
  ];
  const PIE_COLORS = ['#10b981', '#ef4444'];

  const metricCards = [
    { title: 'Final Score', value: score, icon: Target, label: 'Above Average', color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Accuracy', value: `${accuracy}%`, icon: CheckCircle, label: 'High Precision', color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Avg Reaction Time', value: reactionTime, icon: Zap, label: 'Consistent Speed', color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Mistakes', value: mistakes, icon: AlertTriangle, label: 'Minimal Errors', color: 'text-red-600', bg: 'bg-red-100' }
  ];

  const indicators = [
    { name: 'Sustained Attention', value: attentionScore, status: 'Good', color: 'bg-green-500' },
    { name: 'Response Speed', value: 75, status: 'Moderate', color: 'bg-yellow-500' },
    { name: 'Focus Stability', value: 82, status: 'Good', color: 'bg-green-500' },
    { name: 'Impulsivity Risk', value: 12, status: 'Good', color: 'bg-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. PAGE HEADER */}
        <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col md:flex-row justify-between items-start md:items-center border border-purple-100">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-800">Attention Analysis Results</h1>
            <p className="text-purple-600 font-medium">Chrono Code Cognitive Attention Test</p>
          </div>
          <div className="mt-4 md:mt-0 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left md:text-right">
            <div>
              <p className="text-xs uppercase text-gray-400 font-bold mb-1 tracking-wider">Child Name</p>
              <p className="text-sm font-semibold text-gray-700">{childName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 font-bold mb-1 tracking-wider">Session Date</p>
              <p className="text-sm font-semibold text-gray-700">{sessionDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 font-bold mb-1 tracking-wider">Test Duration</p>
              <p className="text-sm font-semibold text-gray-700">{testDuration}</p>
            </div>
          </div>
        </div>

        {/* 2. SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                    {card.label}
                  </span>
                </div>
                <div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">{card.title}</h3>
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. PERFORMANCE ANALYTICS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reaction Time Per Round (Line Chart) */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Zap className="w-5 h-5 text-blue-500" /> Reaction Time Per Round
            </h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reactionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="round" tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    name="Time (s)" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: 'white' }} 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#7c3aed' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Accuracy Distribution (Pie Chart) */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <CheckCircle className="w-5 h-5 text-green-500" /> Accuracy Distribution
            </h3>
            <div className="flex-1 min-h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={accuracyPieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={80} 
                    outerRadius={110} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {accuracyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-4xl font-bold text-gray-800">{accuracy}%</span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. COGNITIVE INDICATORS SECTION */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Cognitive Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {indicators.map((indicator, index) => (
              <div key={index} className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-700 tracking-tight">{indicator.name}</span>
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                    indicator.value >= 80 ? 'bg-green-100 text-green-700' : 
                    indicator.value >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {indicator.value}% - {indicator.status}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${indicator.color}`} 
                    style={{ width: `${indicator.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. AI BEHAVIORAL INSIGHT */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 border border-purple-100 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-inner flex-shrink-0 z-10 border border-white/30">
            <BrainCircuit className="w-10 h-10 text-white" />
          </div>
          <div className="z-10 text-center md:text-left">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center justify-center md:justify-start gap-2">
              AI Behavioral Insight
            </h3>
            <p className="text-purple-50 leading-relaxed text-lg font-medium italic opacity-90">
              "Based on the attention task results, the child maintained good sustained attention with moderate response speed. 
              Accuracy levels indicate stable focus with minimal impulsive responses. Overall performance demonstrates a consistent 
              attentional profile suitable for current developmental milestones."
            </p>
          </div>
        </div>

        {/* 6. ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 pb-12">
          <button 
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all hover:-translate-y-1 active:scale-95"
            onClick={onDownload} 
          >
            <Download className="w-5 h-5" /> Download Report (PDF)
          </button>
          <button 
            onClick={onPlayAgain} 
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-10 py-4 rounded-2xl font-bold shadow-md border border-gray-100 transition-all hover:-translate-y-1 active:scale-95"
          >
            <RotateCcw className="w-5 h-5 text-purple-600" /> Play Again
          </button>
          <button 
            onClick={onReturnHome} 
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-10 py-4 rounded-2xl font-bold shadow-md border border-gray-100 transition-all hover:-translate-y-1 active:scale-95"
          >
            <Home className="w-5 h-5 text-purple-600" /> Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default AttentionAnalysisResults;
