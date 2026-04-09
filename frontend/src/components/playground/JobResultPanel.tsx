import React from "react";
import type { TestJobResponse } from "../../types/index";
import VideoPlayer from "./VideoPlayer";

interface JobResultPanelProps {
  job: TestJobResponse;
  polling: boolean;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${mins}m ${secs}s`;
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    pending: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      dot: "bg-amber-400",
    },
    processing: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      dot: "bg-blue-400",
    },
    completed: {
      bg: "bg-green-100",
      text: "text-green-800",
      dot: "bg-green-500",
    },
    failed: {
      bg: "bg-red-100",
      text: "text-red-800",
      dot: "bg-red-500",
    },
  };

  const c = config[status] ?? config.pending;
  const isTerminal = status === "completed" || status === "failed";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${c.bg} ${c.text} text-xs font-semibold rounded`}
    >
      {!isTerminal && (
        <span
          className={`inline-block w-2 h-2 rounded-full ${c.dot} animate-pulse`}
        />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function JobResultPanel({
  job,
  polling,
}: JobResultPanelProps): React.ReactElement {
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-primary">Status:</span>
        <StatusBadge status={job.status} />
        {polling && (
          <span className="text-xs text-text-secondary">Checking status...</span>
        )}
      </div>

      {/* Error message */}
      {isFailed && job.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {job.error_message}
        </div>
      )}

      {/* Video player */}
      {isCompleted && job.output_url && (
        <VideoPlayer
          jobId={job.id}
          outputFormat={job.output_format as "mp4" | "hls"}
          subtitleUrl={job.subtitle_url}
        />
      )}

      {/* Metadata chips */}
      {isCompleted && (
        <div className="flex flex-wrap gap-2">
          {job.processing_duration_seconds !== null && (
            <span className="px-2 py-1 text-xs bg-accent-soft text-text-secondary rounded-lg">
              Duration: {formatDuration(job.processing_duration_seconds)}
            </span>
          )}
          {job.output_size_bytes !== null && (
            <span className="px-2 py-1 text-xs bg-accent-soft text-text-secondary rounded-lg">
              Size: {formatBytes(job.output_size_bytes)}
            </span>
          )}
          <span className="px-2 py-1 text-xs bg-accent-soft text-text-secondary rounded-lg">
            Format: {job.output_format.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

export default JobResultPanel;
