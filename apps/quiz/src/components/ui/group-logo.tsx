import Image from 'next/image';

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

  if (logoUrl) {
    return (
      <div
        className="overflow-hidden flex-shrink-0 border border-border-light"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <Image
          src={logoUrl}
          alt={`${groupName} logo`}
          width={size}
          height={size}
          sizes={`${size}px`}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center flex-shrink-0 border border-border-light"
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
