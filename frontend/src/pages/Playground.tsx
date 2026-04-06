import React, { useState, useCallback } from "react";
import PlaygroundForm from "../components/playground/PlaygroundForm";
import RequestPreview from "../components/playground/RequestPreview";
import type { PreviewTab } from "../components/playground/RequestPreview";
import type { TestJobResponse } from "../types/index";
import { usePlaygroundForm } from "../hooks/usePlaygroundForm";
import api from "../api";

function Playground(): React.ReactElement {
  const {
    state,
    previewPayload,
    setField,
    setHlsField,
    addRendition,
    editRendition,
    removeRendition,
  } = usePlaygroundForm();

  const [response, setResponse] = useState<TestJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>("request");

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
        <div className="w-[55%] bg-pg-panel-bg border border-pg-border rounded-lg overflow-y-auto p-6">
          <h2 className="text-lg font-semibold mb-4 text-[#333]">
            Configuration
          </h2>
          <PlaygroundForm
            state={state}
            setField={setField}
            setHlsField={setHlsField}
            addRendition={addRendition}
            editRendition={editRendition}
            removeRendition={removeRendition}
            onSubmit={handleSubmit}
            submitting={submitting}
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
