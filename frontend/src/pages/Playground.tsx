import React, { useState, useCallback } from "react";
import PlaygroundForm from "../components/playground/PlaygroundForm";
import RequestPreview from "../components/playground/RequestPreview";
import type { PreviewTab } from "../components/playground/RequestPreview";
import JobResultPanel from "../components/playground/JobResultPanel";
import type { TestJobResponse, UploadResponse } from "../types/index";
import { usePlaygroundForm } from "../hooks/usePlaygroundForm";
import { useJobPolling } from "../hooks/useJobPolling";
import { useApiFlow } from "../hooks/useApiFlow";
import { MAX_FILE_SIZE_MB } from "../components/playground/FileUploader";
import type { UploadPhase } from "../components/playground/FileUploader";
import type { FlowPhase } from "../types/apiFlow";
import api from "../api";

function Playground(): React.ReactElement {
  const {
    state,
    previewPayload,
    setField,
    setHlsField,
    setSourceMode,
    setHlsTemplate,
    addRendition,
    editRendition,
    removeRendition,
    reset: resetForm,
  } = usePlaygroundForm();

  const [response, setResponse] = useState<TestJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>("request");
  const [jobId, setJobId] = useState<string | null>(null);

  // Poll for job status once we have a job ID
  const { job: polledJob, polling } = useJobPolling(jobId);
  const effectiveJob = polledJob ?? response;

  // Upload state
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // API flow state
  const [uploadMetadata, setUploadMetadata] = useState<UploadResponse | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; type: string } | null>(null);

  // Derive flow phase from existing states
  const flowPhase: FlowPhase = (() => {
    if (effectiveJob?.status === "completed" || effectiveJob?.status === "failed") return "completed";
    if (error) return "failed";
    if (polling) return "polling_job";
    if (submitting) return "submitting";
    if (uploadPhase === "uploading" || uploadPhase === "processing") return "uploading";
    if (uploadMetadata && !submitting) return "upload_complete";
    return "idle";
  })();

  const { steps: flowSteps, activeStep: flowActiveStep } = useApiFlow(
    state,
    previewPayload,
    uploadMetadata,
    fileInfo,
    flowPhase,
    response,
    polledJob,
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Client-side validation
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setUploadError(
          `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds ${MAX_FILE_SIZE_MB}MB limit.`,
        );
        return;
      }

      setUploadError(null);
      setUploadPhase("uploading");
      setUploadProgress(0);
      setUploadedFileName(null);
      setFileInfo({ name: file.name, size: file.size, type: file.type });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await api.post<UploadResponse>(
          "/playground/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (evt) => {
              if (evt.total) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(pct);
                if (pct >= 100) {
                  setUploadPhase("processing");
                }
              }
            },
          },
        );

        setField("source_url", data.source_url);
        setUploadedFileName(file.name);
        setUploadMetadata(data);
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as {
            response?: { data?: { detail?: string }; status?: number };
          };
          setUploadError(
            axiosErr.response?.data?.detail ?? "Upload failed.",
          );
        } else {
          setUploadError("Network error — please check your connection.");
        }
      } finally {
        setUploadPhase("idle");
      }
    },
    [setField],
  );

  const handleRemoveFile = useCallback(() => {
    setUploadedFileName(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadPhase("idle");
    setUploadMetadata(null);
    setFileInfo(null);
    setField("source_url", "");
  }, [setField]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setActiveTab("response");
    setJobId(null);
    setResponse(null);

    try {
      const { data } = await api.post<TestJobResponse>(
        "/playground/test-job",
        previewPayload,
      );
      setResponse(data);
      setJobId(data.id);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosErr.response?.data?.detail ?? "An unexpected error occurred.",
        );
      } else {
        setError("Network error — please check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [previewPayload]);

  const handleReset = useCallback(() => {
    setJobId(null);
    setResponse(null);
    setError(null);
    setActiveTab("request");
    setUploadMetadata(null);
    setFileInfo(null);
    resetForm();
  }, [resetForm]);

  // Build the result tab content
  const resultContent = (
    <div className="space-y-4">
      {submitting && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
          <span className="ml-3 text-sm text-text-secondary">Submitting job...</span>
        </div>
      )}

      {error && !submitting && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Error</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {effectiveJob && !submitting && (
        <>
          {/* Warning callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            This is a live job — it counts against your account usage and
            concurrent job limit.
          </div>

          <JobResultPanel job={effectiveJob} polling={polling} />

          {/* Reset button when terminal */}
          {(effectiveJob.status === "completed" ||
            effectiveJob.status === "failed") && (
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 rounded-lg text-sm font-semibold bg-accent-soft text-text-primary hover:bg-accent-glow transition-colors cursor-pointer"
              >
                New Job
              </button>
            </div>
          )}
        </>
      )}

      {!submitting && !error && !effectiveJob && (
        <div className="flex items-center justify-center py-12 text-sm text-text-secondary">
          Submit a test job to see the response here.
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <h1 className="mb-4 text-xl font-bold text-text-primary">Playground</h1>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left panel — Form (~55%) */}
        <div className="w-[55%] shrink-0 min-w-0 bg-surface-raised border border-border rounded-xl overflow-y-auto overflow-x-hidden p-6">
          <h2 className="text-lg font-semibold mb-4 text-text-primary">
            Configuration
          </h2>
          <PlaygroundForm
            state={state}
            setField={setField}
            setHlsField={setHlsField}
            setSourceMode={setSourceMode}
            setHlsTemplate={setHlsTemplate}
            addRendition={addRendition}
            editRendition={editRendition}
            removeRendition={removeRendition}
            onSubmit={handleSubmit}
            submitting={submitting}
            uploadPhase={uploadPhase}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            uploadedFileName={uploadedFileName}
            onFileSelect={handleFileSelect}
            onRemoveFile={handleRemoveFile}
          />
        </div>

        {/* Right panel — Preview (~45%) */}
        <div className="w-[45%] min-w-0 border border-border rounded-xl overflow-hidden">
          <RequestPreview
            payload={previewPayload}
            response={effectiveJob}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            resultContent={resultContent}
            flowSteps={flowSteps}
            flowActiveStep={flowActiveStep}
          />
        </div>
      </div>
    </div>
  );
}

export default Playground;
