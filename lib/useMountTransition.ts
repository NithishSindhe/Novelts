import { useEffect, useRef, useState } from "react";

export type TransitionStatus = "entering" | "exiting";

/**
 * Keeps a component mounted long enough for its exit animation to play.
 *
 * @param isOpen  Whether the element should be visible.
 * @param exitDuration  How long (ms) the exit animation runs before unmount.
 * @returns `shouldRender` (mount the element while true) and `status`
 *          ("entering" while open, "exiting" during the exit animation).
 */
export function useMountTransition(isOpen: boolean, exitDuration = 220) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [status, setStatus] = useState<TransitionStatus>(isOpen ? "entering" : "exiting");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isOpen) {
      setShouldRender(true);
      // Ensure the enter state is applied on the next frame after mount.
      const raf = requestAnimationFrame(() => setStatus("entering"));
      return () => cancelAnimationFrame(raf);
    }

    if (shouldRender) {
      setStatus("exiting");
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        timerRef.current = null;
      }, exitDuration);
    }

    return undefined;
  }, [isOpen, exitDuration, shouldRender]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { shouldRender, status };
}
