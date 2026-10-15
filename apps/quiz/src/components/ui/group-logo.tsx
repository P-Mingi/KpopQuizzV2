'use client';

import Image from 'next/image';
import { useState } from 'react';

import { isConfiguredImageHost } from '@/lib/image-hosts';

interface GroupLogoProps {
  groupName: string;
  logoUrl: string | null;
  displayColor: string;
  textColor: string;
  size?: number;
}

const ABBREVIATIONS: Record<string, string> = {
  'BTS': 'BTS',
  'BLACKPINK': 'BP',
  'Stray Kids': 'SKZ',
  'TWICE': 'TW',
  'aespa': 'ae',
  'NewJeans': 'NJ',
  'SEVENTEEN': 'SVT',
  'EXO': 'EXO',
  '(G)I-DLE': 'IDLE',
  'IVE': 'IVE',
  'LE SSERAFIM': 'LSF',
  'NCT': 'NCT',
  'Red Velvet': 'RV',
  'ATEEZ': 'ATZ',
  'ENHYPEN': 'ENH',
  'TXT': 'TXT',
  'ITZY': 'ITZY',
  'NMIXX': 'NMX',
  'STAYC': 'STC',
  'MONSTA X': 'MX',
  'GOT7': 'GOT7',
  'MAMAMOO': 'MMM',
  'SHINee': 'SHN',
  'TREASURE': 'TRSR',
  'General K-pop': 'K',
};

function getAbbreviation(name: string): string {
  const abbr = ABBREVIATIONS[name];
  if (abbr) return abbr;
  return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
}

/** Inline SVG logos for groups. Rendered directly - no network request needed. */
function InlineLogo({ groupName, size }: { groupName: string; size: number }): React.ReactElement | null {
  if (groupName === 'BLACKPINK') {
    const s = size;
    const bw = s * 0.68;   // box width
    const bh = s * 0.22;   // box height
    const bx = (s - bw) / 2;
    const by = (s - bh) / 2;
    const fs = s * 0.135;
    const sw = Math.max(1, s * 0.012);
    return (
      // display:block + 100% fill so the pink covers the WHOLE container edge to
      // edge: an inline SVG sits on the text baseline (a descender gap left a white
      // strip under the coin), and a fixed s-px SVG under-filled the 68px desktop
      // coin (.home-group-coin forces the child to 100%). viewBox keeps the internal
      // geometry; the square container means no letterboxing.
      <svg viewBox={`0 0 ${s} ${s}`} style={{ display: 'block', width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
        {/* Owner-validated look (2026-09-20): brand pink coin, white wordmark, so it
            sits with the other circles instead of reading as a heavy black blob. */}
        <rect width={s} height={s} fill="#F06292" />
        <rect x={bx} y={by} width={bw} height={bh} rx={1} fill="none" stroke="#FFFFFF" strokeWidth={sw} />
        <text
          x={s / 2}
          y={s / 2 + fs * 0.36}
          textAnchor="middle"
          fontFamily="Arial Black, Impact, Arial, sans-serif"
          fontWeight="900"
          fontSize={fs}
          letterSpacing={fs * 0.1}
          fill="#FFFFFF"
        >
          BLACKPINK
        </text>
      </svg>
    );
  }
  return null;
}

export function GroupLogo({ groupName, logoUrl, displayColor, textColor, size = 52 }: GroupLogoProps): React.ReactElement {
  const radius = Math.round(size * 0.19);
  const [imgError, setImgError] = useState(false);

  // 1. Check for hardcoded inline logos first (most reliable)
  const inlineLogo = InlineLogo({ groupName, size });
  if (inlineLogo) {
    return (
      <div
        className="overflow-hidden flex-shrink-0 border border-default"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {inlineLogo}
      </div>
    );
  }

  // 2. Try database logo_url. The host check is load-bearing: next/image throws
  // at render time for a hostname missing from remotePatterns, which onError
  // below cannot catch, so one bad logo row would blow up the whole page. An
  // unknown host degrades to the initials tile instead.
  if (logoUrl && !imgError && isConfiguredImageHost(logoUrl)) {
    return (
      <div
        className="overflow-hidden flex-shrink-0 border border-default"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={logoUrl}
          alt={`${groupName} logo`}
          width={size}
          height={size}
          sizes={`${size}px`}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
          unoptimized={logoUrl.endsWith('.svg')}
        />
      </div>
    );
  }

  // 3. Fallback: initials
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 border border-default"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: displayColor,
      }}
    >
      <span
        className="font-medium"
        style={{
          fontSize: Math.round(size * 0.28),
          color: textColor,
          letterSpacing: '0.02em',
        }}
      >
        {getAbbreviation(groupName)}
      </span>
    </div>
  );
}
