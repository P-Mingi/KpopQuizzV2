// V-PIN-Q: per-question Pinterest cards. Reuses the house rendering path
// (next/og ImageResponse at 1000x1500, DM Sans from public/fonts, mascot PNGs as
// data-URIs = legal imagery, group color) and the export-csv Pinterest schema.
//
// LOCKED: the answer appears NOWHERE. A pin carries the question + its options
// only; `correct` and `fun_fact` are never passed into this module. NO em dashes
// in any generated copy. Every div sets display:flex (Satori requirement).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { ImageResponse } from '@vercel/og';

export const W = 1000;
export const H = 1500;

// ---- fonts + assets (house pattern from generate-brand-pins) ----
export type Fonts = Array<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: 'normal' }>;

export function loadFonts(): Fonts {
  const dir = join(process.cwd(), 'public', 'fonts');
  const at = (w: string) => join(dir, `dm-sans-${w}.ttf`);
  if (!existsSync(at('400'))) throw new Error('DM Sans TTF missing at public/fonts/dm-sans-400.ttf');
  return [
    { name: 'DM', data: readFileSync(at('400')).buffer as ArrayBuffer, weight: 400, style: 'normal' },
    { name: 'DM', data: readFileSync(at('700')).buffer as ArrayBuffer, weight: 700, style: 'normal' },
    { name: 'DM', data: readFileSync(at('800')).buffer as ArrayBuffer, weight: 800, style: 'normal' },
  ];
}

export function loadMascotUri(name: 'mascot-default' | 'mascot-celebrate' | 'mascot-think'): string {
  const p = join(process.cwd(), 'public', 'mascot', `${name}.png`);
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
}

const FF = 'DM, sans-serif';
const PINK = '#E8457A';
const CREAM = '#FAF8F5';
const DARK = '#1A1816';
const GRAY = '#9B8B86';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ---- color helpers (from EditorialTemplate) ----
function safeHex(hex: string | null | undefined): string {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : PINK;
}
/** A vibrancy floor: group display colors vary wildly (some near-white, some
 * desaturated gray). A washed accent makes an ugly, low-contrast pin, so a pale
 * or grayish color falls back to the brand pink. Keeps every pin punchy and
 * legible, the same contrast-floor lesson as the Verse ink work. */
function brandAccent(hex: string | null | undefined): string {
  const c = safeHex(hex);
  const r = parseInt(c.slice(1, 3), 16) / 255, g = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const sat = max === min ? 0 : (light > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
  if (light > 0.72 || sat < 0.32) return PINK; // too pale or too gray -> brand pink
  return c;
}
function darken(hex: string, f: number): string {
  const c = safeHex(hex);
  const r = Math.round(parseInt(c.slice(1, 3), 16) * f);
  const g = Math.round(parseInt(c.slice(3, 5), 16) * f);
  const b = Math.round(parseInt(c.slice(5, 7), 16) * f);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function themedGradient(hex: string): string {
  const c = safeHex(hex);
  return `linear-gradient(158deg, ${c} 0%, ${darken(c, 0.5)} 55%, ${darken(c, 0.18)} 100%)`;
}

// ---- text helpers ----
function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
function questionFont(q: string): number {
  const l = q.length;
  return l <= 45 ? 66 : l <= 80 ? 56 : l <= 120 ? 46 : 40;
}

// ---- the normalized pin shape (NO answer field, by design) ----
export interface QuestionPin {
  group: string;
  themeColor: string;
  question: string;
  kind: 'options' | 'truefalse';
  options?: string[]; // every option, shuffled or not - the answer is not marked
  clues?: string[];   // guess_from_clues only
}

function BrandFooter({ onDark }: { onDark: boolean }) {
  return (
    <div style={{ display: 'flex', position: 'absolute', bottom: 40, left: 64, flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ display: 'flex', fontSize: 38, fontWeight: 800, color: onDark ? CREAM : DARK }}>kpop</div>
        <div style={{ display: 'flex', fontSize: 38, fontWeight: 800, color: PINK }}>quiz</div>
      </div>
      <div style={{ display: 'flex', fontSize: 17, color: onDark ? '#6B5F5C' : GRAY }}>Play free at kpopquiz.org</div>
    </div>
  );
}

function Kicker({ group, bg, fg }: { group: string; bg: string; fg: string }) {
  const label = group ? `${group.toUpperCase()} QUIZ` : 'K-POP QUIZ';
  return (
    <div style={{ display: 'flex', alignSelf: 'flex-start', height: 54, paddingLeft: 26, paddingRight: 26, borderRadius: 27, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', fontSize: 24, fontWeight: 800, letterSpacing: 2, color: fg }}>{label}</div>
    </div>
  );
}

function TrueFalseBlock({ light }: { light: boolean }) {
  const border = light ? 'rgba(255,255,255,0.55)' : '#E0DBD6';
  const txt = light ? CREAM : DARK;
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 44 }}>
      {['TRUE', 'FALSE'].map((t) => (
        <div key={t} style={{ display: 'flex', flex: 1, height: 118, borderRadius: 24, border: `4px solid ${border}`, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: txt }}>{t}</div>
        </div>
      ))}
    </div>
  );
}

function ClueList({ clues, color }: { clues: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22 }}>
      {clues.slice(0, 3).map((c, i) => (
        <div key={i} style={{ display: 'flex', fontSize: 28, color, lineHeight: 1.25 }}>{`Clue ${i + 1}: ${c}`}</div>
      ))}
    </div>
  );
}

