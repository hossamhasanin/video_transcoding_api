import { useEffect, useRef } from 'react';

/**
 * Sets document.title on mount and restores the previous title on unmount.
 * Lightweight — meta tags are handled statically in index.html.
 */
export function useDocumentHead(title: string): void {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    const saved = previousTitle.current;
    document.title = title;
    return () => {
      document.title = saved;
    };
  }, [title]);
}
