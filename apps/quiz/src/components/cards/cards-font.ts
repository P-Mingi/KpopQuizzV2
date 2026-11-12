// Bunnyverse Cards (owner go, 2026-11-12): the two faces of the prototype, Archivo for the card lettering and Martian Mono for the
// card meta, both with their width axis (the card styles set font-stretch). next/font self-hosts them at build, so no font file is
// added to the repository by hand; the variables go on the root of the Cards pages only, so no other page of any site loads them.
import { Archivo, Martian_Mono } from 'next/font/google';

export const cardsFace = Archivo({ subsets: ['latin'], display: 'swap', variable: '--font-bvc-card', axes: ['wdth'] });
export const cardsMono = Martian_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-bvc-mono', axes: ['wdth'] });
