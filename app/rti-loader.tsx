'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function RtiLoader({
  label = 'Loading…',
  active,
}: {
  label?: string;
  active: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);

  if (!mounted || !active) return null;

  return createPortal(
    <div className="page-loader page-loader-blocking" role="status" aria-live="polite" aria-label={label}>
      <div className="page-loader-widget">
        <div className="page-loader-badge">
          <span className="page-loader-ring" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="page-loader-logo"
            src="/branding/rtilogoblack.png"
            width={88}
            height={88}
            alt="Round Table India"
          />
        </div>
        <p className="page-loader-label">{label}</p>
      </div>
    </div>,
    document.body,
  );
}
