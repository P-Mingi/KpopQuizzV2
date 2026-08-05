'use client';

// V-BUILDER-2 step 6 (L-044) - INLINE TEXT via the EXISTING editor SURFACED IN PLACE.
// This is a thin positioner: it mounts the real section-editor (TipTap, the six marks,
// the /api/verse/draft autosave, the /api/verse/lock edit lock, the /api/verse/section
// base-revision 409 conflict guard, and the renderTipTapJSON sanitizer) over the block's
// geometry, same .verse-prose typography, so it reads as typing in the page. NO parallel
// pipeline, NO serializer. On save/close the canvas reloads to reconcile the real render.
import { useEffect, useRef } from 'react';

import { SectionEditor } from '@/components/verse/editor/section-editor';

interface Rect { top: number; left: number; width: number }

// PHONE presentation only (co-design 4): the shared six-marks toolbar (.v-toolbar) rides
// along as-is, but on a narrow sheet it must DOCK (stay reachable while the soft keyboard
// is up, never scroll off) and meet the 44px touch-target floor. Scoped to the inline
// editor so the desktop editor + the normal section editor are untouched.
const PHONE_TOOLBAR_CSS = `
.vb-inline-phone .v-toolbar { position: sticky; top: 0; z-index: 3; background: var(--bg-surface); }
.vb-inline-phone .v-toolbar button { min-height: 44px; min-width: 44px; }
`;

export function InlineTextEditor({ rect, phone, groupId, groupSlug, section, initialContent, baseRevisionId, onClose, onSaved }: {
  rect: Rect; phone: boolean; groupId: number; groupSlug: string; section: string;
  initialContent: unknown | null; baseRevisionId: number | null;
  onClose: () => void; onSaved: (revId: number, content: unknown) => void;
}): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // A11Y: move focus into the editable surface on open, restore it on close (mirrors the
  // library drawer). TipTap needs a tick to mount its contenteditable.
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = dialogRef.current?.querySelector<HTMLElement>('[contenteditable="true"]');
      (el ?? dialogRef.current)?.focus();
    }, 40);
    return () => {
      clearTimeout(t);
      const prev = restoreRef.current;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);
  // A11Y: the shell yields Esc while editing, so the dialog owns it (close = the same
  // discard the Cancel button does; the autosaved draft survives).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };
  const boxStyle: React.CSSProperties = phone
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '82vh', borderRadius: '16px 16px 0 0', borderTop: '2px solid var(--vb-accent)' }
    : { position: 'absolute', top: Math.max(rect.top - 10, 4), left: Math.max(rect.left - 8, 0), width: Math.max(rect.width + 16, 360), maxWidth: 'calc(100% - 8px)', borderRadius: 12, border: '2px solid var(--vb-accent)' };
  return (
    <>
      {phone ? <style dangerouslySetInnerHTML={{ __html: PHONE_TOOLBAR_CSS }} /> : null}
      {/* backdrop: covers the canvas so a stray tap does not select behind the editor */}
      <button type="button" aria-label="Close editor" onClick={onClose}
        style={{ position: 'absolute', inset: 0, zIndex: 67, border: 'none', background: phone ? 'color-mix(in srgb, black 30%, transparent)' : 'transparent', cursor: 'default' }} />
      <div ref={dialogRef} onKeyDown={onKeyDown} tabIndex={-1} className={`verse-scope${phone ? ' vb-inline-phone' : ''}`} role="dialog" aria-modal="true" aria-label="Edit block text"
        style={{ zIndex: 68, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '8px 12px 12px', boxShadow: '0 18px 60px color-mix(in srgb, black 30%, transparent)', ...boxStyle }}>
        <SectionEditor
          entityType="group" entityId={String(groupId)} section={section}
          initialContent={initialContent} baseRevisionId={baseRevisionId} groupSlug={groupSlug}
          onClose={onClose}
          onSaved={(revId, content) => onSaved(revId, content)}
        />
      </div>
    </>
  );
}
