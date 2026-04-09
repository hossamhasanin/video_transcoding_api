import React, { useState, useRef, useCallback } from "react";

const ACCEPTED_VIDEO_TYPES =
  "video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska";
const MAX_FILE_SIZE_MB = 500;

type UploadPhase = "idle" | "uploading" | "processing";

interface FileUploaderProps {
  phase: UploadPhase;
  progress: number;
  error: string | null;
  uploadedFile: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUploader({
  phase,
  progress,
  error,
  uploadedFile,
  onFileSelect,
  onRemove,
}: FileUploaderProps): React.ReactElement {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  if (uploadedFile) {
    return (
      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-surface-raised overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg
            className="w-5 h-5 text-accent shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm text-text-primary truncate">{uploadedFile}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-red-600 hover:text-red-700 shrink-0 ml-2 cursor-pointer"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragging
            ? "border-accent bg-accent-soft"
            : "border-border hover:border-accent/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES}
          onChange={handleChange}
          className="hidden"
        />

        {phase === "uploading" ? (
          <div className="space-y-3">
            <p className="text-sm text-text-primary font-medium">Uploading...</p>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">{Math.round(progress)}%</p>
          </div>
        ) : phase === "processing" ? (
          <div className="space-y-3">
            <p className="text-sm text-text-primary font-medium">
              Processing upload...
            </p>
            <div className="w-full rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(-45deg, var(--color-accent) 0px, var(--color-accent) 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)",
                  backgroundSize: "40px 40px",
                  animation: "stripe-slide 0.8s linear infinite",
                }}
              />
            </div>
            <p className="text-xs text-text-secondary">Saving to storage...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="w-8 h-8 mx-auto text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-text-primary">
              <span className="text-accent font-medium">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-text-secondary">
              MP4, MOV, WebM, AVI, MKV (max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default FileUploader;
export { formatSize, MAX_FILE_SIZE_MB };
export type { UploadPhase };
