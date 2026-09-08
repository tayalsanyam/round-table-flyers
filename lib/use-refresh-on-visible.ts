import { useEffect, useRef } from 'react';

/** Refetch when mobile Safari restores a cached tab or the app returns to the foreground. */
export function useRefreshOnVisible(refresh: () => void | Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const run = () => {
      void refreshRef.current();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) run();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
