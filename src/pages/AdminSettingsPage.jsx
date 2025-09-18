import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaCog, FaUsers, FaLock, FaBell, FaDatabase } from 'react-icons/fa';

const AdminSettingsPage = () => {
  const [settings, setSettings] = useState({
    systemName: 'ASD Screening System',
    maxUsers: 1000,
    emailNotifications: true,
    autoBackup: true,
    dataRetention: 365,
    riskThreshold: 70,
    reportGeneration: 'automatic'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // Save settings logic here
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-gray-600 hover:text-gray-800">
              <FaArrowLeft className="text-xl" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">System Settings</h1>
              <p className="text-gray-600">Configure system-wide settings and preferences</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FaSave /> Save Settings
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaCog className="text-blue-600 text-xl" />
              <h2 className="text-xl font-semibold text-gray-800">General Settings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                <input
                  type="text"
                  value={settings.systemName}
                  onChange={(e) => handleSettingChange('systemName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Users</label>
                <input
                  type="number"
                  value={settings.maxUsers}
                  onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaUsers className="text-green-600 text-xl" />
              <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Assessment Threshold</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.riskThreshold}
                  onChange={(e) => handleSettingChange('riskThreshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Percentage threshold for high-risk classification</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Generation</label>
                <select
                  value={settings.reportGeneration}
                  onChange={(e) => handleSettingChange('reportGeneration', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaLock className="text-red-600 text-xl" />
              <h2 className="text-xl font-semibold text-gray-800">Security & Privacy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention Period (days)</label>
                <input
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoBackup"
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoBackup" className="ml-2 block text-sm text-gray-700">
                  Enable Automatic Backup
                </label>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaBell className="text-yellow-600 text-xl" />
              <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                  Enable Email Notifications
                </label>
              </div>
            </div>
          </div>

          {/* Database Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <FaDatabase className="text-purple-600 text-xl" />
              <h2 className="text-xl font-semibold text-gray-800">Database Management</h2>
            </div>
            <div className="space-y-4">
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 mr-3">
                Backup Database
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mr-3">
                Clear Old Data
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Optimize Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
