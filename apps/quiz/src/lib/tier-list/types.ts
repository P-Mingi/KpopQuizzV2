// TIERLIST - shared types for the tier list maker. The DB row shape mirrors
// migration 146 (tier_lists / tier_list_assets); the in-app shapes are the ones
// the maker, the bank read layer and the aggregate work with.

/** What kind of bank/custom item a card is. */
export type ItemKind = 'member' | 'track' | 'album' | 'custom';

/** The subject a list ranks (matches tier_lists.subject_kind). */
export type SubjectKind = 'members' | 'tracks' | 'albums' | 'all' | 'blank';

export type Visibility = 'public' | 'unlisted' | 'private';

/** The uniform item shape the bank read layer returns for any subject. */
export interface TierListItem {
  id: string;
  kind: ItemKind;
  name: string;
  /** Covers always have an image; idol photos may be null, so the UI falls back
      to the initials-on-gradient tile the design uses. */
  image_url: string | null;
}

/** One coloured tier row. `ord` is the top-to-bottom order (0 = top). */
export interface Tier {
  label: string;
  color: string;
  ord: number;
}

/** tierLabel (or the UNRANKED key) -> ordered item ids. */
export type Placements = Record<string, string[]>;

/** The tier_lists row (jsonb columns decoded). */
export interface TierListRow {
  id: string;
  slug: string;
  creator_id: string | null;
  anon_id: string | null;
  subject_group_id: number | null;
  subject_kind: SubjectKind;
  title: string;
  tiers: Tier[];
  placements: Placements;
  visibility: Visibility;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

/** A custom upload (tier_list_assets row). */
export interface TierListAsset {
  id: string;
  owner_id: string | null;
  anon_id: string | null;
  name: string;
  image_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
