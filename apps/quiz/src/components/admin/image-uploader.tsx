'use client';

import { useState, useRef } from 'react';

interface Props {
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploader({ value, onChange, label }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/quiz/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error as string);
      } else {
        onChange(data.url as string);
      }
    } catch {
      setError('Upload failed');
    }
    setLoading(false);
  }

  async function handleUrl() {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('external_url', urlInput.trim());

    try {
      const res = await fetch('/api/quiz/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error as string);
      } else {
        onChange(data.url as string);
        setUrlInput('');
      }
    } catch {
      setError('Fetch failed');
    }
    setLoading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && <label className="text-sm font-medium text-txt-primary mb-1 block">{label}</label>}

      {value ? (
        <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-border-light mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-1 right-1 w-6 h-6 bg-[#72243E] text-white rounded-full text-xs flex items-center justify-center"
          >
            x
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border-medium rounded-lg p-4 text-center cursor-pointer hover:border-accent-default transition-colors"
        >
          {loading ? (
            <p className="text-sm text-txt-secondary">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-txt-secondary">Drop an image here or click to browse</p>
              <p className="text-xs text-txt-tertiary mt-1">JPG, PNG, WebP, GIF - Max 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!value && (
        <div className="flex gap-2 mt-2 w-full min-w-0">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUrl(); } }}
            placeholder="Or paste URL..."
            className="min-w-0 flex-1 text-sm border border-border-light rounded-lg px-2 py-1.5 bg-surface-tertiary text-txt-primary"
          />
          <button
            onClick={handleUrl}
            disabled={loading || !urlInput.trim()}
            className="flex-shrink-0 px-2.5 py-1.5 bg-surface-secondary border border-border-light rounded-lg text-xs font-medium text-txt-primary disabled:opacity-50"
          >
            Fetch
          </button>
        </div>
      )}

      {error && <p className="text-xs text-[#72243E] mt-1">{error}</p>}
    </div>
  );
}
