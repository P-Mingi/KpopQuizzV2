'use client';

import { useEffect, useState } from 'react';

// V4 parity law - the play affordance's curator control. Direct editors set
// (or clear) the track's official YouTube video; it rides the existing typed
// override system (entity_overrides, field youtube_url), so provenance,
// gating and refresh-protection come with it.
export function CuratedVideoControl({ songId, groupSlug, current }: {
  songId: string; groupSlug: string; current: string | null;
}): React.ReactElement | null {
  const [canEdit, setCanEdit] = useState(false);
  const [value, setValue] = useState(current);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/verse/can-edit?group=${encodeURIComponent(groupSlug)}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => setCanEdit(!!d?.canEdit)).catch(() => {});
  }, [groupSlug]);

  if (!canEdit) return null;

  async function save(): Promise<void> {
    const url = window.prompt('Official YouTube URL for this track (empty clears the pick):', value ?? '');
    if (url === null) return;
    if (url.trim() !== '' && !/(youtube\.com|youtu\.be)\//i.test(url)) { setMsg('That is not a YouTube link.'); return; }
    const res = await fetch('/api/verse/override', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: 'song', entity_id: songId, field: 'youtube_url', value: url.trim(), source_url: url.trim() || undefined, source_note: 'Official video pick (curator)' }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? 'Could not save.'); return; }
    setValue(url.trim() || null);
    setMsg(url.trim() ? 'Official video set.' : 'Pick cleared; the clip default applies.');
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void save()} className="v-tap text-[11.5px] font-semibold text-tertiary underline decoration-dotted underline-offset-2 hover:text-secondary">
        {value ? 'Change the official video' : 'Set the official video'}
      </button>
      {msg ? <span role="status" className="text-[11px] text-tertiary">{msg}</span> : null}
    </span>
  );
}
