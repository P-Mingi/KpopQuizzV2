'use client';

import Image from 'next/image';
import { useState } from 'react';

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

export function GroupLogo({ groupName, logoUrl, displayColor, textColor, size = 52 }: GroupLogoProps): React.ReactElement {
  const radius = Math.round(size * 0.19);
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    const isSvg = logoUrl.endsWith('.svg');
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
          unoptimized={isSvg}
        />
      </div>
    );
  }

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
