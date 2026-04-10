import React from 'react';
import type { ParamEntry } from '../../data/docs/types';

interface ParamTableProps {
  parameters: ParamEntry[];
}

export default function ParamTable({ parameters }: ParamTableProps): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium text-text-secondary">Name</th>
            <th className="pb-2 pr-4 font-medium text-text-secondary">Type</th>
            <th className="pb-2 pr-4 font-medium text-text-secondary">In</th>
            <th className="pb-2 pr-4 font-medium text-text-secondary">Required</th>
            <th className="pb-2 pr-4 font-medium text-text-secondary">Default</th>
            <th className="pb-2 font-medium text-text-secondary">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((param, idx) => (
            <tr key={param.name + idx} className="border-b border-border-subtle last:border-0">
              <td className="py-2 pr-4">
                <code className="text-xs font-mono bg-accent-soft text-accent-hover px-1.5 py-0.5 rounded">
                  {param.name}
                </code>
              </td>
              <td className="py-2 pr-4 text-text-secondary font-mono text-xs">{param.type}</td>
              <td className="py-2 pr-4">
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-text-tertiary capitalize">
                  {param.location}
                </span>
              </td>
              <td className="py-2 pr-4">
                {param.required ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-danger-bg text-danger-text font-medium">
                    Required
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-text-tertiary">
                    Optional
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-text-tertiary font-mono text-xs">
                {param.defaultValue ?? '—'}
              </td>
              <td className="py-2 text-text-secondary text-xs">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
