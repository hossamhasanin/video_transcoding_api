import React, { useState, useCallback } from "react";
import type { FlowStep } from "../../types/apiFlow";
import { highlightJson, formatJson, copyToClipboard } from "../../utils/jsonUtils";

interface ApiFlowStepProps {
  step: FlowStep;
  isLast: boolean;
}

const METHOD_COLORS: Record<string, string> = {
  POST: "bg-green-600",
  PUT: "bg-blue-600",
  GET: "bg-amber-600",
};

const STATUS_BADGE: Record<FlowStep["status"], { ring: string; icon: string }> = {
  pending: { ring: "border-border bg-surface-raised", icon: "text-text-tertiary" },
  active: { ring: "border-blue-500 bg-blue-50", icon: "text-blue-500" },
  completed: { ring: "border-green-500 bg-green-50", icon: "text-green-500" },
  error: { ring: "border-red-500 bg-red-50", icon: "text-red-500" },
};

function ApiFlowStep({ step, isLast }: ApiFlowStepProps): React.ReactElement {
  const [expanded, setExpanded] = useState(step.status === "active");
  const [copied, setCopied] = useState(false);

  const badge = STATUS_BADGE[step.status];

  const handleCopyCurl = useCallback(async () => {
    const ok = await copyToClipboard(step.curlCommand);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [step.curlCommand]);

  // Auto-expand active steps
  React.useEffect(() => {
    if (step.status === "active") setExpanded(true);
  }, [step.status]);

  const hasJson = step.requestBody !== null || step.responseBody !== null;

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div
          className={`absolute left-[15px] top-[36px] bottom-0 w-0.5 ${
            step.status === "completed" ? "bg-green-300" : "bg-border"
          }`}
        />
      )}

      <div className="flex gap-3 pb-4">
        {/* Step number / status indicator */}
        <div
          className={`relative z-10 flex-shrink-0 w-[32px] h-[32px] rounded-full border-2 flex items-center justify-center text-xs font-bold ${badge.ring}`}
        >
          {step.status === "completed" ? (
            <svg className={`w-4 h-4 ${badge.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : step.status === "active" ? (
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          ) : (
            <span className="text-text-tertiary">{step.stepNumber}</span>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          {/* Header row — always visible */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">{step.title}</span>
              <svg
                className={`w-4 h-4 text-text-tertiary transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{step.description}</p>
          </button>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-2 space-y-2">
              {/* Method + endpoint */}
              <div className="bg-surface rounded-md px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-white text-[10px] font-bold rounded ${METHOD_COLORS[step.method]}`}
                  >
                    {step.method}
                  </span>
                  <span className="text-text-primary text-xs break-all">{step.endpoint}</span>
                </div>
                {step.authHeader && (
                  <div className="mt-1 text-[10px] font-mono text-text-secondary">{step.authHeader}</div>
                )}
              </div>

              {/* Note */}
              {step.note && (
                <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  {step.note}
                </div>
              )}

              {/* Request body */}
              {step.requestBody !== null && (
                <div>
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Request</div>
                  <div className="bg-surface border border-border rounded-md p-2 overflow-x-auto">
                    <pre className="text-[11px] leading-relaxed font-mono m-0 whitespace-pre-wrap break-all">
                      <code dangerouslySetInnerHTML={{ __html: highlightJson(formatJson(step.requestBody)) }} />
                    </pre>
                  </div>
                </div>
              )}

              {/* Response body */}
              {step.responseBody !== null && (
                <div>
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">Response</div>
                  <div className="bg-surface border border-border rounded-md p-2 overflow-x-auto">
                    <pre className="text-[11px] leading-relaxed font-mono m-0 whitespace-pre-wrap break-all">
                      <code dangerouslySetInnerHTML={{ __html: highlightJson(formatJson(step.responseBody)) }} />
                    </pre>
                  </div>
                </div>
              )}

              {/* Copy cURL */}
              <button
                type="button"
                onClick={handleCopyCurl}
                className="px-2.5 py-1 text-[10px] font-medium rounded-lg border border-border bg-surface-raised hover:bg-accent-soft transition-colors cursor-pointer"
              >
                {copied ? "Copied!" : "Copy cURL"}
              </button>

              {hasJson && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="ml-2 px-2.5 py-1 text-[10px] font-medium rounded-lg border border-border bg-surface-raised hover:bg-accent-soft transition-colors cursor-pointer"
                >
                  Collapse
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiFlowStep;
