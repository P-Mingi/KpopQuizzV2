'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { SeedRow, FlaggedAlbum, FlaggedIdol, ConflictRow } from './page';

interface Counts {
  idolsTotal: number; idolsActive: number; idolsFlagged: number;
  albumsTotal: number; albumsFlagged: number; tracksTotal: number; tracksLinked: number;
  unitsTotal: number; sourcesTotal: number; overridesTotal: number;
  seededGroups: number; checkedGroups: number;
}

interface Props {
  counts: Counts;
  seeds: SeedRow[];
  flaggedAlbums: FlaggedAlbum[];
  flaggedIdols: FlaggedIdol[];
  conflicts: ConflictRow[];
}

async function postAction(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string; stats?: unknown }> {
  const res = await fetch('/api/admin/verse/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.ReactElement {
  return (
    <div className="border border-default rounded-lg p-3">
      <div className="text-2xl font-semibold text-primary tabular-nums">{value}</div>
      <div className="text-xs text-secondary mt-0.5">{label}</div>
      {sub ? <div className="text-[11px] text-secondary/70 mt-0.5">{sub}</div> : null}
    </div>
  );
}

export function VerseAdmin({ counts, seeds, flaggedAlbums, flaggedIdols, conflicts }: Props): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = (label: string, body: Record<string, unknown>) => {
    setBusy(label); setMsg(null);
    postAction(body).then((r) => {
      setBusy(null);
      if (r.error) { setMsg(`Error: ${r.error}`); return; }
      setMsg(`Done: ${label}`);
      startTransition(() => router.refresh());
    });
  };

  const linkPct = counts.tracksTotal ? Math.round((counts.tracksLinked / counts.tracksTotal) * 100) : 0;

  return (
    <div className="pb-16">
      <h1 className="text-xl font-semibold text-primary mb-1">Verse data</h1>
      <p className="text-sm text-secondary mb-4">
        Seeded from open data (Wikidata CC0 + MusicBrainz CC0). Our names, slugs, fandom names and
        rosters are canonical; ingestion fills around them and curator overrides always win. This is
        also the future curator tooling skeleton.
      </p>

      {msg ? <div className="mb-3 text-sm text-accent-hover">{msg}</div> : null}

      {/* Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <Stat label="Seeded groups" value={counts.seededGroups} sub={`${counts.checkedGroups} checked`} />
        <Stat label="Idols (published)" value={counts.idolsActive} sub={`${counts.idolsTotal} total`} />
        <Stat label="Idol review flags" value={counts.idolsFlagged} sub="Wikidata-only" />
        <Stat label="Units" value={counts.unitsTotal} />
        <Stat label="Albums" value={counts.albumsTotal} sub={`${counts.albumsFlagged} flagged`} />
        <Stat label="Tracks" value={counts.tracksTotal} sub={`${counts.tracksLinked} linked (${linkPct}%)`} />
        <Stat label="Source rows" value={counts.sourcesTotal} sub="attribution" />
        <Stat label="Overrides" value={counts.overridesTotal} sub="curator" />
      </div>

      {/* Conflicts */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-primary mb-2">Override / ingestion conflicts ({conflicts.length})</h2>
        {conflicts.length === 0 ? (
          <p className="text-xs text-secondary">None. Curator overrides match the latest ingested values.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-secondary border-b border-default">
                <th className="py-1 pr-3">Entity</th><th className="pr-3">Field</th><th className="pr-3">Ingested</th><th className="pr-3">Override (wins)</th><th className="pr-3">Author</th>
              </tr></thead>
              <tbody>
                {conflicts.map((c, i) => (
                  <tr key={i} className="border-b border-default/50">
                    <td className="py-1 pr-3 text-secondary">{c.entity_type} #{c.entity_id}</td>
                    <td className="pr-3">{c.field}</td>
                    <td className="pr-3 text-secondary line-through">{c.ingested || '(empty)'}</td>
                    <td className="pr-3 text-primary">{c.override || '(empty)'}</td>
                    <td className="pr-3 text-secondary">{c.author.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Flagged albums */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-primary mb-2">Album review queue ({flaggedAlbums.length})</h2>
        {flaggedAlbums.length === 0 ? <p className="text-xs text-secondary">Clear.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-secondary border-b border-default">
                <th className="py-1 pr-3">Group</th><th className="pr-3">Album</th><th className="pr-3">Type</th><th className="pr-3">Region</th><th className="pr-3">Reason</th><th>Action</th>
              </tr></thead>
              <tbody>
                {flaggedAlbums.map((a) => (
                  <tr key={a.id} className="border-b border-default/50">
                    <td className="py-1 pr-3 text-secondary">{a.group}</td>
                    <td className="pr-3 text-primary">{a.title}</td>
                    <td className="pr-3">{a.type}</td>
                    <td className="pr-3">{a.region}</td>
                    <td className="pr-3 text-secondary">{a.review_reason}</td>
                    <td className="whitespace-nowrap">
                      <button disabled={busy !== null} onClick={() => run(`keep album ${a.id}`, { type: 'album_keep', album_id: a.id })} className="text-accent-hover hover:underline cursor-pointer mr-2">keep</button>
                      <button disabled={busy !== null} onClick={() => run(`drop album ${a.id}`, { type: 'album_drop', album_id: a.id })} className="text-secondary hover:text-primary cursor-pointer">drop</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Flagged idols */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-primary mb-2">Idol mismatch queue ({flaggedIdols.length})</h2>
        <p className="text-[11px] text-secondary mb-2">Wikidata lists these members but our name-all roster does not. Not published until activated.</p>
        {flaggedIdols.length === 0 ? <p className="text-xs text-secondary">Clear.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-secondary border-b border-default">
                <th className="py-1 pr-3">Group</th><th className="pr-3">Name</th><th className="pr-3">QID</th><th>Action</th>
              </tr></thead>
              <tbody>
                {flaggedIdols.map((i) => (
                  <tr key={i.id} className="border-b border-default/50">
                    <td className="py-1 pr-3 text-secondary">{i.group}</td>
                    <td className="pr-3 text-primary">{i.name}</td>
                    <td className="pr-3 text-secondary">{i.wikidata_qid}</td>
                    <td className="whitespace-nowrap">
                      <button disabled={busy !== null} onClick={() => run(`activate idol ${i.id}`, { type: 'idol_activate', idol_id: i.id })} className="text-accent-hover hover:underline cursor-pointer mr-2">activate</button>
                      <button disabled={busy !== null} onClick={() => run(`reject idol ${i.id}`, { type: 'idol_reject', idol_id: i.id })} className="text-secondary hover:text-primary cursor-pointer">reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Seed list + per group */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-primary mb-2">Seed list &amp; coverage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-secondary border-b border-default">
              <th className="py-1 pr-3">Group</th><th className="pr-3">QID</th><th className="pr-3">MBID</th><th className="pr-3">Conf</th><th className="pr-3">Checked</th><th className="pr-3">Idols</th><th className="pr-3">Albums</th><th className="pr-3">Flags</th><th>Action</th>
            </tr></thead>
            <tbody>
              {seeds.map((s) => (
                <tr key={s.group_id} className="border-b border-default/50">
                  <td className="py-1 pr-3 text-primary">{s.name}</td>
                  <td className="pr-3 text-secondary">{s.wikidata_qid ?? '-'}</td>
                  <td className="pr-3 text-secondary">{s.musicbrainz_mbid ? s.musicbrainz_mbid.slice(0, 8) : '-'}</td>
                  <td className="pr-3">{s.confidence ?? '-'}</td>
                  <td className="pr-3">{s.checked_at ? 'yes' : 'no'}</td>
                  <td className="pr-3 tabular-nums">{s.idols}</td>
                  <td className="pr-3 tabular-nums">{s.albums}</td>
                  <td className="pr-3 tabular-nums text-secondary">{s.flaggedAlbums + s.flaggedIdols}</td>
                  <td><button disabled={busy !== null} onClick={() => run(`refresh ${s.slug}`, { type: 'refresh_group', group_id: s.group_id })} className="text-accent-hover hover:underline cursor-pointer">re-run</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Override editor */}
      <OverrideEditor busy={busy} onSubmit={run} />

      {(busy || pending) ? <div className="fixed bottom-4 right-4 text-xs text-secondary bg-surface border border-default rounded px-3 py-1">working...</div> : null}
    </div>
  );
}

function OverrideEditor({ busy, onSubmit }: { busy: string | null; onSubmit: (label: string, body: Record<string, unknown>) => void }): React.ReactElement {
  const [entityType, setEntityType] = useState('group');
  const [entityId, setEntityId] = useState('');
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  return (
    <section className="mb-6 border border-default rounded-lg p-3">
      <h2 className="text-sm font-semibold text-primary mb-2">Curator override (wins over ingestion)</h2>
      <div className="flex flex-wrap gap-2 items-end text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-secondary">Entity</span>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="border border-default rounded px-2 py-1 bg-transparent">
            <option value="group">group</option><option value="idol">idol</option><option value="album">album</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-secondary">Entity id</span>
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)} className="border border-default rounded px-2 py-1 bg-transparent w-24" placeholder="123" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-secondary">Field</span>
          <input value={field} onChange={(e) => setField(e.target.value)} className="border border-default rounded px-2 py-1 bg-transparent w-40" placeholder="record_label" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-secondary">Value</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} className="border border-default rounded px-2 py-1 bg-transparent w-48" placeholder="corrected value" />
        </label>
        <button
          disabled={busy !== null || !entityId || !field}
          onClick={() => onSubmit(`override ${entityType} ${entityId} ${field}`, { type: 'override', entity_type: entityType, entity_id: entityId, field, value })}
          className="border border-default rounded px-3 py-1 text-primary hover:text-accent-hover cursor-pointer disabled:opacity-50"
        >Save override</button>
      </div>
    </section>
  );
}
