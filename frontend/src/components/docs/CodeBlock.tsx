import React from 'react';
import { highlightJson } from '../../utils/jsonUtils';
import { highlightCurl } from '../../utils/curlHighlight';
import useCopyToClipboard from '../../hooks/useCopyToClipboard';
import type { CodeLanguage } from '../../data/docs/types';

interface CodeBlockProps {
  code: string;
  language: CodeLanguage;
  label?: string;
}

function highlight(code: string, language: CodeLanguage): string {
  if (language === 'json') {
    return highlightJson(code);
  }
  return highlightCurl(code);
}

export default function CodeBlock({ code, language, label }: CodeBlockProps): React.ReactElement {
  const { copyStatus, copyToClipboard } = useCopyToClipboard();

  const highlighted = highlight(code, language);

  return (
    <div className="relative group">
      {label && (
        <div className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wide">
          {label}
        </div>
      )}
      <div className="relative">
        <button
          onClick={() => void copyToClipboard(code)}
          aria-live="polite"
          aria-label={copyStatus === 'copied' ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
        >
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Error' : 'Copy'}
        </button>
        <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
          {/* Content is hand-curated static data from src/data/docs/, tokenized by trusted highlightJson/highlightCurl utilities. Not user-generated. */}
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
