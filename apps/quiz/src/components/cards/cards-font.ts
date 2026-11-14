// Bunnyverse Cards (owner go, 2026-11-12): the two faces of the prototype, Archivo for the card lettering and Martian Mono for the
// card meta, both with their width axis (the card styles set font-stretch). next/font self-hosts them at build, so no font file is
// added to the repository by hand; the variables go on the root of the Cards pages only, so no other page of any site loads them.
import { Archivo, DM_Sans, Martian_Mono } from 'next/font/google';

export const cardsFace = Archivo({ subsets: ['latin'], display: 'swap', variable: '--font-bvc-card', axes: ['wdth'] });
export const cardsMono = Martian_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-bvc-mono', axes: ['wdth'] });
// The interface face of the prototype: DM Sans with its optical size axis (the prototype loads DM+Sans:opsz,wght@9..40,400..800). The site's own DM Sans
// file has the weight axis only, so headings drew wider and small text narrower than the prototype. Same settings as the Bunnyverse home's face.
// No metric-adjusted fallback face: a glyph DM Sans lacks (the arrows of the pager) falls to the next face of the stack, as in the prototype.
export const cardsUi = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-bvc-ui', axes: ['opsz'], adjustFontFallback: false });
