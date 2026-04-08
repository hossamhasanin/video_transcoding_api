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
      <div className="flex border-b border-pg-border bg-pg-panel-bg rounded-t-lg overflow-hidden">
        <button
          type="button"
          onClick={() => onTabChange("request")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "request"
              ? "bg-pg-header-bg text-brand border-b-2 border-brand"
              : "text-muted hover:text-[#333]"
          }`}
        >
          API Flow
        </button>
        <button
          type="button"
          onClick={() => onTabChange("response")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "response"
              ? "bg-pg-header-bg text-brand border-b-2 border-brand"
              : "text-muted hover:text-[#333]"
          }`}
        >
          Result
          {response && (
            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-green-500 align-middle" />
          )}
        </button>
      </div>

      {/* API Flow tab content */}
      {activeTab === "request" && (
        <ApiFlowPanel steps={flowSteps} activeStep={flowActiveStep} />
      )}

      {/* Result tab content */}
      {activeTab === "response" && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-pg-panel-bg p-4 rounded-b-lg">
          {resultContent}
        </div>
      )}
    </div>
  );
}

export default RequestPreview;
export type { PreviewTab };