// ---- Template 1: BOLD (cream, pill options) ----
function BoldCard({ pin, mascotUri }: { pin: QuestionPin; mascotUri: string }) {
  const accent = brandAccent(pin.themeColor);
  const qLines = wrap(pin.question, 26);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: CREAM, position: 'relative', fontFamily: FF }}>
      <div style={{ display: 'flex', width: W, height: 16, backgroundColor: accent }} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 64px 0', flex: 1 }}>
        <Kicker group={pin.group} bg={accent} fg="#ffffff" />
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          {qLines.map((l, i) => (
            <div key={i} style={{ display: 'flex', fontSize: questionFont(pin.question), fontWeight: 800, color: DARK, lineHeight: 1.15 }}>{l}</div>
          ))}
        </div>
        {pin.clues && pin.clues.length ? <ClueList clues={pin.clues} color={GRAY} /> : null}
        {pin.kind === 'truefalse' ? (
          <TrueFalseBlock light={false} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
            {(pin.options ?? []).slice(0, 4).map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 96, borderRadius: 22, backgroundColor: '#ffffff', border: '2px solid #ECE6E1', paddingLeft: 22, paddingRight: 22 }}>
                <div style={{ display: 'flex', width: 52, height: 52, borderRadius: 26, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, color: '#ffffff' }}>{LETTERS[i]}</div>
                </div>
                <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: DARK }}>{o.length > 30 ? o.slice(0, 29) + '…' : o}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mascotUri} alt="" width={230} height={230} style={{ position: 'absolute', right: 44, bottom: 150, objectFit: 'contain' }} />
      <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, width: W, height: 116, backgroundColor: '#F0EDE8' }} />
      <BrandFooter onDark={false} />
    </div>
  );
}

