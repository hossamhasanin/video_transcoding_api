import React, { useState, useCallback } from "react";
import PlaygroundForm from "../components/playground/PlaygroundForm";
import RequestPreview from "../components/playground/RequestPreview";
import type { PreviewTab } from "../components/playground/RequestPreview";
import type { TestJobResponse, UploadResponse } from "../types/index";
import { usePlaygroundForm } from "../hooks/usePlaygroundForm";
import { MAX_FILE_SIZE_MB } from "../components/playground/FileUploader";
import type { UploadPhase } from "../components/playground/FileUploader";
import api from "../api";

function Playground(): React.ReactElement {
  const {
    state,
    previewPayload,
    setField,
    setHlsField,
    setSourceMode,
    addRendition,
    editRendition,
    removeRendition,
  } = usePlaygroundForm();

  const [response, setResponse] = useState<TestJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>("request");

  // Upload state
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

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
    setField("source_url", "");
  }, [setField]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setActiveTab("response");

    try {
      const { data } = await api.post<TestJobResponse>(
        "/playground/test-job",
        previewPayload,
      );
      setResponse(data);
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <h1 className="mb-4">Playground</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left panel — Form (~55%) */}
        <div className="w-[55%] min-w-0 bg-pg-panel-bg border border-pg-border rounded-lg overflow-y-auto p-6">
          <h2 className="text-lg font-semibold mb-4 text-[#333]">
            Configuration
          </h2>
          <PlaygroundForm
            state={state}
            setField={setField}
            setHlsField={setHlsField}
            setSourceMode={setSourceMode}
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
        <div className="w-[45%] border border-pg-border rounded-lg overflow-hidden">
          <RequestPreview
            payload={previewPayload}
            response={response}
            error={error}
            submitting={submitting}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}

export default Playground;
