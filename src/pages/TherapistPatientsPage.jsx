import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus, FaSearch, FaFilter, FaEye, FaEdit, FaCalendar, FaFileAlt } from 'react-icons/fa';

const TherapistPatientsPage = () => {
  const patients = [
    { id: 1, name: 'Keziah Thompson', age: 6, diagnosis: 'ASD Level 2', lastSession: '2024-01-15', nextAppointment: '2024-01-22', status: 'Active' },
    { id: 2, name: 'Yannik Rodriguez', age: 8, diagnosis: 'ASD Level 1', lastSession: '2024-01-12', nextAppointment: '2024-01-19', status: 'Active' },
    { id: 3, name: 'Sophia Chen', age: 5, diagnosis: 'ASD Level 3', lastSession: '2024-01-10', nextAppointment: '2024-01-17', status: 'Active' },
    { id: 4, name: 'Marcus Johnson', age: 7, diagnosis: 'ASD Level 2', lastSession: '2024-01-08', nextAppointment: '2024-01-15', status: 'Active' },
    { id: 5, name: 'Lily Anderson', age: 9, diagnosis: 'ASD Level 1', lastSession: '2024-01-05', nextAppointment: '2024-01-12', status: 'Active' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Discharged': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/therapist" className="text-gray-600 hover:text-gray-800">
              <FaArrowLeft className="text-xl" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Patient Management</h1>
              <p className="text-gray-600">Manage your patients and their therapy sessions</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <FaUserPlus /> Add Patient
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name, diagnosis, or status..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <FaFilter /> Filter
            </button>
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{patient.name}</h3>
                  <p className="text-gray-600">Age: {patient.age} • {patient.diagnosis}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(patient.status)}`}>
                  {patient.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Session:</span>
                  <span className="text-gray-900">{patient.lastSession}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Next Appointment:</span>
                  <span className="text-blue-600 font-medium">{patient.nextAppointment}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  <FaEye /> View Profile
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                  <FaCalendar /> Schedule
                </button>
                <button className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                  <FaFileAlt />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {patients.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🏥</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Patients Yet</h3>
            <p className="text-gray-600 mb-6">Add your first patient to start managing their therapy sessions</p>
            <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              <FaUserPlus /> Add Your First Patient
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistPatientsPage;
