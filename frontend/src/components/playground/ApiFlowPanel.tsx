import React, { useCallback, useRef, useEffect } from "react";
import type { FlowStep } from "../../types/apiFlow";
import { copyToClipboard } from "../../utils/jsonUtils";
import ApiFlowStep from "./ApiFlowStep";

interface ApiFlowPanelProps {
  steps: FlowStep[];
  activeStep: number;
}

function ApiFlowPanel({ steps, activeStep }: ApiFlowPanelProps): React.ReactElement {
  const [copiedAll, setCopiedAll] = React.useState(false);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeStep]);

  const handleCopyAll = useCallback(async () => {
    const allCurls = steps
      .map((s) => `# Step ${s.stepNumber}: ${s.title}\n${s.curlCommand}`)
      .join("\n\n");
    const ok = await copyToClipboard(allCurls);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }, [steps]);

  return (
    <div className="flex flex-col h-full">
      {/* Info banner */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
        <p className="text-[10px] text-blue-600 leading-snug">
          This shows the production API flow. The playground handles some steps internally for convenience.
        </p>
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
        {steps.map((step, idx) => (
          <div key={step.stepNumber} ref={step.status === "active" ? activeRef : undefined}>
            <ApiFlowStep step={step} isLast={idx === steps.length - 1} />
          </div>
        ))}
      </div>

      {/* Copy all button */}
      <div className="px-4 py-2.5 border-t border-border bg-surface-raised">
        <button
          type="button"
          onClick={handleCopyAll}
          className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface-raised hover:bg-accent-soft transition-colors cursor-pointer"
        >
          {copiedAll ? "All cURL Commands Copied!" : "Copy All cURL Commands"}
        </button>
      </div>
    </div>
  );
}

export default ApiFlowPanel;
