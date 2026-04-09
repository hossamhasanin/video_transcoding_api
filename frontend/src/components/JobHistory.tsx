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
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-yellow-50 text-yellow-700',
    transcoding: 'bg-yellow-50 text-yellow-700',
    uploading: 'bg-yellow-50 text-yellow-700',
    completed: 'bg-success-bg text-success-text',
    failed: 'bg-danger-bg text-danger-text',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

function ExpandedRow({ job }: { job: Job }): ReactNode {
  const isFailed = job.status === 'failed'
  const borderColor = isFailed ? 'border-l-[#dc3545]' : 'border-l-brand'
  const bgColor = isFailed ? 'bg-[#fff5f5]' : 'bg-[#f0f4f8]'

  const errorMessage = 'error_message' in job ? (job as Job & { error_message?: string | null }).error_message : null

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div className={`${bgColor} p-3 px-4 border-l-[3px] ${borderColor}`}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Source URL</span>
              <span className="font-mono text-xs break-all">{job.source_url}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Output URL</span>
              <span className="font-mono text-xs break-all text-brand">{job.status === 'completed' ? 'Available in API response' : '—'}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Processing Time</span>
              <span className="text-base font-semibold text-[#1a1a1a]">
                {job.processing_duration_seconds !== null ? Math.round(job.processing_duration_seconds) : '—'}
              </span>
              {job.processing_duration_seconds !== null && (
                <span className="text-xs text-[#6c757d]"> seconds</span>
              )}
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">File Size</span>
              <span>
                {formatBytes(job.source_size_bytes)}{job.output_size_bytes !== null ? ` → ${formatBytes(job.output_size_bytes)}` : ''}
              </span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Subtitle</span>
              <span>{job.generate_subtitles ? (job.subtitle_url ? 'Generated' : 'Pending') : 'Not requested'}</span>
            </div>
            <div>
              <span className="block text-[#6c757d] font-medium text-xs mb-0.5">Error</span>
              {isFailed && errorMessage ? (
                <span className="text-[#dc3545] font-mono text-xs break-all">{errorMessage}</span>
              ) : (
                <span className="text-[#28a745]">—</span>
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
        className={`border-b border-[#eee] cursor-pointer hover:bg-[#f8f9fa] ${isExpanded ? 'bg-[#f8f9fa]' : ''}`}
      >
        <td className="p-1.5 px-3 text-[#6c757d] text-xs">{isExpanded ? '▼' : '▶'}</td>
        <td className="p-1.5 px-3 font-mono text-xs">{job.id.slice(0, 8)}...</td>
        <td className="p-1.5 px-3"><StatusBadge status={job.status} /></td>
        <td className="p-1.5 px-3">{job.preset ?? '—'}</td>
        <td className="p-1.5 px-3">{job.output_format}</td>
        <td className="p-1.5 px-3 text-[#6c757d]">{formatRelativeTime(job.created_at)}</td>
        <td className="p-1.5 px-3">{formatDuration(job.processing_duration_seconds)}</td>
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

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  return (
    <div>
      <h2 className="mb-3">Job History</h2>

      {/* Filter bar */}
      <div className="bg-white rounded-lg p-2.5 px-3.5 mb-2 flex gap-2 items-center flex-wrap border border-[#e0e0e0]">
        <span className="text-xs text-[#6c757d] font-semibold">Filters:</span>

        <select
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.output_format ?? ''}
          onChange={(e) => updateFilter('output_format', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.preset ?? ''}
          onChange={(e) => updateFilter('preset', e.target.value)}
          className="p-1 px-2 border border-[#ccc] rounded text-xs bg-white"
        >
          {PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input
          type="date"
          value={filters.created_after ? filters.created_after.split('T')[0] : ''}
          onChange={(e) => updateFilter('created_after', e.target.value ? `${e.target.value}T00:00:00` : '')}
          placeholder="From"
          className="p-1 px-2 border border-[#ccc] rounded text-xs w-[130px]"
        />
        <input
          type="date"
          value={filters.created_before ? filters.created_before.split('T')[0] : ''}
          onChange={(e) => updateFilter('created_before', e.target.value ? `${e.target.value}T23:59:59` : '')}
          placeholder="To"
          className="p-1 px-2 border border-[#ccc] rounded text-xs w-[130px]"
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto p-1 px-2.5 bg-[#dc3545] text-white border-none rounded text-xs cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-danger-bg text-danger-text p-2.5 rounded mb-2">
          {getErrorMessage(error, 'Something went wrong while loading jobs.')}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden border border-[#e0e0e0]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f8f9fa] border-b-2 border-[#dee2e6]">
              <th className="p-2 px-3 text-left w-6"></th>
              <th className="p-2 px-3 text-left">ID</th>
              <th className="p-2 px-3 text-left">Status</th>
              <th className="p-2 px-3 text-left">Preset</th>
              <th className="p-2 px-3 text-left">Format</th>
              <th className="p-2 px-3 text-left">Created</th>
              <th className="p-2 px-3 text-left">Duration</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-[#6c757d]">
                  Loading jobs...
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-[#6c757d]">
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
          <div className="p-2 px-3 flex justify-between items-center border-t border-[#eee] text-xs text-[#6c757d]">
            <span>Showing {start}-{end} of {total}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 px-2 border border-[#ccc] rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="p-1 px-2 text-[#6c757d]">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`p-1 px-2 border border-[#ccc] rounded ${p === page ? 'bg-brand text-white' : 'bg-white'}`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 px-2 border border-[#ccc] rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed"
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
