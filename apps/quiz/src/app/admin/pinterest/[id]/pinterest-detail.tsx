'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

import type { PinterestPin } from '../pinterest-dashboard';

interface Props {
  pin: PinterestPin;
}

const TYPE_LABELS: Record<string, string> = {
  quiz_link: 'Quiz Link',
  fact_card: 'Fact Card',
  did_you_know: 'Did You Know',
  score_challenge: 'Score Challenge',
};

export function PinterestDetail({ pin: initialPin }: Props): React.ReactElement {
  const [pin, setPin] = useState<PinterestPin>(initialPin);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Editable fields
  const [title, setTitle] = useState(pin.title);
  const [description, setDescription] = useState(pin.description);
  const [headline, setHeadline] = useState(pin.headline);
  const [subtext, setSubtext] = useState(pin.subtext ?? '');
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
  }, [pin.id, title, description, headline, subtext, imageUrl, hashtags]);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setImagePreviewUrl(null);
    try {
      // Save current changes first so the image reflects latest state
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          headline,
          subtext: subtext || null,
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
  }, [pin.id, title, description, headline, subtext, imageUrl, hashtags]);

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

  const markPosted = useCallback(async () => {
    setMarking(true);
    try {
      const res = await fetch(`/api/admin/pinterest/${pin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const { pin: updated } = await res.json() as { pin: PinterestPin };
      setPin(updated);
    } catch {
      alert('Failed to mark as posted. Please try again.');
    } finally {
      setMarking(false);
    }
  }, [pin.id]);

  const canGenerateImage = !pin.needs_photo || !!imageUrl;

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/pinterest" className="text-txt-secondary hover:text-txt-primary transition-colors text-sm">
            Pinterest Pins
          </Link>
          <span className="text-txt-tertiary">/</span>
          <h1 className="text-xl font-semibold text-txt-primary line-clamp-1">{pin.headline}</h1>
        </div>
        <div className="flex items-center gap-2">
          {pin.status !== 'posted' && (
            <button
              onClick={markPosted}
              disabled={marking}
              className="px-3 py-1.5 bg-[#EAF3DE] text-[#27500A] text-sm font-medium rounded-lg hover:bg-[#D8EDCB] transition-colors disabled:opacity-50"
            >
              {marking ? 'Saving...' : 'Mark as Posted'}
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 bg-[#EEEDFE] text-[#3C3489] text-sm font-medium rounded-lg hover:bg-[#E0DEFD] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Edit fields */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <h2 className="text-sm font-semibold text-txt-primary mb-3">Pin Info</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-txt-tertiary">Type</span>
                <p className="text-txt-primary font-medium mt-0.5">{TYPE_LABELS[pin.pin_type] ?? pin.pin_type}</p>
              </div>
              <div>
                <span className="text-txt-tertiary">Status</span>
                <p className="text-txt-primary font-medium mt-0.5 capitalize">{pin.status}</p>
              </div>
              <div>
                <span className="text-txt-tertiary">Group</span>
                <p className="text-txt-primary font-medium mt-0.5">{pin.group_name ?? 'General'}</p>
              </div>
              <div>
                <span className="text-txt-tertiary">Board</span>
                <p className="text-txt-primary font-medium mt-0.5">{pin.board}</p>
              </div>
            </div>
            {pin.link_url && (
              <div className="mt-2">
                <span className="text-xs text-txt-tertiary">Link URL</span>
                <p className="text-xs text-info-text mt-0.5 truncate">{pin.link_url}</p>
              </div>
            )}
          </div>

          {/* Pinterest title */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-txt-primary">Pinterest Title</label>
              <button
                onClick={() => copyText('title', title)}
                className="text-xs text-info-text hover:underline"
              >
                {copied === 'title' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary"
              maxLength={100}
            />
            <p className="text-xs text-txt-tertiary mt-1">{title.length}/100 characters</p>
          </div>

          {/* Pinterest description */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-txt-primary">Description</label>
              <button
                onClick={() => copyText('description', description)}
                className="text-xs text-info-text hover:underline"
              >
                {copied === 'description' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary resize-none"
              maxLength={500}
            />
            <p className="text-xs text-txt-tertiary mt-1">{description.length}/500 characters</p>
          </div>

          {/* Hashtags */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-txt-primary">Hashtags</label>
              <button
                onClick={() => copyText('hashtags', hashtags)}
                className="text-xs text-info-text hover:underline"
              >
                {copied === 'hashtags' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <textarea
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              rows={3}
              className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary resize-none font-mono"
              placeholder="#kpop #kpopquiz"
            />
          </div>

          {/* Image fields */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <h2 className="text-sm font-semibold text-txt-primary mb-3">Image Template</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-txt-tertiary block mb-1">Headline (shown on image)</label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary"
                />
              </div>
              <div>
                <label className="text-xs text-txt-tertiary block mb-1">Subtext (shown on image)</label>
                <input
                  value={subtext}
                  onChange={(e) => setSubtext(e.target.value)}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary"
                  placeholder="Optional"
                />
              </div>
              {pin.needs_photo && (
                <div>
                  <label className="text-xs text-txt-tertiary block mb-1">
                    Photo URL <span className="text-[#7A4F00]">(required for quiz_link)</span>
                  </label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full text-sm border border-border-light rounded-lg px-3 py-2 bg-surface-tertiary text-txt-primary"
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Image preview */}
        <div className="space-y-4">
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-txt-primary">Image Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadPreview}
                  disabled={loadingPreview || !canGenerateImage}
                  className="px-3 py-1.5 text-xs bg-surface-secondary text-txt-primary rounded-lg hover:bg-surface-tertiary transition-colors disabled:opacity-50"
                  title={!canGenerateImage ? 'Upload a photo first' : undefined}
                >
                  {loadingPreview ? 'Generating...' : 'Preview'}
                </button>
                <button
                  onClick={downloadImage}
                  disabled={downloading || !canGenerateImage}
                  className="px-3 py-1.5 text-xs bg-[#EEEDFE] text-[#3C3489] rounded-lg hover:bg-[#E0DEFD] transition-colors disabled:opacity-50"
                  title={!canGenerateImage ? 'Upload a photo first' : undefined}
                >
                  {downloading ? 'Downloading...' : 'Download PNG'}
                </button>
              </div>
            </div>

            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreviewUrl}
                alt="Pin preview"
                className="w-full rounded-lg border border-border-light"
                style={{ aspectRatio: '1000/1500', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="w-full rounded-lg border-2 border-dashed border-border-medium flex flex-col items-center justify-center text-txt-tertiary"
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

          {/* Workflow guide */}
          <div className="bg-surface-primary border border-border-light rounded-lg p-4">
            <h2 className="text-sm font-semibold text-txt-primary mb-3">Posting Workflow</h2>
            <ol className="space-y-2 text-xs text-txt-secondary">
              <li className="flex gap-2">
                <span className="font-semibold text-txt-primary shrink-0">1.</span>
                Preview the image, then click <span className="font-medium">Download PNG</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-txt-primary shrink-0">2.</span>
                Copy the <span className="font-medium">Pinterest Title</span> and <span className="font-medium">Description</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-txt-primary shrink-0">3.</span>
                Go to Pinterest, create a pin, upload the image
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-txt-primary shrink-0">4.</span>
                Paste the title, description, and link URL
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-txt-primary shrink-0">5.</span>
                Come back and click <span className="font-medium">Mark as Posted</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
