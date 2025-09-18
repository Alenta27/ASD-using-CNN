import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FiHome,
  FiUsers,
  FiBarChart2,
  FiFileText,
  FiDatabase,
  FiMessageSquare,
  FiSettings,
  FiBell,
  FiSearch,
  FiMoon,
  FiSun,
} from 'react-icons/fi';

const palette = {
  primary: '#2563eb',
  teal: '#14b8a6',
  blue: '#0ea5e9',
  gray: '#e5e7eb',
  darkCard: 'rgba(17, 24, 39, 0.7)',
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

const SectionCard = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon, accent = palette.primary }) => (
  <SectionCard className="p-4 sm:p-5 flex items-center gap-4">
    <div
      className="p-3 rounded-lg text-white"
      style={{ background: accent }}
      aria-hidden
    >
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  </SectionCard>
);

const ProgressBar = ({ value, color = palette.teal }) => (
  <div className="w-full">
    <div className="flex justify-between mb-2 text-sm">
      <span className="text-gray-600 dark:text-gray-300">AI Model Accuracy</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}%</span>
    </div>
    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  </div>
);

const RiskPie = ({ data }) => {
  const COLORS = [palette.low, palette.medium, palette.high];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={4}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: '#111827', border: 'none', color: 'white' }} cursor={{ fill: 'rgba(156,163,175,0.2)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

const TopNav = ({ dark, onToggleDark }) => (
  <div className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20">
    <div className="flex items-center gap-3">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">ASD Research Dashboard</h1>
    </div>
    <div className="flex items-center gap-3 sm:gap-4 w-auto">
      <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
        <FiSearch className="text-gray-500" />
        <input
          className="bg-transparent outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
          placeholder="Search..."
        />
      </div>
      <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Notifications">
        <FiBell className="text-gray-600 dark:text-gray-300" size={18} />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full" />
      </button>
      <button
        onClick={onToggleDark}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Toggle dark mode"
      >
        {dark ? <FiSun className="text-yellow-400" size={18} /> : <FiMoon className="text-gray-700" size={18} />}
      </button>
      <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 ring-2 ring-offset-2 ring-blue-200 dark:ring-offset-gray-900" />
    </div>
  </div>
);

const Sidebar = ({ onModuleClick }) => {
  const items = [
    { icon: <FiHome />, label: 'Home', path: '/research' },
    { icon: <FiUsers />, label: 'Users', path: '/research/users' },
    { icon: <FiBarChart2 />, label: 'Screenings', path: '/research/screenings' },
    { icon: <FiFileText />, label: 'Reports', path: '/research/reports' },
    { icon: <FiDatabase />, label: 'Dataset', path: '/research/dataset' },
    { icon: <FiMessageSquare />, label: 'Feedback', path: '/research/feedback' },
    { icon: <FiSettings />, label: 'Settings', path: '/research/settings' },
  ];
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen sticky top-0">
      <div className="px-6 py-5 font-semibold text-blue-600 dark:text-teal-400 text-lg">ASD Project</div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => onModuleClick(it.path)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800 hover:text-blue-700 dark:hover:text-white transition"
          >
            <span className="text-lg">{it.icon}</span>
            <span className="text-sm font-medium">{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-400">v1.0.0</div>
    </aside>
  );
};

const ResearchDashboard = () => {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [feedback, setFeedback] = useState([
    { id: 1, text: 'Questionnaire felt long for younger children', user: 'Parent', reviewed: false },
    { id: 2, text: 'Speech sample upload failed on mobile', user: 'Therapist', reviewed: false },
    { id: 3, text: 'Confusing risk explanation on results page', user: 'Parent', reviewed: true },
  ]);

  const handleModuleClick = (path) => {
    navigate(path);
  };

  const riskData = useMemo(() => [
    { name: 'Low', value: 58 },
    { name: 'Medium', value: 28 },
    { name: 'High', value: 14 },
  ], []);

  const screeningsByMonth = useMemo(() => [
    { month: 'Jan', count: 30 },
    { month: 'Feb', count: 45 },
    { month: 'Mar', count: 50 },
    { month: 'Apr', count: 42 },
    { month: 'May', count: 60 },
    { month: 'Jun', count: 72 },
    { month: 'Jul', count: 68 },
    { month: 'Aug', count: 75 },
    { month: 'Sep', count: 90 },
    { month: 'Oct', count: 84 },
    { month: 'Nov', count: 95 },
    { month: 'Dec', count: 100 },
  ], []);

  const reportsUsed = useMemo(() => [
    { type: 'CNN', count: 320 },
    { type: 'Questionnaire', count: 540 },
    { type: 'Speech', count: 210 },
  ], []);

  const dataset = useMemo(() => ({
    images: 12480,
    questionnaires: 9050,
    speech: 4210,
    modelVersion: 'v2.3.1',
    trainingDate: '2025-08-02',
  }), []);

  const cpuUsage = 64;
  const ramUsage = 52;
  const uptimeOk = true;
  const accuracy = 92;

  const toggleReviewed = (id) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, reviewed: !f.reviewed } : f)));
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
        <Sidebar onModuleClick={handleModuleClick} />

        <div className="flex-1 flex flex-col">
          <TopNav dark={dark} onToggleDark={() => setDark((v) => !v)} />

          <main className="p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div onClick={() => handleModuleClick('/research/users')} className="cursor-pointer">
                <StatCard title="Total Users" value="8,920" icon={<FiUsers size={20} />} accent={palette.blue} />
              </div>
              <div onClick={() => handleModuleClick('/research/screenings')} className="cursor-pointer">
                <StatCard title="Total Screenings" value="4,365" icon={<FiBarChart2 size={20} />} accent={palette.teal} />
              </div>

              <div onClick={() => handleModuleClick('/research/analytics')} className="cursor-pointer">
                <SectionCard className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Risk Distribution</p>
                  </div>
                  <RiskPie data={riskData} />
                  <div className="flex justify-center gap-4 text-xs -mt-2">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="h-2 w-2 rounded-full" style={{ background: palette.low }} /> Low</div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="h-2 w-2 rounded-full" style={{ background: palette.medium }} /> Medium</div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="h-2 w-2 rounded-full" style={{ background: palette.high }} /> High</div>
                  </div>
                </SectionCard>
              </div>

              <div onClick={() => handleModuleClick('/research/model-performance')} className="cursor-pointer">
                <SectionCard className="p-4">
                  <ProgressBar value={accuracy} />
                </SectionCard>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div onClick={() => handleModuleClick('/research/trends')} className="cursor-pointer">
                <SectionCard className="p-4 xl:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Screenings per Month</h2>
                  </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={screeningsByMonth} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ background: '#111827', border: 'none', color: 'white' }} />
                      <Line type="monotone" dataKey="count" stroke={palette.primary} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                </SectionCard>
              </div>

              <div onClick={() => handleModuleClick('/research/reports')} className="cursor-pointer">
                <SectionCard className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Report Types Used</h2>
                  </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportsUsed} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="type" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ background: '#111827', border: 'none', color: 'white' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={palette.teal} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                </SectionCard>
              </div>
            </div>

            {/* Dataset Insights */}
            <div onClick={() => handleModuleClick('/research/dataset')} className="cursor-pointer">
              <SectionCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Dataset Insights</h2>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-gray-900 border border-blue-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Images</p>
                  <p className="text-2xl font-semibold text-blue-700 dark:text-blue-400">{dataset.images.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-teal-50 dark:bg-gray-900 border border-teal-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Questionnaires</p>
                  <p className="text-2xl font-semibold text-teal-700 dark:text-teal-400">{dataset.questionnaires.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-gray-900 border border-emerald-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Speech Samples</p>
                  <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{dataset.speech.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Model</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{dataset.modelVersion}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trained: {dataset.trainingDate}</p>
                </div>
              </div>
              </SectionCard>
            </div>

            {/* Feedback */}
            <div onClick={() => handleModuleClick('/research/feedback')} className="cursor-pointer">
              <SectionCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Latest Feedback</h2>
                </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {feedback.map((f) => (
                  <li key={f.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{f.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Source: {f.user}</p>
                    </div>
                    <button
                      onClick={() => toggleReviewed(f.id)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition ${
                        f.reviewed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
                      }`}
                    >
                      {f.reviewed ? 'Reviewed' : 'Mark Reviewed'}
                    </button>
                  </li>
                ))}
              </ul>
              </SectionCard>
            </div>

            {/* System Health */}
            <div onClick={() => handleModuleClick('/research/system-health')} className="cursor-pointer">
              <SectionCard className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">System Health</h2>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">API Uptime</p>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${uptimeOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{uptimeOk ? 'Operational' : 'Down'}</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">CPU Usage</p>
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${cpuUsage}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{cpuUsage}%</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">RAM Usage</p>
                  <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${ramUsage}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ramUsage}%</p>
                </div>
              </div>
              </SectionCard>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default ResearchDashboard;
