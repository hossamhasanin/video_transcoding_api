import { useState, useCallback, useRef, useEffect } from 'react';

type CopyStatus = 'idle' | 'copied' | 'error';

interface UseCopyToClipboardReturn {
  copyStatus: CopyStatus;
  copyToClipboard: (text: string) => Promise<void>;
}

export default function useCopyToClipboard(resetDelay = 2000): UseCopyToClipboardReturn {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyStatus('copied');
      } catch {
        setCopyStatus('error');
      }
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyStatus('idle'), resetDelay);
  }, [resetDelay]);

  return { copyStatus, copyToClipboard };
}
