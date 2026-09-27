'use client';

import { useEffect, useState } from 'react';

import { DRAFT_CONTINUE_HREF, readLocalDraftRow } from '@/lib/ux-v1/p10/local-draft';

import { DraftRow } from './rows';

import type { DraftRowView } from '@/lib/ux-v1/p10/local-draft';

/** This device's started create draft, read after mount (the server and the first
 *  client render show none, so hydration never depends on localStorage). */
function useLocalDraft(): DraftRowView | null {
  const [view, setView] = useState<DraftRowView | null>(null);
  useEffect(() => {
    const read = (): void => setView(readLocalDraftRow(Date.now()));
    read();
    // a draft started or published in another tab of this device (a cheap local read)
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  return view;
}

/** The draft row, or nothing (presentational: the render test feeds it the same read). */
export function DraftSlot({ view }: { view: DraftRowView | null }): React.ReactElement | null {
  return view ? <DraftRow view={view} href={DRAFT_CONTINUE_HREF} /> : null;
}

/** With no published quiz: the draft as the list's only row, else the empty state. */
export function DraftOrEmpty({ view, children }: { view: DraftRowView | null; children: React.ReactNode }): React.ReactElement {
  return view ? <div className="ux-rows"><DraftSlot view={view} /></div> : <>{children}</>;
}

/** The draft row at the end of the personal Quizzes list (nothing without a draft). */
export function LocalDraftRow(): React.ReactElement | null {
  return <DraftSlot view={useLocalDraft()} />;
}

/** The personal Quizzes list with no published quiz: the draft, else the server's empty state (children). */
export function LocalDraftOrEmpty({ children }: { children: React.ReactNode }): React.ReactElement {
  return <DraftOrEmpty view={useLocalDraft()}>{children}</DraftOrEmpty>;
}
