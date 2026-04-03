import React, { useEffect, useState } from 'react';
import api from '../api';
import ApiKeyManager from '../components/ApiKeyManager';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/usage')
      .then((res) => {
        setStats(res.data);
        setError('');
      })
      .catch((err) => {
        setError('Failed to load stats.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Dashboard Overview</h1>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      {loading ? (
        <p>Loading stats...</p>
      ) : stats ? (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <div style={cardStyle}>
            <h3>Total Jobs</h3>
            <p style={statStyle}>{stats.total_jobs}</p>
          </div>
          <div style={cardStyle}>
            <h3>Completed</h3>
            <p style={statStyle}>{stats.completed_jobs}</p>
          </div>
          <div style={cardStyle}>
            <h3>Failed</h3>
            <p style={statStyle}>{stats.failed_jobs}</p>
          </div>
          <div style={cardStyle}>
            <h3>Storage Used</h3>
            <p style={statStyle}>{(stats.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          <div style={cardStyle}>
            <h3>Processed Time</h3>
            <p style={statStyle}>{stats.processed_minutes} mins</p>
          </div>
        </div>
      ) : (
        <p>No stats available.</p>
      )}

      <h2>API Keys</h2>
      <ApiKeyManager />
    </div>
  );
}

const cardStyle = {
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  flex: '1 1 150px',
  textAlign: 'center',
  minWidth: '150px',
};

const statStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#007bff',
};

export default Dashboard;