// ---- Template 2: EDITORIAL (group-color gradient, outlined options) ----
function EditorialCard({ pin }: { pin: QuestionPin }) {
  const accent = brandAccent(pin.themeColor);
  const qLines = wrap(pin.question, 24);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, position: 'relative', fontFamily: FF, background: themedGradient(accent) }}>
      <div style={{ display: 'flex', position: 'absolute', top: -160, left: -160, width: 640, height: 640, borderRadius: 320, background: `radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 64px 0', flex: 1 }}>
        <Kicker group={pin.group} bg="rgba(255,255,255,0.16)" fg="#ffffff" />
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 44 }}>Can you get this right?</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
          {qLines.map((l, i) => (
            <div key={i} style={{ display: 'flex', fontSize: questionFont(pin.question), fontWeight: 800, color: '#ffffff', lineHeight: 1.16 }}>{l}</div>
          ))}
        </div>
        {pin.clues && pin.clues.length ? <ClueList clues={pin.clues} color="rgba(255,255,255,0.82)" /> : null}
        {pin.kind === 'truefalse' ? (
          <TrueFalseBlock light={true} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
            {(pin.options ?? []).slice(0, 4).map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, height: 90, borderRadius: 20, border: '2px solid rgba(255,255,255,0.5)', paddingLeft: 22, paddingRight: 22 }}>
                <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,0.85)', width: 40 }}>{LETTERS[i]}</div>
                <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#ffffff' }}>{o.length > 30 ? o.slice(0, 29) + '…' : o}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, width: W, height: 116, background: 'rgba(0,0,0,0.28)' }} />
      <BrandFooter onDark={true} />
    </div>
  );
}

// ---- Template 3: SPOTLIGHT (dark, numbered options, mascot) ----
function SpotlightCard({ pin, mascotUri }: { pin: QuestionPin; mascotUri: string }) {
  const accent = brandAccent(pin.themeColor);
  const qLines = wrap(pin.question, 24);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: DARK, position: 'relative', fontFamily: FF }}>
      <div style={{ display: 'flex', width: W, height: 16, backgroundColor: accent }} />
      <div style={{ display: 'flex', position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: 180, background: `radial-gradient(circle, ${accent}55, transparent 70%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 64px 0', flex: 1 }}>
        <Kicker group={pin.group} bg={accent} fg="#ffffff" />
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 42 }}>
          {qLines.map((l, i) => (
            <div key={i} style={{ display: 'flex', fontSize: questionFont(pin.question), fontWeight: 800, color: CREAM, lineHeight: 1.16 }}>{l}</div>
          ))}
        </div>
        {pin.clues && pin.clues.length ? <ClueList clues={pin.clues} color="#B8AEAA" /> : null}
        {pin.kind === 'truefalse' ? (
          <TrueFalseBlock light={true} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
            {(pin.options ?? []).slice(0, 4).map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, height: 92, borderRadius: 20, backgroundColor: '#262220', paddingLeft: 22, paddingRight: 22 }}>
                <div style={{ display: 'flex', width: 48, height: 48, borderRadius: 12, border: `3px solid ${accent}`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: accent }}>{i + 1}</div>
                </div>
                <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: CREAM }}>{o.length > 30 ? o.slice(0, 29) + '…' : o}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mascotUri} alt="" width={210} height={210} style={{ position: 'absolute', right: 40, bottom: 150, objectFit: 'contain' }} />
      <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, width: W, height: 116, backgroundColor: '#221E1C' }} />
      <BrandFooter onDark={true} />
    </div>
  );
}

export const TEMPLATE_NAMES = ['bold', 'editorial', 'spotlight'] as const;
export type TemplateName = typeof TEMPLATE_NAMES[number];

/** Render one question pin. `variant` (0..2) rotates the layout for Pinterest
 * anti-duplication. Mascot rotates too so cards of the same layout differ. */
export function renderQuestionElement(pin: QuestionPin, variant: number, mascotUri: string): React.ReactElement {
  const v = ((variant % 3) + 3) % 3;
  if (v === 0) return <BoldCard pin={pin} mascotUri={mascotUri} />;
  if (v === 1) return <EditorialCard pin={pin} />;
  return <SpotlightCard pin={pin} mascotUri={mascotUri} />;
}

export async function questionPinToPng(pin: QuestionPin, variant: number, mascotUri: string, fonts: Fonts): Promise<Buffer> {
  const ir = new ImageResponse(renderQuestionElement(pin, variant, mascotUri), { width: W, height: H, fonts });
  return Buffer.from(await ir.arrayBuffer());
}
