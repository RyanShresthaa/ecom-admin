'use client';

import React, { useEffect } from 'react';
import { Icon } from '@iconify/react';

export type FlashToastTone = 'ok' | 'err';

type Props = {
  message: string;
  tone?: FlashToastTone;
  onDismiss: () => void;
  durationMs?: number;
};

/** Fixed corner toast — auto-dismisses so success copy does not stay on the form. */
const FlashToast: React.FC<Props> = ({
  message,
  tone = 'ok',
  onDismiss,
  durationMs = 4500,
}) => {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  const ok = tone === 'ok';

  return (
    <div
      role="status"
      className={`fixed top-4 right-4 z-[200] max-w-sm w-[calc(100%-2rem)] p-3.5 rounded-2xl border shadow-lg text-xs leading-relaxed flex items-start gap-2.5 ${
        ok
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      <Icon
        icon={ok ? 'lucide:check-circle' : 'lucide:alert-circle'}
        className={`w-4 h-4 shrink-0 mt-0.5 ${ok ? 'text-emerald-600' : 'text-red-600'}`}
      />
      <span className="flex-1 pt-0.5">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 opacity-60 hover:opacity-100 cursor-pointer"
        aria-label="Dismiss"
      >
        <Icon icon="lucide:x" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default FlashToast;
