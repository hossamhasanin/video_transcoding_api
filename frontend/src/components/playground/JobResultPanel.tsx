import React, { useState, useCallback } from "react";
import { FileVideo, Subtitles, Loader2 } from "lucide-react";
import type { TestJobResponse } from "../../types/index";
import { useAuthStore } from "../../store/authStore";
import VideoPlayer from "./VideoPlayer";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

function buildProxyUrl(jobId: string, filePath: string): string {
  const tokens = useAuthStore.getState().tokens;
  const token = tokens?.access_token ?? "";
  return `${API_BASE}/playground/stream/${jobId}/${filePath}?token=${encodeURIComponent(token)}`;
}

interface JobResultPanelProps {
  job: TestJobResponse;
  polling: boolean;
}

async function downloadFromUrl(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
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

  const [downloading, setDownloading] = useState<
    "video" | "subtitle" | null
  >(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const videoDownloadUrl =
    job.output_format === "hls"
      ? buildProxyUrl(job.id, "hls_output.zip")
      : buildProxyUrl(job.id, "output.mp4");
  const videoDownloadLabel =
    job.output_format === "hls" ? "Download HLS Package" : "Download Video";
  const videoDownloadFilename =
    job.output_format === "hls"
      ? `${job.id}-hls.zip`
      : `${job.id}-output.mp4`;
  const subtitleDownloadUrl = buildProxyUrl(job.id, "subtitles.vtt");
  const subtitleDownloadFilename = `${job.id}-subtitles.vtt`;

  const handleDownload = useCallback(
    async (
      url: string,
      filename: string,
      type: "video" | "subtitle",
    ) => {
      setDownloading(type);
      setDownloadError(null);
      try {
        await downloadFromUrl(url, filename);
      } catch {
        setDownloadError(
          `Failed to download ${type}. The link may have expired.`,
        );
      } finally {
        setDownloading(null);
      }
    },
    [],
  );

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

      {/* Download buttons */}
      {isCompleted && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {videoDownloadUrl && (
            <button
              type="button"
              onClick={() =>
                handleDownload(
                  videoDownloadUrl,
                  videoDownloadFilename,
                  "video",
                )
              }
              disabled={downloading !== null}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                transition-colors cursor-pointer
                bg-accent-soft text-text-primary hover:bg-accent-glow
                ${downloading !== null ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {downloading === "video" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileVideo className="w-4 h-4" />
              )}
              {videoDownloadLabel}
            </button>
          )}

          {job.subtitle_url && (
            <button
              type="button"
              onClick={() =>
                handleDownload(
                  subtitleDownloadUrl,
                  subtitleDownloadFilename,
                  "subtitle",
                )
              }
              disabled={downloading !== null}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                transition-colors cursor-pointer
                bg-accent-soft text-text-primary hover:bg-accent-glow
                ${downloading !== null ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {downloading === "subtitle" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Subtitles className="w-4 h-4" />
              )}
              Download Subtitles
            </button>
          )}
        </div>
      )}

      {/* Download error */}
      {downloadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {downloadError}
        </div>
      )}
    </div>
  );
}

export default JobResultPanel;
