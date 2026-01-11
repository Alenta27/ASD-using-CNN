import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { FiHome, FiUsers, FiFileText, FiSettings, FiLogOut, FiCalendar, FiClock, FiActivity, FiArrowLeft, FiMonitor } from 'react-icons/fi';
import { FaEye, FaSave } from 'react-icons/fa';
import './TherapistDashboard.css';

const GazeDashboard = () => {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState([]);
  const [pendingReviewSessions, setPendingReviewSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('live'); // 'live' or 'review'
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [observations, setObservations] = useState({}); // { snapshotId: notes }
  const socketRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.io
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('new-snapshot', (snapshot) => {
      console.log('🆕 Received new snapshot via socket:', snapshot);
      setSelectedSession(prev => {
        if (!prev) return null;
        
        // Only update if the snapshot belongs to the selected session
        // Note: The socket room already filters this, but extra check doesn't hurt
        const alreadyExists = prev.snapshots.some(s => s._id === snapshot._id || (s.imagePath === snapshot.imagePath && s.timestamp === snapshot.timestamp));
        if (alreadyExists) return prev;

        return {
          ...prev,
          snapshots: [...prev.snapshots, snapshot]
        };
      });
      
      // Update the active sessions list to show new snapshot count if needed
      setActiveSessions(prev => prev.map(s => {
        if (s._id === selectedSession?._id || s._id === snapshot.sessionId) {
          return { ...s, snapshots: [...(s.snapshots || []), snapshot] };
        }
        return s;
      }));
      
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
      // Fetch Live Sessions
      const liveRes = await fetch('http://localhost:5000/api/gaze/sessions/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (liveRes.ok) {
        const data = await liveRes.json();
        setActiveSessions(data);
      }

      // Fetch Pending Review Sessions
      const reviewRes = await fetch('http://localhost:5000/api/gaze/sessions/pending-review', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reviewRes.ok) {
        const data = await reviewRes.json();
        setPendingReviewSessions(data);
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

  const handleCreateReport = async (title) => {
    try {
      if (!selectedSession.patientId?._id && !selectedSession.isGuest) {
        alert("Cannot create report: Patient ID missing.");
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/therapist/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: selectedSession.patientId?._id || null,
          guestSessionId: selectedSession.isGuest ? selectedSession._id : null,
          title: title,
          status: 'final'
        })
      });

      if (response.ok) {
        alert("Report created successfully");
      } else {
        const data = await response.json();
        alert(`Failed to create report: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to create report:", err);
      alert("Error creating report");
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
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button 
                  onClick={() => setViewMode('live')}
                  style={{ 
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none', 
                    backgroundColor: viewMode === 'live' ? '#4f46e5' : '#f3f4f6',
                    color: viewMode === 'live' ? '#fff' : '#4b5563',
                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  Live
                </button>
                <button 
                  onClick={() => setViewMode('review')}
                  style={{ 
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none', 
                    backgroundColor: viewMode === 'review' ? '#4f46e5' : '#f3f4f6',
                    color: viewMode === 'review' ? '#fff' : '#4b5563',
                    fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  Review ({pendingReviewSessions.length})
                </button>
              </div>

              <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px' }}>
                {viewMode === 'live' ? <FiActivity color="#4f46e5" /> : <FiFileText color="#4f46e5" />} 
                {viewMode === 'live' ? 'Live Sessions' : 'Pending Review'}
              </h3>
              
              {loading ? <p>Loading...</p> : (viewMode === 'live' ? activeSessions : pendingReviewSessions).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>No sessions found.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(viewMode === 'live' ? activeSessions : pendingReviewSessions).map(session => (
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>
                          {session.isGuest ? (session.guestInfo?.childName || 'Guest') : (session.patientId?.name || 'Unknown Patient')}
                        </p>
                        {session.isGuest && (
                          <span style={{ fontSize: '9px', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>GUEST</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
                          <FiClock size={10} /> {new Date(session.startTime).toLocaleDateString()}
                        </p>
                        <span style={{ 
                          fontSize: '10px', padding: '2px 6px', borderRadius: '10px', 
                          backgroundColor: session.status === 'active' ? '#dcfce7' : '#fef3c7',
                          color: session.status === 'active' ? '#166534' : '#92400e',
                          fontWeight: 'bold'
                        }}>
                          {session.status.toUpperCase()}
                        </span>
                      </div>
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
                      <h2 style={{ margin: 0 }}>
                        {selectedSession.isGuest ? selectedSession.guestInfo?.childName : selectedSession.patientId?.name}
                        {selectedSession.isGuest && <span style={{ marginLeft: '10px', fontSize: '12px', verticalAlign: 'middle', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px' }}>Guest Session</span>}
                      </h2>
                      <p style={{ color: '#666', margin: '5px 0 0 0' }}>
                        {selectedSession.isGuest ? `Parent: ${selectedSession.guestInfo?.parentName} | Email: ${selectedSession.guestInfo?.email}` : `Session ID: ${selectedSession._id}`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {!selectedSession.isGuest && (
                        <button 
                          onClick={() => navigate('/therapist/slots', { state: { patientId: selectedSession.patientId?._id } })}
                          style={{ 
                            backgroundColor: '#4f46e5', color: '#fff', border: 'none', 
                            padding: '8px 15px', borderRadius: '8px', fontSize: '12px', 
                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                          }}
                        >
                          <FiCalendar size={14} /> Schedule Appointment
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const name = selectedSession.isGuest ? selectedSession.guestInfo?.childName : selectedSession.patientId?.name;
                          const title = prompt("Enter Report Title:", `Gaze Analysis Report - ${name}`);
                          if (title) handleCreateReport(title);
                        }}
                        style={{ 
                          backgroundColor: '#10b981', color: '#fff', border: 'none', 
                          padding: '8px 15px', borderRadius: '8px', fontSize: '12px', 
                          fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                      >
                        <FiFileText size={14} /> Create Report
                      </button>
                      <span style={{ 
                        backgroundColor: selectedSession.status === 'active' ? '#10b981' : '#f59e0b', 
                        color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {selectedSession.status === 'active' ? 'LIVE' : 'PENDING REVIEW'}
                      </span>
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
