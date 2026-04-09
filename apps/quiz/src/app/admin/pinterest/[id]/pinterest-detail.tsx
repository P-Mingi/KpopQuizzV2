'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

import type { PinterestPin } from '../pinterest-dashboard';

interface AuthStatus {
  connected: boolean;
  expiresAt?: string;
  scope?: string;
}

interface Props {
  pin: PinterestPin;
  boards: Array<{ board_name: string; pinterest_board_id: string }>;
  authStatus: AuthStatus | null;
}

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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface text-secondary',
  ready: 'bg-type-classic-bg text-type-classic-text',
  approved: 'bg-[#EEEDFE] text-[#3C3489]',
  scheduled: 'bg-[#FAEEDA] text-[#633806]',
  posted: 'bg-[#EAF3DE] text-[#27500A]',
  failed: 'bg-[#FBEAF0] text-[#72243E]',
};

export function PinterestDetail({ pin: initialPin, boards, authStatus }: Props): React.ReactElement {
  const [pin, setPin] = useState<PinterestPin>(initialPin);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Editable fields
  const [title, setTitle] = useState(pin.title);
  const [description, setDescription] = useState(pin.description);
  const [headline, setHeadline] = useState(pin.headline);
  const [subtext, setSubtext] = useState(pin.subtext ?? '');
  const [board, setBoard] = useState(pin.board);
  const [linkUrl, setLinkUrl] = useState(pin.link_url ?? '');
  const [imageUrl, setImageUrl] = useState(pin.image_url ?? '');
  const [hashtags, setHashtags] = useState(pin.hashtags.join(' '));

  const copyText = useCallback(async (field: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          headline,
          subtext: subtext || null,
          board,
          link_url: linkUrl || null,
          image_url: imageUrl || null,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const { pin: updated } = await res.json() as { pin: PinterestPin };
      setPin(updated);
      setImagePreviewUrl(null);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [pin.id, title, description, headline, subtext, board, linkUrl, imageUrl, hashtags]);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setImagePreviewUrl(null);
    try {
      // Save first so image reflects latest state
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          headline,
          subtext: subtext || null,
          board,
          link_url: linkUrl || null,
          image_url: imageUrl || null,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to save before preview');
      const { pin: updated } = await res.json() as { pin: PinterestPin };
      setPin(updated);

      const imgRes = await fetch(`/api/admin/pinterest/generate-image?id=${pin.id}`);
      if (!imgRes.ok) throw new Error('Failed to generate image');
      const blob = await imgRes.blob();
      setImagePreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      alert(`Failed to load preview: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoadingPreview(false);
    }
  }, [pin.id, title, description, headline, subtext, board, linkUrl, imageUrl, hashtags]);

  const downloadImage = useCallback(async () => {
    setDownloading(true);
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
      alert('Failed to download. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [pin.id]);

  const updateStatus = useCallback(async (status: string) => {
    try {
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const { pin: updated } = await res.json() as { pin: PinterestPin };
      setPin(updated);
    } catch {
      alert('Failed to update status.');
    }
  }, [pin.id]);

  const postToPin = useCallback(async () => {
    if (!confirm('Post this pin to Pinterest now?')) return;
    setPosting(true);
    try {
      // Save current edits first
      await save();

      const res = await fetch('/api/admin/pinterest/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_id: pin.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPin((prev) => ({
          ...prev,
          status: 'posted',
          posted_at: new Date().toISOString(),
          pinterest_pin_id: data.pinterest_pin_id,
        }));
        alert('Pin posted to Pinterest!');
      } else {
        alert(`Post failed: ${data.error}`);
      }
    } catch {
      alert('Failed to post to Pinterest.');
    } finally {
      setPosting(false);
    }
  }, [pin.id, save]);

  const canGenerateImage = !pin.needs_photo || !!imageUrl;
  const canPost = authStatus?.connected && (pin.image_public_url || pin.generated_image_url || pin.image_url);

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/pinterest" className="text-secondary hover:text-primary transition-colors text-sm">
            Pinterest Pins
          </Link>
          <span className="text-tertiary">/</span>
          <h1 className="text-xl font-semibold text-primary line-clamp-1">{pin.headline}</h1>
        </div>
        <div className="flex items-center gap-2">
          {pin.status !== 'posted' && pin.status !== 'approved' && (
            <button
              onClick={() => updateStatus('approved')}
              className="px-3 py-1.5 bg-[#EEEDFE] text-[#3C3489] text-sm font-medium rounded-lg hover:bg-[#E0DEFD] transition-colors"
            >
              Approve
            </button>
          )}
          {canPost && pin.status !== 'posted' && (
            <button
              onClick={postToPin}
              disabled={posting}
              className="px-3 py-1.5 bg-[#E60023] text-white text-sm font-medium rounded-lg hover:bg-[#C2001D] transition-colors disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post to Pinterest'}
            </button>
          )}
          {pin.status === 'posted' && (
            <span className="px-3 py-1.5 bg-[#EAF3DE] text-[#27500A] text-sm font-medium rounded-lg">
              Posted
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 bg-surface text-primary text-sm font-medium rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Edit fields */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <h2 className="text-sm font-semibold text-primary mb-3">Pin Info</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-tertiary">Type</span>
                <p className="text-primary font-medium mt-0.5">{TYPE_LABELS[pin.pin_type] ?? pin.pin_type}</p>
              </div>
              <div>
                <span className="text-tertiary">Status</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${STATUS_COLORS[pin.status] ?? ''}`}>
                  {pin.status.charAt(0).toUpperCase() + pin.status.slice(1)}
                </span>
              </div>
              <div>
                <span className="text-tertiary">Group</span>
                <p className="text-primary font-medium mt-0.5">{pin.group_name ?? 'General'}</p>
              </div>
              <div>
                <span className="text-tertiary">Pinterest ID</span>
                <p className="text-primary font-medium mt-0.5 text-[10px] font-mono">
                  {pin.pinterest_pin_id ?? 'Not posted'}
                </p>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <label className="text-sm font-semibold text-primary block mb-2">Board</label>
            {boards.length > 0 ? (
              <select
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
              >
                {boards.map((b) => (
                  <option key={b.board_name} value={b.board_name}>{b.board_name}</option>
                ))}
                {!boards.find((b) => b.board_name === board) && (
                  <option value={board}>{board} (not synced)</option>
                )}
              </select>
            ) : (
              <input
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
              />
            )}
          </div>

          {/* Pinterest title */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-primary">Pinterest Title</label>
              <button
                onClick={() => copyText('title', title)}
                className="text-xs text-type-classic-text hover:underline"
              >
                {copied === 'title' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
              maxLength={100}
            />
            <p className="text-xs text-tertiary mt-1">{title.length}/100 characters</p>
          </div>

          {/* Pinterest description */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-primary">Description</label>
              <button
                onClick={() => copyText('description', description)}
                className="text-xs text-type-classic-text hover:underline"
              >
                {copied === 'description' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary resize-none"
              maxLength={500}
            />
            <p className="text-xs text-tertiary mt-1">{description.length}/500 characters</p>
          </div>

          {/* Link URL */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <label className="text-sm font-semibold text-primary block mb-2">Link URL</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
              placeholder="https://kpopquiz.org"
              type="url"
            />
          </div>

          {/* Hashtags */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-primary">Hashtags</label>
              <button
                onClick={() => copyText('hashtags', hashtags)}
                className="text-xs text-type-classic-text hover:underline"
              >
                {copied === 'hashtags' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              rows={3}
              className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary resize-none font-mono"
              placeholder="#kpop #kpopquiz"
            />
          </div>

          {/* Image template fields */}
          <div className="bg-primary border border-default rounded-lg p-4">
            <h2 className="text-sm font-semibold text-primary mb-3">Image Template</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-tertiary block mb-1">Headline (shown on image)</label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
                />
              </div>
              <div>
                <label className="text-xs text-tertiary block mb-1">Subtext (shown on image)</label>
                <input
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
                  placeholder="Optional"
                />
              </div>
              {pin.needs_photo && (
                <div>
                  <label className="text-xs text-tertiary block mb-1">
                    Photo URL <span className="text-[#7A4F00]">(required for quiz_link)</span>
                  </label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full text-sm border border-default rounded-lg px-3 py-2 bg-elevated text-primary"
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Image preview + stats */}
        <div className="space-y-4">
          <div className="bg-primary border border-default rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-primary">Image Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadPreview}
                  disabled={loadingPreview || !canGenerateImage}
                  className="px-3 py-1.5 text-xs bg-surface text-primary rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
                >
                  {loadingPreview ? 'Generating...' : 'Preview'}
                </button>
                <button
                  onClick={downloadImage}
                  disabled={downloading || !canGenerateImage}
                  className="px-3 py-1.5 text-xs bg-[#EEEDFE] text-[#3C3489] rounded-lg hover:bg-[#E0DEFD] transition-colors disabled:opacity-50"
                >
                  {downloading ? 'Downloading...' : 'Download PNG'}
                </button>
              </div>
            </div>

            {/* Show uploaded image or preview */}
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreviewUrl}
                alt="Pin preview"
                className="w-full rounded-lg border border-default"
                style={{ aspectRatio: '1000/1500', objectFit: 'cover' }}
              />
            ) : pin.image_public_url || pin.image_url ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(pin.image_public_url || pin.image_url)!}
                  alt="Uploaded image"
                  className="w-full rounded-lg border border-default object-cover"
                  style={{ maxHeight: '500px' }}
                />
                <p className="text-xs text-tertiary mt-2">Uploaded image. Click Preview to see the generated pin template.</p>
              </div>
            ) : (
              <div
                className="w-full rounded-lg border-2 border-dashed border-default flex flex-col items-center justify-center text-tertiary"
                style={{ aspectRatio: '1000/1500' }}
              >
                <p className="text-sm">1000 x 1500 px</p>
                <p className="text-xs mt-1">Click Preview to generate</p>
                {!canGenerateImage && (
                  <p className="text-xs mt-2 text-[#7A4F00]">Photo URL required first</p>
                )}
              </div>
            )}
          </div>

          {/* Analytics (if posted) */}
          {pin.status === 'posted' && (
            <div className="bg-primary border border-default rounded-lg p-4">
              <h2 className="text-sm font-semibold text-primary mb-3">Analytics</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{pin.impressions}</div>
                  <div className="text-xs text-tertiary">Impressions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{pin.saves}</div>
                  <div className="text-xs text-tertiary">Saves</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-primary">{pin.clicks}</div>
                  <div className="text-xs text-tertiary">Clicks</div>
                </div>
              </div>
              {pin.posted_at && (
                <p className="text-xs text-tertiary mt-3 text-center">
                  Posted {new Date(pin.posted_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Posting workflow */}
          {pin.status !== 'posted' && (
            <div className="bg-primary border border-default rounded-lg p-4">
              <h2 className="text-sm font-semibold text-primary mb-3">Posting Workflow</h2>
              {authStatus?.connected ? (
                <ol className="space-y-2 text-xs text-secondary">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">1.</span>
                    Review and edit the title, description, board, and image
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">2.</span>
                    Click <span className="font-medium">Approve</span> when ready
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">3.</span>
                    Click <span className="font-medium text-[#E60023]">Post to Pinterest</span> to publish directly
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2 text-xs text-secondary">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">1.</span>
                    Preview the image, then click <span className="font-medium">Download PNG</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">2.</span>
                    Copy the <span className="font-medium">Pinterest Title</span> and <span className="font-medium">Description</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">3.</span>
                    Go to Pinterest, create a pin, upload the image
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">4.</span>
                    Paste the title, description, and link URL
                  </li>
                  <li className="flex gap-2 mt-3 pt-3 border-t border-default">
                    <span className="text-[#E60023] font-medium">
                      Connect Pinterest in the dashboard for direct posting!
                    </span>
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
