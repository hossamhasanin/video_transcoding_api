import React from 'react';
import { Lock, Unlock, Gauge } from 'lucide-react';
import type { EndpointEntry } from '../../data/docs/types';
import ParamTable from './ParamTable';
import CodeBlock from './CodeBlock';

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

const authLabels: Record<string, { label: string; color: string }> = {
  'api-key': { label: 'API Key', color: 'bg-orange-100 text-orange-700' },
  'jwt-bearer': { label: 'JWT Bearer', color: 'bg-indigo-100 text-indigo-700' },
  'none': { label: 'No Auth', color: 'bg-gray-100 text-gray-600' },
};

interface EndpointCardProps {
  endpoint: EndpointEntry;
}

export default function EndpointCard({ endpoint }: EndpointCardProps): React.ReactElement {
  const auth = authLabels[endpoint.auth] ?? authLabels['none'];
  const methodColor = methodColors[endpoint.method] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="bg-surface-raised rounded-xl border border-border shadow-card p-6 space-y-4">
      {/* Header: method badge + path + auth */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${methodColor}`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-text-primary">{endpoint.path}</code>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${auth.color}`}>
          {endpoint.auth === 'none' ? <Unlock size={12} /> : <Lock size={12} />}
          {auth.label}
        </span>
        {endpoint.rateLimit && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
            <Gauge size={12} />
            {endpoint.rateLimit}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-text-secondary text-sm">{endpoint.description}</p>

      {/* Parameters */}
      {endpoint.parameters.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">Parameters</h4>
          <ParamTable parameters={endpoint.parameters} />
        </div>
      )}

      {/* Request example */}
      {endpoint.requestExample && (
        <CodeBlock
          code={endpoint.requestExample.code}
          language={endpoint.requestExample.language}
          label={endpoint.requestExample.label}
        />
      )}

      {/* Response example */}
      {endpoint.responseExample && (
        <CodeBlock
          code={endpoint.responseExample.code}
          language={endpoint.responseExample.language}
          label={endpoint.responseExample.label}
        />
      )}
    </div>
  );
}
