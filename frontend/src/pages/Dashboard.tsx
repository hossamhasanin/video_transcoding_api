import React from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
import { useUsageStats } from '../hooks/useUsageStats'

function Dashboard(): React.ReactElement {
  const { stats, error, isLoading } = useUsageStats()

  return (
    <div>
      <h1>Dashboard Overview</h1>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          {(error as any).response?.data?.detail ?? error.message}
        </div>
      )}

      {isLoading ? (
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
  )
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  flex: '1 1 150px',
  textAlign: 'center',
  minWidth: '150px',
}

const statStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#007bff',
}

export default Dashboard
