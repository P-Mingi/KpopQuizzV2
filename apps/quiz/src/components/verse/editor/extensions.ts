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

import type { Extensions } from '@tiptap/react';

export const verseEditorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    strike: false,
    // StarterKit v3 bundles link + underline; drop them to keep the constrained
    // set (citation links arrive as their own extension in W3.3).
    link: false,
    underline: false,
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Image.configure({ inline: false, allowBase64: false }),
];
