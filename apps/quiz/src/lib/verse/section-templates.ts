// V-EDITOR-MAX (V-ROLES step 5) - SECTION TEMPLATES: starter skeletons for the
// sections fans stall on. STRUCTURE ONLY: headings and empty paragraphs, zero
// generated prose (the writing is the fan's; the template only answers "what
// shape does a good one have?"). Keyed by entityType:sectionKey.

interface TipTapNode { type: string; attrs?: Record<string, unknown>; content?: TipTapNode[] }

const h3 = (text: string): TipTapNode => ({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text } as unknown as TipTapNode] });
const p = (): TipTapNode => ({ type: 'paragraph' });

export interface SectionTemplate { label: string; doc: { type: 'doc'; content: TipTapNode[] } }

export const SECTION_TEMPLATES: Record<string, SectionTemplate> = {
  'era:era_story': {
    label: 'era story',
    doc: { type: 'doc', content: [
      h3('The concept'), p(),
      h3('The sound'), p(),
      h3('How it landed'), p(),
    ] },
  },
  'album:about': {
    label: 'album note',
    doc: { type: 'doc', content: [
      h3('About this release'), p(),
      h3('Standout tracks'), p(),
      h3('The era around it'), p(),
    ] },
  },
  'idol:lore': {
    label: 'idol lore',
    doc: { type: 'doc', content: [
      h3('Background'), p(),
      h3('In the group'), p(),
      h3('What fans know them for'), p(),
    ] },
  },
  'group:lore': {
    label: 'culture guide',
    doc: { type: 'doc', content: [
      h3('The story'), p(),
      h3('The words fans use'), p(),
      h3('How to join in'), p(),
    ] },
  },
};

export function templateFor(entityType: string, sectionKey: string): SectionTemplate | null {
  return SECTION_TEMPLATES[`${entityType}:${sectionKey}`] ?? null;
}
