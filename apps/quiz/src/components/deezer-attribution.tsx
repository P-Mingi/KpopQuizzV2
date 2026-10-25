'use client';

// Deezer attribution (Mission U part B, docs/legal/DEEZER-CHECK-2026-10.md). The Deezer
// API terms and logo guidelines ask every app that plays Deezer content to show a clearly
// visible Deezer logo, and limit the content to private use. So every screen that plays a
// Deezer preview renders this line next to its player: the logo, then the usage line.
//
// The logo file (public/brand/deezer-logo.svg) is added once the owner has approved
// fetching Deezer's official asset. Until it is in the repo the line is text only and no
// page requests the file (no 404): next.config.ts sets NEXT_PUBLIC_DEEZER_LOGO at build time
// only when the file exists. The text line carries the attribution on its own, with
// "Deezer" in it.
//
// Base layout: .dz-attr / .dz-attr-logo (globals.css). Each surface passes its own class
// for colour and spacing, in its own stylesheet and tokens.

/** Where the official Deezer logo lives once the owner adds it. */
export const DEEZER_LOGO_SRC = '/brand/deezer-logo.svg';

/** True only when the logo file was in the repo at build time (next.config.ts). */
export const deezerLogoInRepo = (): boolean => process.env.NEXT_PUBLIC_DEEZER_LOGO === '1';

export const DEEZER_LINES = {
  /** Every player a person listens to on their own screen. */
  private: 'Song previews by Deezer, for private, personal listening only.',
  /** The live room host screen: the one screen a group listens to together. */
  live: 'Song previews by Deezer. Not for public or commercial events.',
} as const;

export type DeezerAttributionVariant = keyof typeof DEEZER_LINES;

interface DeezerAttributionProps {
  variant?: DeezerAttributionVariant | undefined;
  /** The surface's own class (colour, spacing), next to the base .dz-attr. */
  className?: string | undefined;
}

export function DeezerAttribution({ variant = 'private', className }: DeezerAttributionProps): React.ReactElement {
  return (
    <p className={className ? `dz-attr ${className}` : 'dz-attr'} lang="en" data-deezer-attribution={variant}>
      {deezerLogoInRepo() ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small local brand mark, sized by CSS; next/image adds nothing here
        <img src={DEEZER_LOGO_SRC} alt="Deezer" className="dz-attr-logo" decoding="async" />
      ) : null}
      <span>{DEEZER_LINES[variant]}</span>
    </p>
  );
}
