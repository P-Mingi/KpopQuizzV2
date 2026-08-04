// The schema-constrained TipTap extension set for Verse sections. Blocks:
// paragraph, heading (h2/h3), bullet/ordered list, blockquote, horizontal rule,
// table, image-by-policy. Marks: bold, italic only. Everything else is disabled
// so the editor and the SSR renderer (lib/verse/render-content.ts) agree exactly.
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';

import { verseMention } from './mention';
import { VerseEmbed } from './embed';
import { VerseHighlight, VerseFontSize, VerseTextAlign } from './marks';

import type { Extensions } from '@tiptap/react';

export const verseEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    // V-BUILDER-1 step 4: strike + underline are ON (both bundled in StarterKit,
    // no new dep). Link stays configured explicitly below (the citation helper).
    link: false,
  }),
  // V-BUILDER-1 step 4: the token-governed marks - highlight (tint enum), size
  // step (S/M/L), and alignment (left/center on paragraph + heading).
  VerseHighlight,
  VerseFontSize,
  VerseTextAlign,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({ inline: false, allowBase64: false }),
  // Citation helper: pasted/typed URLs become nofollow source links (W3.3).
  Link.extend({
    // V-POLISH-2 B3: the editor preview matches the anchor law. Internal hrefs
    // (site-relative or our own origin) render as verse-link chips; externals
    // keep the cite treatment. Published rendering was already correct; now
    // what the writer sees is what the reader gets.
    renderHTML({ HTMLAttributes }) {
      const href = String(HTMLAttributes.href ?? '');
      const internal = href.startsWith('/') || /^https?:\/\/(www\.)?kpopquiz\.org(?=[/?#]|$)/i.test(href);
      return ['a', {
        ...HTMLAttributes,
        class: internal ? 'verse-link' : 'verse-cite',
        rel: internal ? null : 'nofollow noopener',
        target: internal ? null : '_blank',
      }, 0];
    },
  }).configure({ openOnClick: false, autolink: true }),
  // @-mention entity picker (idols/albums/groups -> linked chips).
  verseMention,
  // Widget blocks: discography / quiz / stats cards linking to the live surface.
  VerseEmbed,
];
