import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FiHome, FiUsers, FiFileText, FiSettings, FiLogOut, FiCalendar, FiClock, FiActivity, FiArrowLeft, FiMonitor } from 'react-icons/fi';
import { FaEye, FaSave } from 'react-icons/fa';
import './TherapistDashboard.css';

const GazeDashboard = () => {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [observations, setObservations] = useState({}); // { snapshotId: notes }
  const socketRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.io
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('new-snapshot', (snapshot) => {
      setSelectedSession(prev => {
        if (!prev) return null;
        // Check if this snapshot belongs to the current selected session
        // Note: The backend emits to specific session rooms, so we only get what we need
        return {
          ...prev,
          snapshots: [...prev.snapshots, snapshot]
        };
      });
      
      if (snapshot._id) {
        setObservations(prev => ({ ...prev, [snapshot._id]: '' }));
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/gaze/sessions/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/therapist/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
        
        // Join the socket room for this session
        if (socketRef.current) {
          socketRef.current.emit('join-session', sessionId);
        }

        // Initialize observations from fetched data
        const notesObj = {};
        data.snapshots.forEach(s => {
          notesObj[s._id] = s.notes || '';
        });
        setObservations(prev => ({ ...notesObj, ...prev }));
      }
    } catch (err) {
      console.error("Failed to fetch session details:", err);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
    
    // Auto refresh sessions list (keep this for new sessions appearing)
    refreshIntervalRef.current = setInterval(() => {
      fetchActiveSessions();
    }, 10000);

    return () => clearInterval(refreshIntervalRef.current);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleSaveNotes = async (snapshotId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/gaze/snapshot/${selectedSession._id}/${snapshotId}/notes`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: observations[snapshotId] })
      });
      if (response.ok) {
        alert("Notes saved successfully");
      }
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  };

  return (
    <div className="therapist-dashboard-page">
      {/* Sidebar - Reusing existing styles */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <h2>CORTEXA</h2>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => navigate('/therapist')} className="nav-item">
            <FiHome className="nav-icon" /> <span>Dashboard</span>
          </button>
          <button onClick={() => navigate('/therapist/patients')} className="nav-item">
            <FiUsers className="nav-icon" /> <span>My Patients</span>
          </button>
          <button className="nav-item active">
            <FiMonitor className="nav-icon" /> <span>Live Gaze Analysis</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <FiLogOut className="nav-icon" /> <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="main-header">
          <div className="welcome-section">
            <h1 className="welcome-title">Live Gaze Analysis Dashboard</h1>
            <p className="welcome-subtitle">Monitor patient attention and gaze patterns in real-time</p>
          </div>
        </div>

        <div className="content-area" style={{ padding: '20px' }}>
          <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
            
            {/* Left Column: Active Sessions */}
            <div className="sessions-list" style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiActivity color="#4f46e5" /> Active Sessions
              </h3>
              
              {loading ? <p>Loading sessions...</p> : activeSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>No active sessions found.</p>
                  <button 
                    onClick={() => navigate('/therapist/patients')}
                    style={{ marginTop: '10px', padding: '8px 15px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Start a Session
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeSessions.map(session => (
                    <div 
                      key={session._id}
                      onClick={() => setSelectedSession(session)}
                      style={{ 
                        padding: '15px', 
                        borderRadius: '10px', 
                        border: selectedSession?._id === session._id ? '2px solid #4f46e5' : '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: selectedSession?._id === session._id ? '#f5f3ff' : '#fff',
                        transition: 'all 0.2s'
                      }}
                    >
                      <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{session.patientId?.name || 'Unknown Patient'}</p>
                      <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                        <FiClock size={10} /> Started: {new Date(session.startTime).toLocaleTimeString()}
                      </p>
                      <p style={{ fontSize: '12px', color: '#4f46e5', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                        {session.snapshots?.length || 0} Snapshots captured
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Session Details & Snapshots */}
            <div className="session-details" style={{ backgroundColor: '#fff', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '600px' }}>
              {!selectedSession ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                  <FiMonitor size={60} style={{ marginBottom: '20px', opacity: 0.2 }} />
                  <p>Select an active session to view real-time data</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                    <div>
                      <h2 style={{ margin: 0 }}>{selectedSession.patientId?.name}</h2>
                      <p style={{ color: '#666', margin: '5px 0 0 0' }}>Session ID: {selectedSession._id}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ backgroundColor: '#10b981', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>LIVE</span>
                    </div>
                  </div>

                  <div className="snapshots-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {[...(selectedSession.snapshots || [])].reverse().map((snap, idx) => (
                      <div 
                        key={snap._id || idx} 
                        style={{ 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '12px', 
                          overflow: 'hidden', 
                          border: '1px solid #eee',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div style={{ position: 'relative', height: '180px' }}>
                          <img 
                            src={`http://localhost:5000${snap.imagePath}`} 
                            alt="Gaze Snapshot" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button 
                            onClick={() => setSelectedImage(`http://localhost:5000${snap.imagePath}`)}
                            style={{ 
                              position: 'absolute', top: '10px', right: '10px', 
                              backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', 
                              padding: '5px', borderRadius: '5px', cursor: 'pointer' 
                            }}
                          >
                            <FaEye size={14} color="#4f46e5" />
                          </button>
                        </div>
                        <div style={{ padding: '15px', flexGrow: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#666' }}>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                            <span style={{ 
                              fontSize: '11px', fontWeight: 'bold', 
                              color: snap.attentionScore > 0.6 ? '#10b981' : '#f59e0b' 
                            }}>
                              Attn: {(snap.attentionScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#374151' }}>
                            Gaze: <span style={{ textTransform: 'capitalize', color: '#4f46e5' }}>{snap.gazeDirection || 'unknown'}</span>
                          </p>
                          
                          <div style={{ marginTop: '10px' }}>
                            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '5px' }}>Therapist Notes:</label>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <textarea 
                                value={observations[snap._id] || ''}
                                onChange={(e) => setObservations({ ...observations, [snap._id]: e.target.value })}
                                style={{ 
                                  width: '100%', height: '60px', borderRadius: '5px', border: '1px solid #ddd',
                                  fontSize: '12px', padding: '5px', resize: 'none'
                                }}
                                placeholder="Add observations..."
                              />
                              <button 
                                onClick={() => handleSaveNotes(snap._id)}
                                style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px', padding: '0 8px', cursor: 'pointer' }}
                                title="Save Notes"
                              >
                                <FaSave size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '40px'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '10px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} 
          />
          <button 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default GazeDashboard;
