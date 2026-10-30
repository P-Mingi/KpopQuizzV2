// Run O1, lot H2a: the face of the new Bunnyverse home (the design is set in DM Sans, 400 to 800, with its optical size). Self-hosted by
// next/font at build; the variable goes on the root of the home only, so no other page of any site loads it.
// Home v3 (2026-10-29): the numbers (ranks, counts, the countdown, plays) are set in DM Mono 500 with tabular figures, as the board does.
import { DM_Mono, DM_Sans } from 'next/font/google';

export const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans', axes: ['opsz'] });
export const dmMono = DM_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-dm-mono', weight: '500' });
