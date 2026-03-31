'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  board: string;
  pin_type: 'quiz_link' | 'fact_card' | 'did_you_know' | 'score_challenge';
  link_url: string | null;
  group_name: string | null;
  group_slug: string | null;
  headline: string;
  subtext: string | null;
  fact_date: string | null;
  score_display: string | null;
  score_percent: string | null;
  image_url: string | null;
  generated_image_url: string | null;
  needs_photo: boolean;
  status: 'draft' | 'ready' | 'posted';
  posted_at: string | null;
  scheduled_date: string | null;
  hashtags: string[];
  category: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-secondary text-txt-secondary',
  ready: 'bg-info-bg text-info-text',
  posted: 'bg-[#EAF3DE] text-[#27500A]',
};

const TYPE_COLORS: Record<string, string> = {
  quiz_link: 'bg-[#EEEDFE] text-[#3C3489]',
  fact_card: 'bg-[#E6F1FB] text-[#0C447C]',
  did_you_know: 'bg-[#FAEEDA] text-[#633806]',
  score_challenge: 'bg-[#FBEAF0] text-[#72243E]',
};

const TYPE_LABELS: Record<string, string> = {
  quiz_link: 'Quiz Link',
  fact_card: 'Fact Card',
  did_you_know: 'Did You Know',
  score_challenge: 'Score Challenge',
};

interface Props {
  pins: PinterestPin[];
}

export function PinterestDashboard({ pins: initialPins }: Props): React.ReactElement {
  const [pins, setPins] = useState<PinterestPin[]>(initialPins);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ id: string; field: string } | null>(null);

  const groups = useMemo(() => {
    const names = [...new Set(pins.map((p) => p.group_name).filter(Boolean) as string[])];
    return names.sort();
  }, [pins]);

  const filtered = useMemo(() => {
    return pins.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.pin_type !== typeFilter) return false;
      if (groupFilter !== 'all' && p.group_name !== groupFilter) return false;
      return true;
    });
  }, [pins, statusFilter, typeFilter, groupFilter]);

  const stats = useMemo(() => {
    const total = pins.length;
    const draft = pins.filter((p) => p.status === 'draft').length;
    const ready = pins.filter((p) => p.status === 'ready').length;
    const posted = pins.filter((p) => p.status === 'posted').length;
    const needsPhoto = pins.filter((p) => p.needs_photo && !p.image_url).length;
    return { total, draft, ready, posted, needsPhoto };
  }, [pins]);

  const copyText = useCallback(async (id: string, field: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied({ id, field });
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const downloadImage = useCallback(async (pin: PinterestPin) => {
    setDownloadingId(pin.id);
    try {
      const res = await fetch(`/api/admin/pinterest/generate-image?id=${pin.id}`);
      if (!res.ok) throw new Error('Failed to generate image');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pin-${pin.id.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download image. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const markPosted = useCallback(async (pin: PinterestPin) => {
    setMarkingId(pin.id);
    try {
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const { pin: updated } = await res.json() as { pin: PinterestPin };
      setPins((prev) => prev.map((p) => (p.id === pin.id ? updated : p)));
    } catch {
      alert('Failed to mark as posted. Please try again.');
    } finally {
      setMarkingId(null);
    }
  }, []);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-txt-primary">Pinterest Pins</h1>
          <p className="text-sm text-txt-secondary mt-0.5">
            Pre-made pins for manual posting to Pinterest
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-txt-primary' },
          { label: 'Draft', value: stats.draft, color: 'text-txt-secondary' },
          { label: 'Ready', value: stats.ready, color: 'text-info-text' },
          { label: 'Posted', value: stats.posted, color: 'text-[#27500A]' },
          { label: 'Needs Photo', value: stats.needsPhoto, color: 'text-[#7A4F00]' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-primary border border-border-light rounded-lg p-3 text-center">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-txt-secondary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Needs photo warning */}
      {stats.needsPhoto > 0 && (
        <div className="mb-4 bg-[#FFF9EB] border border-[#F5E0A0] rounded-lg p-4">
          <p className="text-sm text-[#7A4F00]">
            <span className="font-medium">{stats.needsPhoto} quiz_link pin{stats.needsPhoto !== 1 ? 's' : ''}</span>{' '}
            still need a photo uploaded before they can be generated.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-3 py-1.5 bg-surface-primary text-txt-primary"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="posted">Posted</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-3 py-1.5 bg-surface-primary text-txt-primary"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="text-sm border border-border-light rounded-lg px-3 py-1.5 bg-surface-primary text-txt-primary"
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <span className="text-sm text-txt-secondary self-center ml-auto">
          {filtered.length} of {pins.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-primary border border-border-light rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface-secondary">
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary">Headline</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-32">Group</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-32">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-txt-secondary w-24">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-txt-secondary w-56">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-txt-secondary text-sm">
                  No pins match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((pin) => (
              <tr key={pin.id} className="border-b border-border-light last:border-0 hover:bg-surface-secondary/50 transition-colors">
                {/* Headline + title */}
                <td className="px-4 py-3">
                  <Link href={`/admin/pinterest/${pin.id}`} className="block">
                    <p className="font-medium text-txt-primary line-clamp-1 hover:underline">
                      {pin.headline}
                    </p>
                    <p className="text-xs text-txt-tertiary line-clamp-1 mt-0.5">{pin.title}</p>
                  </Link>
                  {pin.needs_photo && !pin.image_url && (
                    <span className="text-xs text-[#7A4F00] bg-[#FFF9EB] px-1.5 py-0.5 rounded mt-1 inline-block">
                      Needs photo
                    </span>
                  )}
                </td>

                {/* Group */}
                <td className="px-4 py-3">
                  <span className="text-xs text-txt-secondary">{pin.group_name ?? 'General'}</span>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[pin.pin_type] ?? ''}`}>
                    {TYPE_LABELS[pin.pin_type] ?? pin.pin_type}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pin.status] ?? ''}`}>
                    {pin.status.charAt(0).toUpperCase() + pin.status.slice(1)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Copy title */}
                    <button
                      onClick={() => copyText(pin.id, 'title', pin.title)}
                      className="text-xs text-txt-secondary hover:text-txt-primary transition-colors"
                      title="Copy title"
                    >
                      {copied?.id === pin.id && copied.field === 'title' ? 'Copied!' : 'Title'}
                    </button>

                    {/* Download image (only for non-quiz_link or quiz_link with image) */}
                    {(!pin.needs_photo || pin.image_url) && (
                      <button
                        onClick={() => downloadImage(pin)}
                        disabled={downloadingId === pin.id}
                        className="text-xs text-info-text hover:underline disabled:opacity-50"
                        title="Download image"
                      >
                        {downloadingId === pin.id ? '...' : 'PNG'}
                      </button>
                    )}

                    {/* Mark posted */}
                    {pin.status !== 'posted' && (
                      <button
                        onClick={() => markPosted(pin)}
                        disabled={markingId === pin.id}
                        className="text-xs text-[#27500A] hover:underline disabled:opacity-50"
                        title="Mark as posted"
                      >
                        {markingId === pin.id ? '...' : 'Posted'}
                      </button>
                    )}

                    <Link
                      href={`/admin/pinterest/${pin.id}`}
                      className="text-xs text-txt-tertiary hover:text-txt-secondary transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
