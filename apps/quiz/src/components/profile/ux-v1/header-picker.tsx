'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { HeaderPictureSheet } from '@/components/ux-v1/header-picture-sheet';
import { Icon } from '@/components/ux-v1/icon';
import { useUxToast } from '@/components/ux-v1/toast';

import { announceHeader, clearHeader, linkHeader, uploadHeader } from './header-actions';

import type { HeaderResult } from './header-actions';

interface HeaderPickerProps {
  /** Trigger look: the white pill on the band, or the settings ghost button. */
  variant: 'band' | 'settings';
  label?: string;
}

/**
 * "Change header" (17.8): opens A0's HeaderPictureSheet (upload, paste a link, or
 * the theme colour). Every choice is saved at once (the routes store header_url),
 * the band and the settings preview update through HEADER_EVENT, then the server
 * render is refreshed. Errors stay in the sheet (bucket missing = the 503 text).
 */
export function HeaderPicker({ variant, label = 'Change header' }: HeaderPickerProps): React.ReactElement {
  const router = useRouter();
  const toast = useUxToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const run = async (job: () => Promise<HeaderResult>, done: string): Promise<void> => {
    setBusy(true);
    setError(null);
    const r = await job();
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    announceHeader(r.url);
    setOpen(false);
    toast(done);
    router.refresh();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={variant === 'band' ? 'p10-hbtn' : 'ux-btn ux-btn-ghost'}
        onClick={() => { setError(null); setOpen(true); }}
        aria-haspopup="dialog"
      >
        <Icon name="img" />{label}
      </button>
      <HeaderPictureSheet
        open={open}
        onClose={() => { setOpen(false); setError(null); }}
        busy={busy}
        error={error}
        onFile={(f) => run(() => uploadHeader(f), 'Header updated')}
        onLink={(u) => run(() => linkHeader(u), 'Header updated')}
        onThemeColour={() => run(clearHeader, 'Header uses your theme colour')}
      />
    </>
  );
}
