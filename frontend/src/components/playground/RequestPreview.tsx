import React from "react";
import type { RequestPreviewPayload, TestJobResponse } from "../../types/index";
import type { FlowStep } from "../../types/apiFlow";
import ApiFlowPanel from "./ApiFlowPanel";

type PreviewTab = "request" | "response";

interface RequestPreviewProps {
  payload: RequestPreviewPayload;
  response: TestJobResponse | null;
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  resultContent: React.ReactNode;
  flowSteps: FlowStep[];
  flowActiveStep: number;
}

function RequestPreview({
  response,
  activeTab,
  onTabChange,
  resultContent,
  flowSteps,
  flowActiveStep,
}: RequestPreviewProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-surface-raised rounded-t-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onTabChange("request")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "request"
              ? "bg-surface text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          API Flow
        </button>
        <button
          type="button"
          onClick={() => onTabChange("response")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "response"
              ? "bg-surface text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Result
          {response && (
            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle" />
          )}
        </button>
      </div>

      {/* API Flow tab content */}
      {activeTab === "request" && (
        <ApiFlowPanel steps={flowSteps} activeStep={flowActiveStep} />
      )}

      {/* Result tab content */}
      {activeTab === "response" && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-surface-raised p-4 rounded-b-lg">
          {resultContent}
        </div>
      )}
    </div>
  );
}

export default RequestPreview;
export type { PreviewTab };
