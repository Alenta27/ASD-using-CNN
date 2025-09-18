import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash } from 'react-icons/fa';

const TeacherStudentsPage = () => {
  const students = [
    { id: 1, name: 'Alice Johnson', age: 8, grade: '3rd', riskLevel: 'Low', lastScreening: '2024-01-15', status: 'Active' },
    { id: 2, name: 'Ben Carter', age: 7, grade: '2nd', riskLevel: 'Medium', lastScreening: '2024-01-10', status: 'Active' },
    { id: 3, name: 'Chloe Singh', age: 9, grade: '4th', riskLevel: 'High', lastScreening: '2024-01-12', status: 'Active' },
    { id: 4, name: 'Daniel Kim', age: 8, grade: '3rd', riskLevel: 'Medium', lastScreening: '2024-01-08', status: 'Active' },
    { id: 5, name: 'Emma Wilson', age: 7, grade: '2nd', riskLevel: 'Low', lastScreening: '2024-01-14', status: 'Active' },
  ];

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/teacher" className="text-gray-600 hover:text-gray-800">
              <FaArrowLeft className="text-xl" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Student Management</h1>
              <p className="text-gray-600">Manage your students and their screening progress</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <FaUserPlus /> Add Student
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, grade, or risk level..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <FaFilter /> Filter
            </button>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{student.name}</h3>
                  <p className="text-gray-600">Age: {student.age} • Grade: {student.grade}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(student.riskLevel)}`}>
                  {student.riskLevel} Risk
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Screening:</span>
                  <span className="text-gray-900">{student.lastScreening}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-green-600 font-medium">{student.status}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  <FaEye /> View Details
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                  <FaEdit /> Edit
                </button>
                <button className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {students.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Students Yet</h3>
            <p className="text-gray-600 mb-6">Add your first student to start tracking their progress</p>
            <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
              <FaUserPlus /> Add Your First Student
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentsPage;
