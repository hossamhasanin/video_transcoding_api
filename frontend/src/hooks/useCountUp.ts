import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp(target: number, durationMs: number = 1000): number {
  const [currentValue, setCurrentValue] = useState(target);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(target);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion || startValueRef.current === target) {
      setCurrentValue(target);
      startValueRef.current = target;
      return;
    }

    startTimeRef.current = null;
    startValueRef.current = currentValue;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue =
        startValueRef.current +
        (target - startValueRef.current) * easedProgress;

      setCurrentValue(nextValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(target);
        startValueRef.current = target;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return currentValue;
}
