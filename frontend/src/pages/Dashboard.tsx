import React from 'react'
import ApiKeyManager from '../components/ApiKeyManager'
import { useUsageStats } from '../hooks/useUsageStats'
import { getErrorMessage } from '../utils/http'

function Dashboard(): React.ReactElement {
  const { stats, error, isLoading } = useUsageStats()

  return (
    <div>
      <h1>Dashboard Overview</h1>

      {error && (
        <div className="bg-danger-bg text-danger-text p-2.5 rounded mb-5">
          {getErrorMessage(error, 'Something went wrong while loading usage stats.')}
        </div>
      )}

      {isLoading ? (
        <p>Loading stats...</p>
      ) : stats ? (
        <div className="flex gap-5 mb-10 flex-wrap">
          <div className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]">
            <h3>Total Jobs</h3>
            <p className="text-2xl font-bold text-brand">{stats.total_jobs}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]">
            <h3>Completed</h3>
            <p className="text-2xl font-bold text-brand">{stats.completed_jobs}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]">
            <h3>Failed</h3>
            <p className="text-2xl font-bold text-brand">{stats.failed_jobs}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]">
            <h3>Storage Used</h3>
            <p className="text-2xl font-bold text-brand">{(stats.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-card flex-[1_1_150px] text-center min-w-[150px]">
            <h3>Processed Time</h3>
            <p className="text-2xl font-bold text-brand">{stats.processed_minutes} mins</p>
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

export default Dashboard
