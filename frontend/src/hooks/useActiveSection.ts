import { useState, useEffect, useRef, useCallback } from 'react';

interface UseActiveSectionOptions {
  sectionIds: string[];
  rootMargin?: string;
}

/**
 * Tracks which documentation section is currently in the viewport using
 * a single IntersectionObserver. Provides smooth-scroll navigation with
 * scroll-lock to prevent observer flicker during programmatic scrolling.
 */
export function useActiveSection({
  sectionIds,
  rootMargin = '-80px 0px -60% 0px',
}: UseActiveSectionOptions): {
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
} {
  const [activeSection, setActiveSection] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    return hash && sectionIds.includes(hash) ? hash : sectionIds[0] ?? '';
  });

  const scrollTargetRef = useRef<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const visibleEntries = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleEntries.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleEntries.delete(entry.target.id);
          }
        }

        // Don't update if we're scrolling to a target
        if (scrollTargetRef.current) return;

        // Pick the first visible section in DOM order
        if (visibleEntries.size > 0) {
          const ordered = sectionIds.filter((id) => visibleEntries.has(id));
          if (ordered.length > 0) {
            const next = ordered[0];
            setActiveSection(next);
            history.replaceState(null, '', `#${next}`);
          }
        }
      },
      { rootMargin },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [sectionIds, rootMargin]);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const el = document.getElementById(sectionId);
      if (!el) return;

      // Lock active section during scroll
      scrollTargetRef.current = sectionId;
      setActiveSection(sectionId);
      history.replaceState(null, '', `#${sectionId}`);

      el.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Unlock after scroll completes
      const timeout = setTimeout(() => {
        scrollTargetRef.current = null;
      }, 1000);

      return () => clearTimeout(timeout);
    },
    [],
  );

  return { activeSection, scrollToSection };
}
