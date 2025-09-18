import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaUsers, FaChartBar, FaTasks, FaComments, FaCog, FaFileAlt, FaClipboardList, FaDatabase, FaBell, FaSearch } from 'react-icons/fa';

// Mock Data - In a real app, this would come from your backend API
const systemAnalytics = {
  totalUsers: 1250,
  totalScreenings: 3480,
};

const riskDistributionData = [
  { name: 'Low Risk', value: 1890 },
  { name: 'Moderate Risk', value: 1020 },
  { name: 'High Risk', value: 570 },
];

const screeningTrendsData = [
  { month: 'Jan', screenings: 200 },
  { month: 'Feb', screenings: 300 },
  { month: 'Mar', screenings: 450 },
  { month: 'Apr', screenings: 400 },
  { month: 'May', screenings: 600 },
  { month: 'Jun', screenings: 730 },
];

const recentUsers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Parent', status: 'Active' },
    { id: 2, name: 'Dr. Jane Smith', email: 'jane@clinic.com', role: 'Therapist', status: 'Active' },
    { id: 3, name: 'Peter Jones', email: 'peter@example.com', role: 'Parent', status: 'Inactive' },
];

const COLORS = ['#0088FE', '#FFBB28', '#FF8042'];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleModuleClick = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handleModuleClick('/admin/users')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaUsers /> User Management
            </button>
            <button 
              onClick={() => handleModuleClick('/admin/screenings')}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaClipboardList /> Screenings
            </button>
            <button 
              onClick={() => handleModuleClick('/admin/reports')}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaFileAlt /> Reports
            </button>
            <button 
              onClick={() => handleModuleClick('/admin/settings')}
              className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FaCog /> Settings
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            onClick={() => handleModuleClick('/admin/users')}
            className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-blue-50"
          >
            <div className="bg-blue-100 text-blue-600 rounded-full p-4 mr-4">
              <FaUsers className="h-8 w-8" />
            </div>
            <div>
              <p className="text-gray-500">Total Users</p>
              <p className="text-3xl font-bold">{systemAnalytics.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div 
            onClick={() => handleModuleClick('/admin/screenings')}
            className="bg-white p-6 rounded-lg shadow-md flex items-center cursor-pointer hover:shadow-lg transition-shadow hover:bg-green-50"
          >
            <div className="bg-green-100 text-green-600 rounded-full p-4 mr-4">
              <FaTasks className="h-8 w-8" />
            </div>
            <div>
              <p className="text-gray-500">Total Screenings</p>
              <p className="text-3xl font-bold">{systemAnalytics.totalScreenings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Risk Distribution Pie Chart */}
          <div 
            onClick={() => handleModuleClick('/admin/analytics')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow hover:bg-purple-50"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center"><FaChartBar className="mr-2"/>Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={riskDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Screening Trends Bar Chart */}
          <div 
            onClick={() => handleModuleClick('/admin/trends')}
            className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow hover:bg-green-50"
          >
            <h2 className="text-xl font-semibold mb-4">Screening Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={screeningTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="screenings" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Management Table */}
        <div 
          onClick={() => handleModuleClick('/admin/users')}
          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow hover:bg-blue-50"
        >
            <h2 className="text-xl font-semibold mb-4">Recent Users</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b text-left">Name</th>
                            <th className="py-2 px-4 border-b text-left">Email</th>
                            <th className="py-2 px-4 border-b text-left">Role</th>
                            <th className="py-2 px-4 border-b text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentUsers.map(user => (
                            <tr key={user.id}>
                                <td className="py-2 px-4 border-b">{user.name}</td>
                                <td className="py-2 px-4 border-b">{user.email}</td>
                                <td className="py-2 px-4 border-b">{user.role}</td>
                                <td className="py-2 px-4 border-b">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
