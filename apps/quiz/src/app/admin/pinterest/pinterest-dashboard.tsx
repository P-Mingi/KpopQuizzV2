'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';

export interface PinterestPin {
  id: string;
  title: string;
  description: string;
  board: string;
  pin_type: string;
  link_url: string | null;
  group_name: string | null;
  group_slug: string | null;
  headline: string;
  subtext: string | null;
  fact_date: string | null;
  score_display: string | null;
  score_percent: string | null;
  image_url: string | null;
  image_public_url: string | null;
  image_storage_path: string | null;
  generated_image_url: string | null;
  needs_photo: boolean;
  status: string;
  posted_at: string | null;
  scheduled_date: string | null;
  scheduled_for: string | null;
  pinterest_pin_id: string | null;
  hashtags: string[];
  category: string | null;
  sort_order: number;
  impressions: number;
  saves: number;
  clicks: number;
  created_at: string;
  updated_at: string;
}

interface AuthStatus {
  connected: boolean;
  expiresAt?: string;
  scope?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface text-secondary',
  ready: 'bg-type-classic-bg text-type-classic-text',
  approved: 'bg-[#EEEDFE] text-[#3C3489]',
  scheduled: 'bg-[#FAEEDA] text-[#633806]',
  posted: 'bg-[#EAF3DE] text-[#27500A]',
  failed: 'bg-[#FBEAF0] text-[#72243E]',
};

const TYPE_LABELS: Record<string, string> = {
  quiz_link: 'Quiz Link',
  fact_card: 'Fact Card',
  did_you_know: 'Did You Know',
  score_challenge: 'Score Challenge',
  aesthetic: 'Aesthetic',
  meme: 'Meme',
  quote: 'Quote',
  wallpaper: 'Wallpaper',
  fan_edit: 'Fan Edit',
  concept_photo: 'Concept Photo',
};

const BOARD_OPTIONS = [
  'K-pop Quizzes & Trivia',
  'BTS',
  'BLACKPINK',
  'Stray Kids',
  'TWICE',
  'K-pop Facts & Did You Know',
  '4th Gen K-pop',
  'K-pop Wallpapers',
  'K-pop Memes & Fun',
];

interface Props {
  pins: PinterestPin[];
  boards: Array<{ board_name: string; pinterest_board_id: string }>;
  authStatus: AuthStatus | null;
}

