import { useEffect, useRef, useCallback } from 'react';

export const useInactivity = (onInactive: () => void, timeoutMs: number = 900000) => { // Default 15 minutes
  const timerRef = useRef<number | null>(null);
  const onInactiveRef = useRef(onInactive);

  // Keep the callback ref current to avoid re-attaching listeners if the callback changes
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        onInactiveRef.current();
      }, timeoutMs);
    };

    // Events that signify user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Attach listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    // Cleanup
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMs]);
};