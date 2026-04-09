import React from 'react'
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
  RefreshCw,
  Inbox,

} from 'lucide-react'
import JobHistory from '../components/JobHistory'
import { useUsageStats } from '../hooks/useUsageStats'
import { useCountUp } from '../hooks/useCountUp'
import { getErrorMessage } from '../utils/http'

const STAT_CARDS = [
  { key: 'total_jobs', label: 'Total Jobs', icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { key: 'completed_jobs', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'failed_jobs', label: 'Failed', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { key: 'storage_used_bytes', label: 'Storage Used', icon: HardDrive, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'processed_minutes', label: 'Processed Time', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
] as const

function formatStatValue(key: string, raw: number): string {
  if (key === 'storage_used_bytes') {
    return `${(raw / (1024 * 1024)).toFixed(2)} MB`
  }
  if (key === 'processed_minutes') {
    return `${raw} mins`
  }
  return String(Math.round(raw))
}

function StatCard({
  config,
  rawValue,
  animate,
}: {
  config: (typeof STAT_CARDS)[number]
  rawValue: number
  animate: boolean
}): React.ReactElement {
  const displayTarget = config.key === 'storage_used_bytes'
    ? parseFloat((rawValue / (1024 * 1024)).toFixed(2))
    : rawValue
  const animated = useCountUp(animate ? displayTarget : 0)
  const Icon = config.icon

  return (
    <div className="bg-surface-overlay backdrop-blur-sm border border-white/20 rounded-xl p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-secondary">{config.label}</p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {animate
              ? formatStatValue(config.key, config.key === 'storage_used_bytes' ? animated * 1024 * 1024 : animated)
              : formatStatValue(config.key, rawValue)}
          </p>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className="bg-surface-overlay backdrop-blur-sm border border-white/20 rounded-xl p-5 shadow-card animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-accent-soft" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-accent-soft" />
          <div className="h-6 w-16 rounded bg-accent-soft" />
        </div>
      </div>
    </div>
  )
}

function Dashboard(): React.ReactElement {
  const { stats, error, isLoading, mutate } = useUsageStats()

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary mb-6">Dashboard Overview</h1>

      {error && (
        <div className="bg-danger-bg text-danger-text p-4 rounded-xl mb-6 flex items-center justify-between">
          <span>{getErrorMessage(error, 'Something went wrong while loading usage stats.')}</span>
          <button
            onClick={() => mutate()}
            className="ml-4 flex items-center gap-1.5 text-sm font-medium text-danger-text hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 mb-10">
          {STAT_CARDS.map((c) => (
            <SkeletonCard key={c.key} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 mb-10">
          {STAT_CARDS.map((config) => (
            <StatCard
              key={config.key}
              config={config}
              rawValue={stats[config.key]}
              animate
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-raised rounded-xl border border-border p-12 mb-10 text-center">
          <Inbox className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary font-medium">No stats available yet</p>
          <p className="text-sm text-text-tertiary mt-1">Submit your first transcoding job to see usage data here.</p>
        </div>
      )}

      <div className="mt-10">
        <JobHistory />
      </div>
    </div>
  )
}

export default Dashboard