export function PinterestDashboard({ pins: initialPins, boards, authStatus }: Props): React.ReactElement {
  const [pins, setPins] = useState<PinterestPin[]>(initialPins);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [copiedUrls, setCopiedUrls] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');

  // Batch actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPosting, setBatchPosting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Inline actions
  const [actionId, setActionId] = useState<string | null>(null);

  const boardNames = boards.length > 0
    ? boards.map((b) => b.board_name)
    : BOARD_OPTIONS;

  const groups = useMemo(() => {
    const names = [...new Set(pins.map((p) => p.group_name).filter(Boolean) as string[])];
    return names.sort();
  }, [pins]);

  const filtered = useMemo(() => {
    return pins.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.pin_type !== typeFilter) return false;
      if (groupFilter !== 'all' && p.group_name !== groupFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.headline.toLowerCase().includes(q) ||
          (p.group_name ?? '').toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [pins, statusFilter, typeFilter, groupFilter, search]);

  const stats = useMemo(() => {
    const total = pins.length;
    const draft = pins.filter((p) => p.status === 'draft').length;
    const ready = pins.filter((p) => p.status === 'ready').length;
    const approved = pins.filter((p) => p.status === 'approved').length;
    const scheduled = pins.filter((p) => p.status === 'scheduled').length;
    const posted = pins.filter((p) => p.status === 'posted').length;
    const failed = pins.filter((p) => p.status === 'failed').length;
    return { total, draft, ready, approved, scheduled, posted, failed };
  }, [pins]);

  // Pins that have an image but are still in draft status (need metadata)
  const pinsNeedingMetadata = useMemo(() => {
    return pins.filter(
      (p) => p.image_public_url && p.status === 'draft' && (!p.description || p.title === 'Untitled'),
    );
  }, [pins]);

  // ---- Connection ----

  const syncBoards = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/pinterest/sync-boards', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Synced ${data.synced} boards. Reload to see updated board list.`);
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch {
      alert('Failed to sync boards.');
    } finally {
      setSyncing(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!confirm('Disconnect Pinterest account? You can reconnect later.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/admin/pinterest/disconnect', { method: 'POST' });
      window.location.reload();
    } catch {
      alert('Failed to disconnect.');
      setDisconnecting(false);
    }
  }, []);

  // ---- Upload (images only, no AI) ----

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type),
    );
    setUploadFiles((prev) => [...prev, ...files].slice(0, 20));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploadFiles((prev) => [...prev, ...files].slice(0, 20));
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadImages = useCallback(async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);

    const newPins: PinterestPin[] = [];
    const newUrls: string[] = [];

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]!;
      setUploadProgress(`Uploading ${i + 1}/${uploadFiles.length}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/admin/pinterest/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error(`Upload failed for ${file.name}`);
          continue;
        }

        const { storage_path, public_url, filename } = await uploadRes.json();
        newUrls.push(public_url as string);

        // Create a draft pin entry (no metadata yet)
        const createRes = await fetch('/api/admin/pinterest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (filename as string).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            description: '',
            board: boardNames[0] ?? 'K-pop Quizzes',
            pin_type: 'aesthetic',
            link_url: null,
            group_name: null,
            headline: (filename as string).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').slice(0, 80),
            subtext: null,
            image_url: public_url,
            image_storage_path: storage_path,
            image_public_url: public_url,
            needs_photo: false,
            status: 'draft',
            hashtags: [],
            category: 'aesthetic',
            sort_order: pins.length + i + 1,
          }),
        });

        if (createRes.ok) {
          const { pin } = await createRes.json();
          newPins.push(pin as PinterestPin);
        }
      } catch (err) {
        console.error(`Error uploading ${file.name}:`, err);
      }
    }

    setPins((prev) => [...prev, ...newPins]);
    setUploadedUrls((prev) => [...prev, ...newUrls]);
    setUploadFiles([]);
    setUploadProgress('');
    setUploading(false);
  }, [uploadFiles, boardNames, pins.length]);

  // ---- Copy image URLs for Claude ----

  const copyImageUrls = useCallback(async () => {
    // Collect all draft pins with images that need metadata
    const urls = pinsNeedingMetadata.map((p) => p.image_public_url).filter(Boolean) as string[];

    // Also include just-uploaded URLs that might not be in pinsNeedingMetadata yet
    const allUrls = [...new Set([...urls, ...uploadedUrls])];

    if (allUrls.length === 0) {
      alert('No images need metadata. Upload images first.');
      return;
    }

    const boardList = boardNames.join(', ');

    const text = `Images to generate Pinterest metadata for:

${allUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')}

For each image, generate a JSON array with objects containing:
- image_url (match the URL above exactly)
- title (max 100 chars, engaging, includes group name if identifiable)
- description (2-3 sentences, natural, with hashtags appended at the end)
- board_name (one of: ${boardList})
- pin_type (aesthetic, meme, quote, wallpaper, fan_edit, concept_photo, quiz_link, fact_card)
- group_name (K-pop group name, or null if not identifiable)
- link_url (https://kpopquiz.org for quiz content, empty string for engagement content like memes/aesthetics)
- hashtags (array of 8-12 tags without # symbol, always include "kpop")

Rules:
- For memes, make the title funny and relatable, set link_url to ""
- For aesthetics/wallpapers, make the title dreamy, set link_url to ""
- For quiz-related content, set link_url to "https://kpopquiz.org"
- Description should include hashtags appended at the end (e.g. "Description text. #kpop #bts #army")
- Never use em dash characters
- Return ONLY the JSON array, no other text`;

    await navigator.clipboard.writeText(text);
    setCopiedUrls(true);
    setTimeout(() => setCopiedUrls(false), 2000);
  }, [pinsNeedingMetadata, uploadedUrls, boardNames]);

  // ---- Import metadata ----

  const importMetadata = useCallback(async () => {
    let parsed: unknown[];
    try {
      // Handle JSON that might be wrapped in markdown code blocks
      const cleaned = importJson.replace(/```json\s*|```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
    } catch {
      setImportResult('Invalid JSON. Make sure you paste a valid JSON array.');
      return;
    }

    setImporting(true);
    setImportResult('');

    try {
      const res = await fetch('/api/admin/pinterest/import-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: parsed }),
      });

      const data = await res.json();

      if (res.ok) {
        const parts: string[] = [];
        if (data.matched > 0) parts.push(`${data.matched} updated`);
        if (data.created > 0) parts.push(`${data.created} created`);
        if (data.failed > 0) parts.push(`${data.failed} failed`);
        setImportResult(parts.join(', ') || 'No changes');

        if (data.errors?.length > 0) {
          setImportResult((prev) => `${prev}\n\nErrors:\n${data.errors.join('\n')}`);
        }

        // Refresh pins
        if (data.matched > 0 || data.created > 0) {
          const pinsRes = await fetch('/api/admin/pinterest');
          if (pinsRes.ok) {
            const { pins: refreshed } = await pinsRes.json();
            setPins(refreshed as PinterestPin[]);
          }
          setUploadedUrls([]);
        }
      } else {
        setImportResult(`Error: ${data.error}`);
      }
    } catch {
      setImportResult('Failed to import metadata.');
    } finally {
      setImporting(false);
    }
  }, [importJson]);

  // ---- Single pin actions ----

  const updatePinStatus = useCallback(async (pinId: string, status: string) => {
    setActionId(pinId);
    try {
      const res = await fetch(`/api/admin/pinterest/${pinId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const { pin: updated } = await res.json();
        setPins((prev) => prev.map((p) => (p.id === pinId ? (updated as PinterestPin) : p)));
      }
    } catch {
      alert('Failed to update pin status.');
    } finally {
      setActionId(null);
    }
  }, []);

  const postSinglePin = useCallback(async (pinId: string) => {
    setActionId(pinId);
    try {
      const res = await fetch('/api/admin/pinterest/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pinId }),
      });
      const data = await res.json();
      if (data.success) {
        setPins((prev) =>
          prev.map((p) =>
            p.id === pinId
              ? { ...p, status: 'posted', posted_at: new Date().toISOString(), pinterest_pin_id: data.pinterest_pin_id }
              : p,
          ),
        );
      } else {
        alert(`Post failed: ${data.error}`);
        setPins((prev) =>
          prev.map((p) => (p.id === pinId ? { ...p, status: 'failed' } : p)),
        );
      }
    } catch {
      alert('Failed to post pin.');
    } finally {
      setActionId(null);
    }
  }, []);

  const deleteSinglePin = useCallback(async (pinId: string) => {
    if (!confirm('Delete this pin?')) return;
    try {
      const res = await fetch(`/api/admin/pinterest/${pinId}`, { method: 'DELETE' });
      if (res.ok) {
        setPins((prev) => prev.filter((p) => p.id !== pinId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(pinId);
          return next;
        });
      }
    } catch {
      alert('Failed to delete.');
    }
  }, []);

  // ---- Batch actions ----

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    const allIds = new Set(filtered.map((p) => p.id));
    setSelectedIds((prev) => {
      const allSelected = filtered.every((p) => prev.has(p.id));
      if (allSelected) return new Set();
      return allIds;
    });
  }, [filtered]);

  const batchApprove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updatePinStatus(id, 'approved');
    }
    setSelectedIds(new Set());
  }, [selectedIds, updatePinStatus]);

  const batchPost = useCallback(async () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const pin = pins.find((p) => p.id === id);
      return pin && (pin.status === 'approved' || pin.status === 'ready');
    });

    if (ids.length === 0) {
      alert('No approved pins selected.');
      return;
    }

    setBatchPosting(true);
    setBatchProgress(`Posting 0/${ids.length}...`);

    try {
      const res = await fetch('/api/admin/pinterest/post-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_ids: ids }),
      });
      const data = await res.json();

      for (const result of data.results ?? []) {
        setPins((prev) =>
          prev.map((p) => {
            if (p.id === result.pin_id) {
              return {
                ...p,
                status: result.success ? 'posted' : 'failed',
                posted_at: result.success ? new Date().toISOString() : p.posted_at,
                pinterest_pin_id: result.pinterest_pin_id ?? p.pinterest_pin_id,
              };
            }
            return p;
          }),
        );
      }

      setBatchProgress(`Done: ${data.succeeded}/${data.total} posted`);
      setTimeout(() => setBatchProgress(''), 3000);
      setSelectedIds(new Set());
    } catch {
      alert('Batch post failed.');
      setBatchProgress('');
    } finally {
      setBatchPosting(false);
    }
  }, [selectedIds, pins]);

  const batchSchedule = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const slots = [8, 12, 15, 18, 21];
    const now = new Date();

    for (let i = 0; i < ids.length; i++) {
      const slotIndex = i % slots.length;
      const dayOffset = Math.floor(i / slots.length);
      const schedTime = new Date(now);
      schedTime.setDate(schedTime.getDate() + dayOffset);
      schedTime.setHours(slots[slotIndex]!, Math.floor(Math.random() * 30), 0, 0);

      if (schedTime <= now) {
        schedTime.setDate(schedTime.getDate() + 1);
      }

      try {
        const res = await fetch(`/api/admin/pinterest/${ids[i]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'scheduled',
            scheduled_for: schedTime.toISOString(),
          }),
        });
        if (res.ok) {
          const { pin: updated } = await res.json();
          setPins((prev) => prev.map((p) => (p.id === ids[i] ? (updated as PinterestPin) : p)));
        }
      } catch {
        console.error(`Failed to schedule pin ${ids[i]}`);
      }
    }

    setSelectedIds(new Set());
  }, [selectedIds]);

  // ---- Helpers ----

  const downloadImage = useCallback(async (pin: PinterestPin) => {
    setActionId(pin.id);
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
      alert('Failed to download image.');
    } finally {
      setActionId(null);
    }
  }, []);

  const approvedCount = filtered.filter((p) => p.status === 'approved' || p.status === 'ready').length;
  const selectedCount = selectedIds.size;
  const needsMetadataCount = pinsNeedingMetadata.length + uploadedUrls.length;

  return (
    <div className="py-6">
      {/* Header + Connection Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-primary">Pinterest Pins</h1>
          <p className="text-sm text-secondary mt-0.5">
            Upload, review, and post pins to Pinterest
          </p>
        </div>
        <div className="flex items-center gap-3">
          {authStatus?.connected ? (
            <>
              <span className="text-xs text-[#27500A] bg-[#EAF3DE] px-2 py-1 rounded-full font-medium">
                Connected
              </span>
              {authStatus.expiresAt && (
                <span className="text-xs text-tertiary">
                  Expires {new Date(authStatus.expiresAt).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={syncBoards}
                disabled={syncing}
                className="text-xs px-3 py-1.5 bg-surface text-primary rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : `Sync boards (${boards.length})`}
              </button>
              <button
                onClick={disconnect}
                disabled={disconnecting}
                className="text-xs px-3 py-1.5 text-[#72243E] hover:bg-[#FBEAF0] rounded-lg transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
            </>
          ) : (
            <a
              href="/api/admin/pinterest/auth"
              className="text-sm px-4 py-2 bg-[#E60023] text-white font-medium rounded-lg hover:bg-[#C2001D] transition-colors"
            >
              Connect Pinterest
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary' },
          { label: 'Draft', value: stats.draft, color: 'text-secondary' },
          { label: 'Ready', value: stats.ready, color: 'text-type-classic-text' },
          { label: 'Approved', value: stats.approved, color: 'text-[#3C3489]' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-[#633806]' },
          { label: 'Posted', value: stats.posted, color: 'text-[#27500A]' },
          { label: 'Failed', value: stats.failed, color: 'text-[#72243E]' },
        ].map((s) => (
          <div key={s.label} className="bg-primary border border-default rounded-lg p-3 text-center">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-secondary mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div className="bg-primary border border-default rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-primary mb-3">Upload New Pins</h2>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-default rounded-lg p-8 text-center cursor-pointer hover:border-[#7c3aed] hover:bg-surface/50 transition-colors"
        >
          <p className="text-sm text-secondary">
            Drag and drop images here, or click to browse
          </p>
          <p className="text-xs text-tertiary mt-1">
            Supports JPG, PNG, WebP - Max 20 images at once
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* File preview */}
        {uploadFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-secondary">{uploadFiles.length} file(s) selected</span>
              <button
                onClick={() => setUploadFiles([])}
                className="text-xs text-[#72243E] hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {uploadFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-16 h-16 object-cover rounded-lg border border-default"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-[#72243E] text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    x
                  </button>
                  <p className="text-[10px] text-tertiary mt-0.5 max-w-16 truncate">{file.name}</p>
                </div>
              ))}
            </div>
            <button
              onClick={uploadImages}
              disabled={uploading}
              className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
            >
              {uploading ? uploadProgress : `Upload images (${uploadFiles.length})`}
            </button>
          </div>
        )}

        {/* Metadata actions (shown after uploads or when pins need metadata) */}
        {(needsMetadataCount > 0 || uploadedUrls.length > 0) && (
          <div className="mt-4 pt-4 border-t border-default">
            <p className="text-sm text-secondary mb-3">
              {needsMetadataCount > 0
                ? `${needsMetadataCount} image(s) need metadata`
                : 'Images uploaded'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={copyImageUrls}
                className="px-4 py-2 bg-surface text-primary text-sm font-medium rounded-lg hover:bg-elevated transition-colors"
              >
                {copiedUrls ? 'Copied!' : 'Copy image URLs'}
              </button>
              <button
                onClick={() => { setShowImportModal(true); setImportResult(''); }}
                className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
              >
                Import metadata
              </button>
            </div>
            <p className="text-xs text-tertiary mt-2">
              Copy URLs to paste into Claude, then import the generated JSON back here
            </p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-primary rounded-xl border border-default shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-default">
              <h2 className="text-base font-semibold text-primary">Import metadata from Claude</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-tertiary hover:text-primary text-lg"
              >
                x
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <p className="text-sm text-secondary mb-3">
                Paste the JSON array generated by Claude:
              </p>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                rows={14}
                className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary resize-none font-mono"
                placeholder={`[\n  {\n    "image_url": "https://...",\n    "title": "Pin title",\n    "description": "Description with #hashtags",\n    "board_name": "BTS",\n    "pin_type": "aesthetic",\n    "group_name": "BTS",\n    "link_url": "",\n    "hashtags": ["bts", "kpop", "army"]\n  }\n]`}
              />
              {importResult && (
                <pre className="mt-3 text-sm p-3 bg-surface rounded-lg whitespace-pre-wrap">
                  {importResult}
                </pre>
              )}
            </div>
            <div className="p-4 border-t border-default flex items-center justify-between">
              <span className="text-xs text-tertiary">
                {importJson.trim() ? 'Ready to import' : 'Paste JSON to begin'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importMetadata}
                  disabled={importing || !importJson.trim()}
                  className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import & match to uploaded images'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters + Batch Actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-default rounded-lg px-3 py-1.5 bg-primary text-primary"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="posted">Posted</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-default rounded-lg px-3 py-1.5 bg-primary text-primary"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="text-sm border border-default rounded-lg px-3 py-1.5 bg-primary text-primary"
        >
          <option value="all">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="text-sm border border-default rounded-lg px-3 py-1.5 bg-primary text-primary w-48"
        />

        <span className="text-sm text-secondary ml-auto">
          {filtered.length} of {pins.length}
        </span>
      </div>

      {/* Batch action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[#EEEDFE] rounded-lg">
          <span className="text-sm font-medium text-[#3C3489]">{selectedCount} selected</span>
          <button
            onClick={batchApprove}
            className="text-xs px-3 py-1.5 bg-[#3C3489] text-white rounded-lg hover:bg-[#2D2770] transition-colors"
          >
            Approve
          </button>
          {authStatus?.connected && (
            <>
              <button
                onClick={batchPost}
                disabled={batchPosting}
                className="text-xs px-3 py-1.5 bg-[#E60023] text-white rounded-lg hover:bg-[#C2001D] transition-colors disabled:opacity-50"
              >
                {batchPosting ? batchProgress : 'Post to Pinterest'}
              </button>
              <button
                onClick={batchSchedule}
                className="text-xs px-3 py-1.5 bg-[#633806] text-white rounded-lg hover:bg-[#4A2A04] transition-colors"
              >
                Schedule
              </button>
            </>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-secondary hover:text-primary ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Quick actions row */}
      {approvedCount > 0 && authStatus?.connected && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-[#EAF3DE] border border-[#D8EDCB] rounded-lg">
          <span className="text-sm text-[#27500A]">{approvedCount} approved pin(s) ready to post</span>
          <button
            onClick={() => {
              const approvedIds = filtered
                .filter((p) => p.status === 'approved' || p.status === 'ready')
                .map((p) => p.id);
              setSelectedIds(new Set(approvedIds));
            }}
            className="text-xs px-3 py-1.5 bg-[#27500A] text-white rounded-lg hover:bg-[#1C3A07] transition-colors"
          >
            Select all approved
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-primary border border-default rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default bg-surface">
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                  onChange={selectAllFiltered}
                  className="rounded"
                />
              </th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary w-16">Img</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary">Title</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary w-28">Group</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary w-28">Type</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary w-24">Board</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-secondary w-24">Status</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-secondary w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-secondary text-sm">
                  No pins match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((pin) => (
              <tr
                key={pin.id}
                className={`border-b border-default last:border-0 hover:bg-surface/50 transition-colors ${
                  selectedIds.has(pin.id) ? 'bg-[#EEEDFE]/30' : ''
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(pin.id)}
                    onChange={() => toggleSelect(pin.id)}
                    className="rounded"
                  />
                </td>

                {/* Thumbnail */}
                <td className="px-3 py-2">
                  {(pin.image_public_url || pin.image_url) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={(pin.image_public_url || pin.image_url)!}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-elevated rounded flex items-center justify-center text-xs text-tertiary">
                      --
                    </div>
                  )}
                </td>

                {/* Title + headline */}
                <td className="px-3 py-2">
                  <Link href={`/admin/pinterest/${pin.id}`} className="block">
                    <p className="font-medium text-primary line-clamp-1 hover:underline">
                      {pin.headline}
                    </p>
                    <p className="text-xs text-tertiary line-clamp-1 mt-0.5">{pin.title}</p>
                  </Link>
                </td>

                {/* Group */}
                <td className="px-3 py-2">
                  <span className="text-xs text-secondary">{pin.group_name ?? 'General'}</span>
                </td>

                {/* Type */}
                <td className="px-3 py-2">
                  <span className="text-xs font-medium text-secondary">
                    {TYPE_LABELS[pin.pin_type] ?? pin.pin_type}
                  </span>
                </td>

                {/* Board */}
                <td className="px-3 py-2">
                  <span className="text-xs text-tertiary truncate block max-w-24">{pin.board}</span>
                </td>

                {/* Status */}
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pin.status] ?? ''}`}>
                    {pin.status.charAt(0).toUpperCase() + pin.status.slice(1)}
                  </span>
                  {pin.scheduled_for && pin.status === 'scheduled' && (
                    <p className="text-[10px] text-tertiary mt-0.5">
                      {new Date(pin.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Approve */}
                    {(pin.status === 'draft' || pin.status === 'ready' || pin.status === 'failed') && (
                      <button
                        onClick={() => updatePinStatus(pin.id, 'approved')}
                        disabled={actionId === pin.id}
                        className="text-xs text-[#3C3489] hover:underline disabled:opacity-50"
                        title="Approve"
                      >
                        Approve
                      </button>
                    )}

                    {/* Post now */}
                    {(pin.status === 'approved' || pin.status === 'ready') && authStatus?.connected && (
                      <button
                        onClick={() => postSinglePin(pin.id)}
                        disabled={actionId === pin.id}
                        className="text-xs text-[#E60023] hover:underline disabled:opacity-50"
                        title="Post to Pinterest now"
                      >
                        {actionId === pin.id ? '...' : 'Post'}
                      </button>
                    )}

                    {/* Download PNG */}
                    {(!pin.needs_photo || pin.image_url || pin.image_public_url) && (
                      <button
                        onClick={() => downloadImage(pin)}
                        disabled={actionId === pin.id}
                        className="text-xs text-type-classic-text hover:underline disabled:opacity-50"
                        title="Download generated image"
                      >
                        PNG
                      </button>
                    )}

                    {/* Edit */}
                    <Link
                      href={`/admin/pinterest/${pin.id}`}
                      className="text-xs text-tertiary hover:text-secondary transition-colors"
                    >
                      Edit
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => deleteSinglePin(pin.id)}
                      className="text-xs text-[#72243E] hover:underline"
                      title="Delete"
                    >
                      Del
                    </button>
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
