// V-BUILDER-1 step 4 - three hand-rolled TipTap extensions (NO new deps) for the
// token-governed text marks. All values are ENUMS (a tint name, a size step, an
// alignment) - never a raw color, never free px - so a curator picks from a clamped
// set and the SSR renderer (lib/verse/render-content.ts) emits the SAME classes.
// The backing CSS (globals.css, .verse-hl-* / .verse-size-* / .verse-align-*) is
// theme-safe (semi-transparent tints, em-relative sizes) so contrast holds in both
// light and dark.
// @tiptap/react re-exports the core Mark/Extension/mergeAttributes (pnpm does not
// hoist @tiptap/core to a directly-importable path).
import { Mark, Extension, mergeAttributes } from '@tiptap/react';

import { clampTint, clampSize, clampAlign } from '@/lib/verse/mark-tokens';

// Highlight: <mark class="verse-hl verse-hl-{tint}">. Tint is a clamped enum.
export const VerseHighlight = Mark.create({
  name: 'highlight',
  addAttributes() {
    return {
      tint: {
        default: 'yellow',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-tint') ?? 'yellow',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-tint': clampTint(attrs.tint) }),
      },
    };
  },
  parseHTML() { return [{ tag: 'mark' }]; },
  renderHTML({ HTMLAttributes, mark }) {
    const tint = clampTint(mark.attrs.tint);
    return ['mark', mergeAttributes(HTMLAttributes, { class: `verse-hl verse-hl-${tint}`, 'data-tint': tint }), 0];
  },
});

// Size step: <span class="verse-size-{S|M|L}">. Steps on the type scale, not px.
export const VerseFontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: 'M',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-size') ?? 'M',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-size': clampSize(attrs.size) }),
      },
    };
  },
  parseHTML() { return [{ tag: 'span[data-size]' }]; },
  renderHTML({ HTMLAttributes, mark }) {
    const size = clampSize(mark.attrs.size);
    return ['span', mergeAttributes(HTMLAttributes, { class: `verse-size-${size}`, 'data-size': size }), 0];
  },
});

// Alignment: a global attribute on paragraph + heading -> class="verse-align-{left|center}".
// Left is the default (no class), so only a deliberate center emits a wrapper.
export const VerseTextAlign = Extension.create({
  name: 'verseTextAlign',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textAlign: {
          default: null,
          parseHTML: (el: HTMLElement) => {
            const m = /verse-align-(left|center)/.exec(el.getAttribute('class') ?? '');
            return clampAlign(m ? m[1] : el.style.textAlign);
          },
          renderHTML: (attrs: Record<string, unknown>) => {
            const a = clampAlign(attrs.textAlign);
            return a ? { class: `verse-align-${a}` } : {};
          },
        },
      },
    }];
  },
});
