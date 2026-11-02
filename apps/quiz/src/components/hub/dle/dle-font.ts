// Daily games step 4 (v2 section 11.12): Unbounded in one weight, for the marquee of the game pages only. Self-hosted by next/font at build; its variable goes on the root of those pages, so no other page loads it.
import { Unbounded } from 'next/font/google';

export const dleMarquee = Unbounded({ subsets: ['latin'], display: 'swap', variable: '--font-dle-marquee', weight: '700', preload: false });
