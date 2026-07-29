// W3K.4 - registry for the new programmatic entity types (tours, shows, OST, awards).
// One definition per "scene" drives reader routing, admin authoring and narration.
// The section_key for narration reuses the existing allowlist ('overview').

export type SceneKind = 'tours' | 'shows' | 'ost' | 'awards';

export interface SceneField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'enum';
  options?: string[];
  required?: boolean;
}

export interface SceneDef {
  kind: SceneKind;
  table: 'tours' | 'shows' | 'osts' | 'awards';
  seg: string;                 // URL segment under /verse/{slug}
  label: string;               // tab / heading
  singular: string;
  entityType: string;          // verse_content entity_type for narration
  detailPage: boolean;         // true = each row gets its own page
  hasNarration: boolean;
  titleField: string;          // the display-name column
  fields: SceneField[];        // curator-editable fields (beyond title + source)
}

export const SCENES: Record<SceneKind, SceneDef> = {
  tours: {
    kind: 'tours', table: 'tours', seg: 'tours', label: 'Tours', singular: 'Tour',
    entityType: 'tour', detailPage: true, hasNarration: true, titleField: 'name',
    fields: [
      { key: 'tour_type', label: 'Type', type: 'enum', options: ['world', 'asia', 'domestic', 'fan-concert'] },
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'end_date', label: 'End date', type: 'date' },
      { key: 'leg_count', label: 'Legs', type: 'number' },
      { key: 'city_count', label: 'Cities', type: 'number' },
    ],
  },
  shows: {
    kind: 'shows', table: 'shows', seg: 'shows', label: 'Shows', singular: 'Show',
    entityType: 'show', detailPage: true, hasNarration: true, titleField: 'title',
    fields: [
      { key: 'show_type', label: 'Type', type: 'enum', options: ['variety', 'reality', 'web', 'documentary'] },
      { key: 'network', label: 'Network', type: 'text' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'role', label: 'Role', type: 'enum', options: ['host', 'cast', 'guest'] },
    ],
  },
  ost: {
    kind: 'ost', table: 'osts', seg: 'ost', label: 'OST', singular: 'OST',
    entityType: 'ost', detailPage: true, hasNarration: true, titleField: 'title',
    fields: [
      { key: 'for_work', label: 'For work', type: 'text' },
      { key: 'work_type', label: 'Work type', type: 'enum', options: ['drama', 'film', 'game', 'animation'] },
      { key: 'release_date', label: 'Release date', type: 'date' },
    ],
  },
  awards: {
    kind: 'awards', table: 'awards', seg: 'awards', label: 'Awards', singular: 'Award',
    entityType: 'award', detailPage: false, hasNarration: false, titleField: 'award_name',
    fields: [
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'ceremony', label: 'Ceremony', type: 'text' },
      { key: 'year', label: 'Year', type: 'number' },
      { key: 'result', label: 'Result', type: 'enum', options: ['won', 'nominated'] },
    ],
  },
};

export const SCENE_LIST: SceneDef[] = [SCENES.tours, SCENES.shows, SCENES.ost, SCENES.awards];

export function sceneBySeg(seg: string): SceneDef | null {
  return SCENE_LIST.find((s) => s.seg === seg) ?? null;
}
