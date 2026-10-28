// Run O1, lot H2a: the face of the new FandomVerse home (the design is set in DM Sans, 400 to 800, with its optical size). Self-hosted by
// next/font at build; the variable goes on the root of the home only, so no other page of any site loads it.
import { DM_Sans } from 'next/font/google';

export const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-dm-sans', axes: ['opsz'] });
