import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Job } from '../types'
import { useJobs, type JobFilters } from '../hooks/useJobs'
import { getErrorMessage } from '../utils/http'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'transcoding', label: 'Transcoding' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const FORMAT_OPTIONS = [
  { value: '', label: 'All Formats' },
  { value: 'mp4', label: 'MP4' },
  { value: 'hls', label: 'HLS' },
]

const PRESET_OPTIONS = [
  { value: '', label: 'All Presets' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
]

const ACTIVE_STATUSES = ['processing', 'transcoding', 'uploading']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }): ReactNode {
  const isActive = ACTIVE_STATUSES.includes(status)

  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-amber-50 text-amber-700',
    transcoding: 'bg-amber-50 text-amber-700',
    uploading: 'bg-amber-50 text-amber-700',
    completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-rose-50 text-rose-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'animate-pulse-soft' : ''} ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  )
}

function ExpandedRow({ job }: { job: Job }): ReactNode {
  const isFailed = job.status === 'failed'

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div
          className={`animate-slide-down ${isFailed ? 'bg-rose-50/50' : 'bg-accent-soft/30'} p-4 px-5 border-l-[3px] ${isFailed ? 'border-l-danger' : 'border-l-accent'}`}
        >
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                Source URL
              </span>
              <span className="font-mono text-xs break-all">{job.source_url}</span>
            </div>
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                Output URL
              </span>
              <span className="font-mono text-xs break-all text-accent">
                {job.status === 'completed' ? 'Available in API response' : '—'}
              </span>
            </div>
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                Processing Time
              </span>
              <span className="text-base font-semibold text-text-primary">
                {job.processing_duration_seconds !== null
                  ? Math.round(job.processing_duration_seconds)
                  : '—'}
              </span>
              {job.processing_duration_seconds !== null && (
                <span className="text-xs text-text-secondary"> seconds</span>
              )}
            </div>
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                File Size
              </span>
              <span>
                {formatBytes(job.source_size_bytes)}
                {job.output_size_bytes !== null
                  ? ` → ${formatBytes(job.output_size_bytes)}`
                  : ''}
              </span>
            </div>
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                Subtitle
              </span>
              <span>
                {job.generate_subtitles
                  ? job.subtitle_url
                    ? 'Generated'
                    : 'Pending'
                  : 'Not requested'}
              </span>
            </div>
            <div>
              <span className="block text-text-secondary font-medium text-xs mb-1">
                Error
              </span>
              {isFailed && job.error_message ? (
                <span className="text-danger font-mono text-xs break-all">
                  {job.error_message}
                </span>
              ) : (
                <span className="text-emerald-600">—</span>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Job row component
// ---------------------------------------------------------------------------

function JobRow({
  job,
  isExpanded,
  onToggle,
}: {
  job: Job
  isExpanded: boolean
  onToggle: (id: string) => void
}): ReactNode {
  return (
    <>
      <tr
        onClick={() => onToggle(job.id)}
        className={`border-b border-border-subtle cursor-pointer hover:bg-accent-soft transition-colors duration-150 ${isExpanded ? 'bg-accent-soft/50' : ''}`}
      >
        <td className="p-2 px-3 text-text-tertiary text-xs">
          {isExpanded ? '▼' : '▶'}
        </td>
        <td className="p-2 px-3 font-mono text-xs">{job.id.slice(0, 8)}...</td>
        <td className="p-2 px-3">
          <StatusBadge status={job.status} />
        </td>
        <td className="p-2 px-3">{job.preset ?? '—'}</td>
        <td className="p-2 px-3">{job.output_format}</td>
        <td className="p-2 px-3 text-text-secondary">
          {formatRelativeTime(job.created_at)}
        </td>
        <td className="p-2 px-3">
          {formatDuration(job.processing_duration_seconds)}
        </td>
      </tr>
      {isExpanded && <ExpandedRow job={job} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function JobHistory(): ReactNode {
  const [filters, setFilters] = useState<JobFilters>({})
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { jobs, total, isLoading, error } = useJobs({ filters, page, pageSize: PAGE_SIZE })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const updateFilter = useCallback((key: keyof JobFilters, value: string) => {
    setFilters((prev) => {
      const next = { ...prev }
      if (value) {
        next[key] = value
      } else {
        delete next[key]
      }
      return next
    })
    setPage(1)
    setExpandedId(null)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setPage(1)
    setExpandedId(null)
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '',
  )

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">Job History</h2>

      {/* Filter bar */}
      <div className="bg-surface-raised rounded-xl p-3 px-4 mb-3 flex gap-2.5 items-center flex-wrap border border-border">
        <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
          Filters
        </span>

        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="rounded-full border border-border px-3 py-1 text-xs bg-surface-raised focus:border-accent focus:ring-2 focus:ring-accent-glow outline-none transition-colors duration-150"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.output_format ?? ''}
          onChange={(e) => updateFilter('output_format', e.target.value)}
          className="rounded-full border border-border px-3 py-1 text-xs bg-surface-raised focus:border-accent focus:ring-2 focus:ring-accent-glow outline-none transition-colors duration-150"
        >
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.preset ?? ''}
          onChange={(e) => updateFilter('preset', e.target.value)}
          className="rounded-full border border-border px-3 py-1 text-xs bg-surface-raised focus:border-accent focus:ring-2 focus:ring-accent-glow outline-none transition-colors duration-150"
        >
          {PRESET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">From</span>
          <input
            type="date"
            value={
              filters.created_after ? filters.created_after.split('T')[0] : ''
            }
            onChange={(e) =>
              updateFilter(
                'created_after',
                e.target.value ? `${e.target.value}T00:00:00` : '',
              )
            }
            className="rounded-lg border border-border px-2 py-1 text-xs w-[130px] bg-surface-raised focus:border-accent focus:ring-2 focus:ring-accent-glow outline-none transition-colors duration-150"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">To</span>
          <input
            type="date"
            value={
              filters.created_before
                ? filters.created_before.split('T')[0]
                : ''
            }
            onChange={(e) =>
              updateFilter(
                'created_before',
                e.target.value ? `${e.target.value}T23:59:59` : '',
              )
            }
            className="rounded-lg border border-border px-2 py-1 text-xs w-[130px] bg-surface-raised focus:border-accent focus:ring-2 focus:ring-accent-glow outline-none transition-colors duration-150"
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto px-3 py-1 bg-danger/10 text-danger hover:bg-danger/20 rounded-lg text-xs cursor-pointer transition-colors duration-150 border-none"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded-lg mb-3 border border-rose-200">
          {getErrorMessage(error, 'Something went wrong while loading jobs.')}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-raised rounded-xl overflow-x-auto border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="backdrop-blur-sm bg-white/80 border-b border-border">
              <th className="p-2.5 px-3 text-left w-6"></th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                ID
              </th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Preset
              </th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Format
              </th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Created
              </th>
              <th className="p-2.5 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-text-secondary"
                >
                  Loading jobs...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-text-secondary"
                >
                  No jobs found{hasActiveFilters ? ' with current filters' : ''}.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isExpanded={expandedId === job.id}
                  onToggle={toggleExpand}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 0 && (
          <div className="p-3 px-4 flex justify-between items-center border-t border-border-subtle text-xs text-text-secondary">
            <span>
              Showing {start}–{end} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-text-secondary hover:bg-accent-soft border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                    acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 py-1 text-text-tertiary"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2.5 py-1 rounded-lg border-none cursor-pointer transition-colors duration-150 ${
                        p === page
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:bg-accent-soft bg-transparent'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-text-secondary hover:bg-accent-soft border-none bg-transparent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JobHistory
