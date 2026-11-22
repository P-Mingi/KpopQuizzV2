// Run O1, lot H2a: the face of the new Bunnyverse home (the design is set in DM Sans, 400 to 800, with its optical size). Self-hosted by
// next/font at build; the variable goes on the root of the home only, so no other page of any site loads it.
// Home v3 (2026-10-29): the numbers (ranks, counts, the countdown, plays) are set in DM Mono 500 with tabular figures, as the board does.
import { Big_Shoulders, DM_Mono, DM_Sans } from 'next/font/google';

export const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans', axes: ['opsz'] });
export const dmMono = DM_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-dm-mono', weight: '500' });
// Lot HUB-HOT-B (2026-11-22): Big Shoulders in 700, 800 and 900, for the ranks and the typographic fallback of "Popular this week" only (the rest of
// the home stays in DM Sans and DM Mono). Not preloaded: the ranks and the fallback show in the system face until it lands.
export const bigShoulders = Big_Shoulders({ subsets: ['latin'], display: 'swap', variable: '--font-big-shoulders', weight: ['700', '800', '900'], preload: false });
