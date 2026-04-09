'use client';

import { useState } from 'react';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Drag-and-drop / click-to-browse cover image uploader used in the quiz
 * creator. Uploads to the existing `/api/quiz/upload-image` endpoint
 * (which stores to the `quiz-images` Supabase bucket) and returns a public
 * URL. Shows a preview + remove button when a value is set.
 */
export function CoverUpload({ value, onChange }: Props): React.ReactElement {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/quiz/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Upload failed');
        return;
      }
      onChange(data.url);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void handleFile(file);
    };
    input.click();
  }

  if (value) {
    return (
      <div className="relative w-full h-[120px] rounded-xl overflow-hidden border border-default bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="Cover preview" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-medium hover:bg-black/80 transition-colors cursor-pointer"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`w-full h-[120px] rounded-xl border-[1.5px] border-dashed flex flex-col items-center justify-center cursor-pointer bg-surface transition-colors ${
          dragOver ? 'border-accent bg-accent-bg' : 'border-default hover:border-accent'
        }`}
      >
        {uploading ? (
          <span className="text-xs text-accent font-medium">Uploading...</span>
        ) : (
          <>
            <span className="text-xs text-tertiary">Drop an image or click to browse</span>
            <span className="text-[10px] text-ghost mt-[2px]">
              Shows on quiz card + start screen &middot; JPG, PNG, WebP
            </span>
          </>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-wrong-text mt-1.5">{error}</p>
      )}
    </div>
  );
}
