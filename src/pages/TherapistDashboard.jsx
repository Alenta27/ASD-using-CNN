import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiUsers, FiFileText, FiBarChart2, FiMessageSquare, FiCalendar, FiSettings, FiBell, FiSearch, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TherapistDashboard.css';

const data = [
  { name: 'Jan', progress: 65 },
  { name: 'Feb', progress: 70 },
  { name: 'Mar', progress: 75 },
  { name: 'Apr', progress: 80 },
  { name: 'May', progress: 85 },
  { name: 'Jun', progress: 90 },
];

const Header = () => (
  <div className="flex items-center justify-between p-4 bg-white border-b">
    <div className="flex items-center">
      <div className="w-8 h-8 bg-blue-500 rounded-full mr-2"></div>
      <h1 className="text-xl font-bold">ASD Therapist Dashboard</h1>
    </div>
    <div className="flex items-center w-1/3">
      <div className="relative w-full">
        <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search by child name, ID..." className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
    <div className="flex items-center">
      <FiBell className="mr-6 text-gray-600" />
      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
    </div>
  </div>
);

const Sidebar = ({ onModuleClick }) => (
  <div className="w-64 bg-white border-r p-4">
    <ul className="space-y-4">
      <li><button onClick={() => onModuleClick('/therapist')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiHome className="mr-3" /> Home / Overview</button></li>
      <li><button onClick={() => onModuleClick('/therapist/patients')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiUsers className="mr-3" /> Patients</button></li>
      <li><button onClick={() => onModuleClick('/therapist/questionnaires')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiFileText className="mr-3" /> Questionnaire Results</button></li>
      <li><button onClick={() => onModuleClick('/therapist/ai-analysis')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiBarChart2 className="mr-3" /> AI Analysis</button></li>
      <li><button onClick={() => onModuleClick('/therapist/insights')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiBarChart2 className="mr-3" /> Insights & Reports</button></li>
      <li><button onClick={() => onModuleClick('/therapist/session-notes')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiMessageSquare className="mr-3" /> Session Notes</button></li>
      <li><button onClick={() => onModuleClick('/book-appointment')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiCalendar className="mr-3" /> Book Appointment</button></li>
      <li><button onClick={() => onModuleClick('/therapist/settings')} className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"><FiSettings className="mr-3" /> Settings</button></li>
    </ul>
  </div>
);

const MainContent = ({ onModuleClick }) => (
  <div className="flex-1 p-6 bg-gray-50">
    {/* Quick Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div 
        onClick={() => onModuleClick('/therapist/patients')}
        className="card bg-light-blue cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Active Patients</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold">45</span>
          <span className="flex items-center text-green-500"><FiArrowUp className="mr-1" /> 5%</span>
        </div>
      </div>
      <div 
        onClick={() => onModuleClick('/therapist/questionnaires')}
        className="card bg-mint-green cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Pending Questionnaires</h3>
        <span className="text-3xl font-bold">12</span>
      </div>
      <div 
        onClick={() => onModuleClick('/therapist/insights')}
        className="card bg-soft-yellow cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">High Risk Flags</h3>
        <span className="text-3xl font-bold">3</span>
      </div>
      <div 
        onClick={() => onModuleClick('/book-appointment')}
        className="card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold">Upcoming Appointments</h3>
        <span className="text-3xl font-bold">5</span>
      </div>
    </div>

    {/* Middle Section */}
    <div className="flex flex-col lg:flex-row gap-6 mb-6">
      <div 
        onClick={() => onModuleClick('/therapist/ai-analysis')}
        className="w-full lg:w-2/3 card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold mb-4">Overall Development Progress</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="progress" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div 
        onClick={() => onModuleClick('/therapist/notifications')}
        className="w-full lg:w-1/3 card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold mb-4">Alerts & Notifications</h3>
        <ul className="space-y-2">
          <li className="p-2 bg-gray-100 rounded-lg">Keziah's follow-up tomorrow</li>
          <li className="p-2 bg-gray-100 rounded-lg">3 questionnaires need review</li>
        </ul>
      </div>
    </div>

    {/* Bottom Section */}
    <div className="flex flex-col lg:flex-row gap-6">
      <div 
        onClick={() => onModuleClick('/therapist/patients')}
        className="w-full lg:w-1/2 card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold mb-4">Recent Patient Activity</h3>
        <ul className="space-y-2">
          <li className="p-2 bg-gray-100 rounded-lg">Yannik completed Social Skills Questionnaire</li>
        </ul>
      </div>
      <div 
        onClick={() => onModuleClick('/therapist/session-notes')}
        className="w-full lg:w-1/2 card cursor-pointer hover:shadow-lg transition-shadow"
      >
        <h3 className="text-lg font-semibold mb-4">Session Notes Quick Draft</h3>
        <textarea className="w-full p-2 border rounded-lg" placeholder="Start typing a new note..."></textarea>
        <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg">Save Note</button>
      </div>
    </div>
  </div>
);

export default function TherapistDashboard() {
  const navigate = useNavigate();

  const handleModuleClick = (path) => {
    navigate(path);
  };

  return (
    <div className="flex h-screen font-sans bg-gray-100">
      <Sidebar onModuleClick={handleModuleClick} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header />
        <MainContent onModuleClick={handleModuleClick} />
      </div>
    </div>
  );
}
