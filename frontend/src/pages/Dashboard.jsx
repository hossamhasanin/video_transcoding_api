import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ApiKeyManager from '../components/ApiKeyManager';

function Dashboard({ apiKey }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiKey) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    
    axios.get(`${API_URL}/usage`, {
      headers: { 'X-API-Key': apiKey }
    })
    .then(res => {
      setStats(res.data);
      setError('');
    })
    .catch(err => {
      setError('Failed to load stats. Check API key.');
      console.error(err);
    });
  }, [apiKey]);

  return (
    <div>
      <h1>Dashboard Overview</h1>
      
      {error && <div style={{color: 'red', marginBottom: '20px'}}>{error}</div>}
      
      {stats ? (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
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
            <h3>Storage Used (MB)</h3>
            <p style={statStyle}>{(stats.storage_used_bytes / (1024 * 1024)).toFixed(2)}</p>
          </div>
          <div style={cardStyle}>
            <h3>Processed Mins</h3>
            <p style={statStyle}>{stats.processed_minutes}</p>
          </div>
        </div>
      ) : (
        <p>Enter a valid API key to load stats.</p>
      )}

      <h2>API Keys</h2>
      <ApiKeyManager apiKey={apiKey} />
    </div>
  );
}

const cardStyle = {
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  flex: 1,
  textAlign: 'center'
};

const statStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#007bff'
};

export default Dashboard;
