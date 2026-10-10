'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function NavigationLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const firstRender = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  function hideSoon(delay = 700) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), delay);
  }

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    show();
    hideSoon();
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return;
      }

      try {
        const next = new URL(href, window.location.href);
        if (next.origin !== window.location.origin) return;
        if (next.pathname === window.location.pathname && next.search === window.location.search) return;
        show();
      } catch {
        // Ignore malformed hrefs.
      }
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div className="page-loader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="page-loader-widget">
        <div className="page-loader-badge">
          <span className="page-loader-ring" aria-hidden="true" />
          <img
            className="page-loader-logo"
            src="/branding/rtilogoblack.png"
            width={88}
            height={88}
            alt="Round Table India"
          />
        </div>
        <p className="page-loader-label">Loading…</p>
      </div>
    </div>,
    document.body,
  );
}
