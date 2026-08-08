// V-FOUNDATION F1 - the page-tree model (C1). Types for the `pages` system: one
// row per document (member/release/track/era/gallery/article/portal/index...), body
// = blocks jsonb (the V-BUILDER-1 universal document format). This module is the F1
// core and is DISTINCT from the legacy V-PAGES wiki (lib/verse/pages/*, verse_pages
// table), which stays frozen until a later phase folds it in.

export type PageStatus = 'draft' | 'published' | 'trash';

// The document body. A lightweight superset of the V-BUILDER-1 block shape: every
// block has a STABLE id (never the array index) + a type; the rest is per-type data.
// Document blocks (heading/text/image/infobox...) are rendered by the DOCUMENT canvas
// (Phase C); a portal page's body is the space Composition (Phase C rebind).
export interface PageBlock {
  id: string;
  type: string;
  [k: string]: unknown;
}
export interface PageBody {
  version: 1;
  blocks: PageBlock[];
}

export interface PageRow {
  id: number;
  space_id: number;
  parent_id: number | null;
  slug: string;
  type: string;
  title: string;
  status: PageStatus;
  blocks: PageBody;
  entity_kind: string | null;
  entity_id: number | null;
  is_stub: boolean;
  created_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageRevisionRow {
  id: number;
  page_id: number;
  space_id: number;
  rev: number;
  title: string;
  blocks: PageBody;
  author: string;
  created_at: string;
}

export interface RecentChange {
  page_id: number;
  rev: number;
  title: string;
  author: string;
  created_at: string;
  slug: string;
  type: string;
  status: PageStatus;
}

export const PAGE_BODY_EMPTY: PageBody = { version: 1, blocks: [] };
