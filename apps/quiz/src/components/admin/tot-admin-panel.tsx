'use client';

import { useRef, useState, useMemo } from 'react';

import type { TotCategory, TotItem } from '@/lib/db/types';

interface TotAdminPanelProps {
  categories: TotCategory[];
  items: TotItem[];
}

export function TotAdminPanel({ categories, items }: TotAdminPanelProps): React.ReactElement {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<TotItem[]>(items);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.title);
    }
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    let result = localItems;

    if (selectedCategoryId) {
      result = result.filter(item => item.category_id === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [localItems, selectedCategoryId, searchQuery]);

  const totalCount = localItems.length;
  const withImages = localItems.filter(item => item.image_url).length;
  const missingImages = totalCount - withImages;

  async function handleUpload(itemId: string, file: File) {
    setUploadingItemId(itemId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('item_id', itemId);

      const res = await fetch('/api/admin/tot-upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.url) {
        setLocalItems(prev =>
          prev.map(item => (item.id === itemId ? { ...item, image_url: data.url } : item)),
        );
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingItemId(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
        This or That - Manage Images
      </h1>

      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {totalCount} items total / {withImages} with images / {missingImages} need images
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          value={selectedCategoryId ?? ''}
          onChange={e => setSelectedCategoryId(e.target.value || null)}
        >
          <option value="">All categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.title} ({cat.type})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by name or subtitle..."
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] flex-1 min-w-[200px]"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredItems.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            categoryName={categoryMap.get(item.category_id) ?? ''}
            uploadingItemId={uploadingItemId}
            onUpload={handleUpload}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-sm text-[var(--text-tertiary)] py-12">
          No items found.
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Item card
// ------------------------------------------------------------------

interface ItemCardProps {
  item: TotItem;
  categoryName: string;
  uploadingItemId: string | null;
  onUpload: (itemId: string, file: File) => void;
}

function ItemCard({ item, categoryName, uploadingItemId, onUpload }: ItemCardProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(item.id, file);
    }
    // Reset so re-selecting the same file triggers onChange again
    e.target.value = '';
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Image area */}
      <div
        className="h-[120px] relative flex items-center justify-center cursor-pointer group"
        style={{ background: item.image_url ? undefined : item.color }}
        onClick={() => fileInputRef.current?.click()}
      >
        {item.image_url ? (
          <>
            <img
              src={item.image_url}
              className="w-full h-full object-cover"
              alt={item.name}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Replace</span>
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="text-2xl font-medium text-white/20">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
            <p className="text-[10px] text-white/40 mt-1">Click to upload</p>
          </div>
        )}

        {/* Status dot */}
        <div
          className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
            item.image_url ? 'bg-[#0F6E56]' : 'bg-[#A32D2D]'
          }`}
        />

        {/* Loading spinner */}
        {uploadingItemId === item.id && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] truncate">{item.subtitle}</p>
        <p className="text-[9px] text-[var(--text-ghost)] mt-0.5">{categoryName}</p>
      </div>
    </div>
  );
}
