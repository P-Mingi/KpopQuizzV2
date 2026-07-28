import { Node, mergeAttributes } from '@tiptap/react';

// W3.3 - widget blocks. A single generic embed node (kind + group) covers the
// discography, quiz and stats widgets. It renders as a card that links to the
// real, live surface where the data actually lives - no data is copied or faked
// into the document. Insertion uses the built-in insertContent command (no custom
// command / module augmentation). SSR is in lib/verse/render-content.ts.

export type EmbedKind = 'discography' | 'quiz' | 'stats';

const LABEL: Record<string, string> = { discography: 'Discography', quiz: 'Quiz', stats: 'Stats' };

export const VerseEmbed = Node.create({
  name: 'verseEmbed',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: 'discography' },
      group: { default: '' },
    };
  },

  parseHTML() { return [{ tag: 'div[data-verse-embed]' }]; },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const kind = String(HTMLAttributes.kind ?? 'discography');
    const group = String(HTMLAttributes.group ?? '');
    return ['div', mergeAttributes(HTMLAttributes, { 'data-verse-embed': '', class: 'verse-embed-card' }),
      `${LABEL[kind] ?? kind} embed${group ? ` - ${group}` : ''}`];
  },
});
