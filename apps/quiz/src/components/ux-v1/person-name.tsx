import Link from 'next/link';

import { isValidNameAccent, isValidNameFont, NAME_ACCENTS, NAME_FONTS } from '@/lib/passport-flair';

import { Icon } from './icon';

/** Identity flair as stored on profiles (DESIGN-SPEC 17.8). Pass the raw columns;
 *  unknown keys fall back to default (validated against lib/passport-flair.ts). */
export interface PersonFlair {
  /** Display name or username, exactly as the surface shows it today. */
  name: string;
  /** profiles.name_accent: default | pink | purple | blue | teal | amber | coral. */
  accent?: string | null | undefined;
  /** profiles.name_font: default | serif | mono. */
  font?: string | null | undefined;
  /** profiles.bias: free text, max 40. */
  bias?: string | null | undefined;
}

function accentColor(accent: string | null | undefined): string | undefined {
  if (!accent || accent === 'default' || !isValidNameAccent(accent)) return undefined; // inherits ink
  return NAME_ACCENTS[accent]?.color;
}

function fontFamily(font: string | null | undefined): string | undefined {
  if (!font || font === 'default' || !isValidNameFont(font)) return undefined;
  return NAME_FONTS[font]?.family;
}

/** Bias tag chip (17.8): heart + text, outlined in the accent colour (muted when
 *  the accent is default). Renders nothing for an empty bias. */
export function BiasTag({ bias, accent }: { bias?: string | null | undefined; accent?: string | null | undefined }): React.ReactElement | null {
  const text = (bias ?? '').trim().slice(0, 40);
  if (!text) return null;
  return (
    <span className="ux-bias" style={{ color: accentColor(accent) ?? 'var(--ux-muted)' }}>
      <Icon name="heart" />{text}
    </span>
  );
}

interface PersonNameProps extends PersonFlair {
  /** Profile link (/u/{username}); plain text when absent. */
  href?: string | undefined;
  /** Hide the bias chip (tight rows). Default shown. */
  showBias?: boolean | undefined;
  className?: string | undefined;
}

/**
 * A person's name with their identity flair, everywhere a person is named (posts,
 * comments, hall of fame, happening now, leaderboard, passport): accent colour +
 * font from profiles.name_accent / name_font (lib/passport-flair.ts), followed by
 * the BiasTag. Server-safe. Private data never reaches here: pass only what
 * /u/[username] already shows.
 */
export function PersonName({ name, accent, font, bias, href, showBias = true, className }: PersonNameProps): React.ReactElement {
  const style: React.CSSProperties = {};
  const c = accentColor(accent);
  const f = fontFamily(font);
  if (c) style.color = c;
  if (f) style.fontFamily = f;
  const cls = ['ux-who', className ?? ''].filter(Boolean).join(' ');
  return (
    <>
      {href
        ? <Link href={href} className={cls} style={style}>{name}</Link>
        : <b className={cls} style={style}>{name}</b>}
      {showBias ? <BiasTag bias={bias} accent={accent} /> : null}
    </>
  );
}
