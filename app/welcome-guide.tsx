'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, Layers, Tags, Type, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'a18-flyer-welcome-v1';

const STEPS = [
  { icon: Upload, title: 'Upload your flyer', text: 'Drop in the design from your AI app — no logos needed yet.' },
  { icon: Layers, title: 'Choose logos', text: 'Pick crests, resize them, or add an optional black logo band.' },
  { icon: Tags, title: 'Add tags', text: 'Tap activity tags, then drag them into place on the preview.' },
  { icon: Type, title: 'Add text', text: 'Add titles or details and drag handles to align everything.' },
  { icon: Download, title: 'Download or share', text: 'Export a JPEG or send it straight to WhatsApp.' },
] as const;

export default function WelcomeGuide({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setOpen(true);
  }, [signedIn]);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore storage failures.
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="welcome-dialog sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="welcome-dialog-header">
          <div className="welcome-dialog-brand">
            <Image src="/branding/rtilogowhite.png" alt="Round Table India" width={56} height={56} className="welcome-dialog-logo" />
            <div>
              <p className="eyebrow">WELCOME</p>
              <DialogTitle className="welcome-dialog-title">How Flyer Finisher works</DialogTitle>
            </div>
          </div>
          <DialogDescription className="welcome-dialog-lead">
            Five quick steps to brand your flyer correctly — without rebuilding the artwork.
          </DialogDescription>
        </DialogHeader>

        <ol className="welcome-steps">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="welcome-step">
                <span className="welcome-step-num">{index + 1}</span>
                <span className="welcome-step-icon" aria-hidden="true"><Icon size={18} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <DialogFooter className="welcome-dialog-footer">
          <button type="button" className="primary" onClick={dismiss}>
            Got it — let&apos;s go
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
