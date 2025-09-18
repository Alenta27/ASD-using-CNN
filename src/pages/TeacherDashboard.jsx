import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiClipboard,
  FiBarChart2,
  FiMessageSquare,
  FiSettings,
  FiBell,
  FiMoon,
  FiSun,
  FiDownload,
  FiEye,
  FiCheckCircle,
  FiCalendar,
  FiSearch,
  FiFileText,
} from 'react-icons/fi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([
    { id: 1, text: 'Alice has been more engaged during group activities.', from: 'Teacher', date: '2025-09-01', addressed: false },
    { id: 2, text: 'Parent meeting requested regarding progress.', from: 'Parent', date: '2025-09-02', addressed: false },
    { id: 3, text: 'Consider adjusting visual aids for Ben.', from: 'Teacher', date: '2025-09-03', addressed: true },
  ]);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const isDark = storedTheme ? storedTheme === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Sample data
  const students = [
    { name: 'Alice Johnson', date: '2025-09-10', type: 'Questionnaire', risk: 'Low', status: 'Reviewed' },
    { name: 'Ben Carter', date: '2025-09-09', type: 'Image', risk: 'Medium', status: 'Pending' },
    { name: 'Chloe Singh', date: '2025-09-08', type: 'Speech', risk: 'High', status: 'Reviewed' },
    { name: 'Daniel Kim', date: '2025-09-07', type: 'Questionnaire', risk: 'Medium', status: 'Pending' },
    { name: 'Emma Wilson', date: '2025-09-06', type: 'Image', risk: 'Low', status: 'Reviewed' },
  ];

  const screeningsPerStudent = [
    { student: 'Alice', count: 8 },
    { student: 'Ben', count: 5 },
    { student: 'Chloe', count: 6 },
    { student: 'Daniel', count: 4 },
    { student: 'Emma', count: 7 },
  ];

  const improvementOverTime = [
    { month: 'Apr', riskScore: 70 },
    { month: 'May', riskScore: 62 },
    { month: 'Jun', riskScore: 55 },
    { month: 'Jul', riskScore: 49 },
    { month: 'Aug', riskScore: 42 },
    { month: 'Sep', riskScore: 35 },
  ];

  const reports = [
    { id: 1, student: 'Alice Johnson', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    { id: 2, student: 'Ben Carter', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    { id: 3, student: 'Chloe Singh', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  ];

  const upcomingMeetings = [
    { id: 1, title: 'Parent Meeting - Alice', date: '2025-09-15 10:00' },
    { id: 2, title: 'Parent Meeting - Ben', date: '2025-09-17 14:30' },
    { id: 3, title: 'Team Workshop: Visual Supports', date: '2025-09-21 09:00' },
  ];

  const riskColor = useMemo(
    () => ({
      Low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
      Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
      High: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    }),
    []
  );

  const summary = useMemo(() => {
    const total = 120; // example
    const completed = 86; // example
    const atRisk = { Low: 24, Medium: 10, High: 4 };
    const meetings = upcomingMeetings.length;
    return { total, completed, atRisk, meetings };
  }, [upcomingMeetings.length]);

  const markAddressed = (id) => {
    setFeedbackItems((prev) => prev.map((f) => (f.id === id ? { ...f, addressed: !f.addressed } : f)));
  };

  const handleModuleClick = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-900 text-gray-900 dark:text-gray-100">
      {/* Mobile top bar with menu button */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <h1 className="text-lg font-semibold">ASD Teacher Dashboard</h1>
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <FiSun /> : <FiMoon />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed z-40 lg:static top-0 lg:top-auto left-0 h-full lg:h-auto w-72 transform lg:transform-none transition-transform duration-200 ease-in-out
          bg-white/80 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 shadow-lg lg:shadow-none border-r border-gray-200/70 dark:border-gray-700/40
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-gray-200/70 dark:border-gray-700/40">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-400 to-teal-400 flex items-center justify-center text-white font-bold shadow-md">ASD</div>
            <div>
              <div className="font-semibold">ASD Teacher Dashboard</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Caring. Insightful. Supportive.</div>
            </div>
          </div>

          <nav className="px-4 py-4 space-y-1">
            {[
              { to: '/teacher', label: 'Home', icon: <FiHome className="w-5 h-5" /> },
              { to: '/teacher/students', label: 'Students', icon: <FiUsers className="w-5 h-5" /> },
              { to: '/teacher/screenings', label: 'Screenings', icon: <FiClipboard className="w-5 h-5" /> },
              { to: '/teacher/reports', label: 'Reports', icon: <FiFileText className="w-5 h-5" /> },
              { to: '/teacher/insights', label: 'Insights', icon: <FiBarChart2 className="w-5 h-5" /> },
              { to: '/teacher/feedback', label: 'Feedback', icon: <FiMessageSquare className="w-5 h-5" /> },
              { to: '/teacher/settings', label: 'Settings', icon: <FiSettings className="w-5 h-5" /> },
            ].map((item) => (
              <button
                key={item.to}
                onClick={() => {
                  handleModuleClick(item.to);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group hover:bg-blue-50 dark:hover:bg-gray-700/60"
              >
                <span className="text-gray-600 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-200">{item.icon}</span>
                <span className="font-medium text-left">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:ml-0 ml-0 w-full lg:w-auto">
          {/* Top Navbar (desktop) */}
          <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-gray-800/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 border-b border-gray-200/70 dark:border-gray-700/40">
            <h1 className="text-xl font-semibold tracking-tight">ASD Teacher Dashboard</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search students, reports..."
                  className="pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/70 border border-transparent focus:border-blue-300 dark:focus:border-blue-600 outline-none text-sm"
                />
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700"
                aria-label="Toggle Dark Mode"
              >
                {darkMode ? <FiSun /> : <FiMoon />}
              </button>
              <button className="relative p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700" aria-label="Notifications">
                <FiBell />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-400 to-blue-400 flex items-center justify-center text-white font-semibold shadow">TJ</div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 lg:p-6 space-y-6">
            {/* Quick Stats */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div 
                  onClick={() => handleModuleClick('/teacher/students')}
                  className="rounded-2xl p-4 bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 cursor-pointer hover:shadow-md transition-shadow hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                      <p className="text-2xl font-bold mt-1">{summary.total}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-200 flex items-center justify-center text-xl">👩‍🎓</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleModuleClick('/teacher/screenings')}
                  className="rounded-2xl p-4 bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 cursor-pointer hover:shadow-md transition-shadow hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Screenings Completed</p>
                      <p className="text-2xl font-bold mt-1">{summary.completed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-200 flex items-center justify-center text-xl">✅</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleModuleClick('/teacher/insights')}
                  className="rounded-2xl p-4 bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 cursor-pointer hover:shadow-md transition-shadow hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Students at Risk</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200">Low {summary.atRisk.Low}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">Medium {summary.atRisk.Medium}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">High {summary.atRisk.High}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-200 flex items-center justify-center text-xl">🚨</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleModuleClick('/teacher/calendar')}
                  className="rounded-2xl p-4 bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 cursor-pointer hover:shadow-md transition-shadow hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Meetings</p>
                      <p className="text-2xl font-bold mt-1">{summary.meetings}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-200 flex items-center justify-center text-xl">📅</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Screenings Table */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2 rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40">
                <div className="px-5 py-4 border-b border-gray-200/70 dark:border-gray-700/40 flex items-center justify-between">
                  <h2 className="font-semibold">Recent Screenings</h2>
                  <NavLink to="/screenings" className="text-sm text-blue-600 dark:text-blue-300 hover:underline">View all</NavLink>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50/60 dark:bg-gray-700/60">
                      <tr className="text-left">
                        <th className="px-5 py-3 font-medium">Student Name</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium">Risk Level</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => (
                        <tr key={idx} className="border-t border-gray-100 dark:border-gray-700/40">
                          <td className="px-5 py-3 font-medium">{s.name}</td>
                          <td className="px-5 py-3">{s.date}</td>
                          <td className="px-5 py-3">{s.type}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${riskColor[s.risk]}`}>{s.risk}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              s.status === 'Reviewed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300'
                            }`}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upcoming Meetings / Announcements */}
              <div className="rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40">
                <div className="px-5 py-4 border-b border-gray-200/70 dark:border-gray-700/40 flex items-center gap-2">
                  <FiCalendar className="text-blue-500" />
                  <h2 className="font-semibold">Announcements & Reminders</h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/40">
                  {upcomingMeetings.map((m) => (
                    <li key={m.id} className="px-5 py-4 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="font-medium">{m.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{m.date}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Insights */}
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Screenings per Student</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Last 6 months</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={screeningsPerStudent}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="student" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Screenings" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Risk Improvement Over Time</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Lower is better</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={improvementOverTime}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="riskScore" name="Risk Score" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Reports and Feedback */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Reports */}
              <div className="xl:col-span-2 rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40">
                <div className="px-5 py-4 border-b border-gray-200/70 dark:border-gray-700/40 flex items-center justify-between">
                  <h2 className="font-semibold">Reports</h2>
                  <NavLink to="/reports" className="text-sm text-blue-600 dark:text-blue-300 hover:underline">Go to reports</NavLink>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/40">
                  {reports.map((r) => (
                    <li key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{r.student}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">PDF Report</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewUrl(r.url)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                        >
                          <FiEye /> Preview
                        </button>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                        >
                          <FiDownload /> Download
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feedback */}
              <div className="rounded-2xl bg-white/80 dark:bg-gray-800/60 shadow-sm border border-gray-200/70 dark:border-gray-700/40">
                <div className="px-5 py-4 border-b border-gray-200/70 dark:border-gray-700/40 flex items-center gap-2">
                  <FiMessageSquare className="text-blue-500" />
                  <h2 className="font-semibold">Feedback</h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/40">
                  {feedbackItems.map((f) => (
                    <li key={f.id} className="px-5 py-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{f.text}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300">{f.from}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{f.date}</span>
                        <button
                          onClick={() => markAddressed(f.id)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            f.addressed
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200'
                          }`}
                        >
                          <FiCheckCircle /> {f.addressed ? 'Addressed' : 'Mark as Addressed'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="font-semibold flex items-center gap-2"><FiFileText /> Report Preview</div>
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >Close</button>
            </div>
            <div className="flex-1">
              <iframe title="Report Preview" src={previewUrl} className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
