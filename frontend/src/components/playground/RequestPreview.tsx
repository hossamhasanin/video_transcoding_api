import React, { useState, useCallback } from "react";
import type { RequestPreviewPayload, TestJobResponse } from "../../types/index";
import { buildCurlCommand } from "../../utils/curlBuilder";

type PreviewTab = "request" | "response";

interface RequestPreviewProps {
  payload: RequestPreviewPayload;
  response: TestJobResponse | null;
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  resultContent: React.ReactNode;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Lightweight JSON syntax highlighter — tokenizes and wraps with Tailwind
// color classes matching the design tokens in index.css.
// ---------------------------------------------------------------------------

function highlightJson(json: string): string {
  // Tokenize JSON into: keys, strings, numbers, booleans, null, punctuation
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*:/g, // JSON keys: "key":
    '<span class="text-json-key">$1</span>:',
  ).replace(
    /:\s*("(?:\\.|[^"\\])*")/g, // String values: "value"
    ': <span class="text-json-string">$1</span>',
  ).replace(
    /:\s*(\d+(?:\.\d+)?)/g, // Number values
    ': <span class="text-json-number">$1</span>',
  ).replace(
    /:\s*(true|false)/g, // Boolean values
    ': <span class="text-json-bool">$1</span>',
  ).replace(
    /:\s*(null)/g, // Null values
    ': <span class="text-json-null">$1</span>',
  ).replace(
    /([{}\[\]])/g, // Brackets / braces
    '<span class="text-json-bracket">$1</span>',
  );
}

function formatJson(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts (HTTP, iframes)
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

function RequestPreview({
  payload,
  response,
  activeTab,
  onTabChange,
  resultContent,
}: RequestPreviewProps): React.ReactElement {
  const json = formatJson(payload);
  const highlighted = highlightJson(json);

  const [copied, setCopied] = useState<"curl" | "json" | null>(null);

  const handleCopy = useCallback(
    async (type: "curl" | "json") => {
      const text =
        type === "curl"
          ? buildCurlCommand(API_BASE, payload)
          : json;
      const ok = await copyToClipboard(text);
      if (ok) {
        setCopied(type);
        setTimeout(() => setCopied((prev) => (prev === type ? null : prev)), 2000);
      }
    },
    [payload, json],
  );

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
          Request
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

      {/* Request tab content */}
      {activeTab === "request" && (
        <>
          {/* Endpoint header */}
          <div className="bg-pg-header-bg border-b border-pg-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="inline-block px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded">
                POST
              </span>
              <span className="text-[#333] break-all">{API_BASE}/jobs</span>
            </div>
            <div className="mt-1.5 text-xs font-mono text-muted">
              X-API-Key: $API_KEY
            </div>
          </div>

          {/* Copy buttons */}
          <div className="flex gap-2 px-4 py-2 border-b border-pg-border bg-pg-panel-bg">
            <button
              type="button"
              onClick={() => handleCopy("curl")}
              className="px-3 py-1.5 text-xs font-medium rounded border border-pg-border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {copied === "curl" ? "Copied!" : "Copy as cURL"}
            </button>
            <button
              type="button"
              onClick={() => handleCopy("json")}
              className="px-3 py-1.5 text-xs font-medium rounded border border-pg-border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {copied === "json" ? "Copied!" : "Copy JSON"}
            </button>
          </div>

          {/* JSON body */}
          <div className="flex-1 overflow-y-auto bg-pg-panel-bg p-4 rounded-b-lg">
            <pre className="text-sm leading-relaxed font-mono m-0 whitespace-pre-wrap">
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          </div>
        </>
      )}

      {/* Result tab content */}
      {activeTab === "response" && (
        <div className="flex-1 overflow-y-auto bg-pg-panel-bg p-4 rounded-b-lg">
          {resultContent}
        </div>
      )}
    </div>
  );
}

export default RequestPreview;
export type { PreviewTab };
