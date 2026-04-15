// Normalize input for matching: lowercase, trim, remove special chars
export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

// Check if input matches any member. Returns the matched member or null.
import type { NameAllMember } from '@/lib/db/types';

export function findMatch(input: string, members: NameAllMember[], alreadyFound: Set<string>): NameAllMember | null {
  const clean = normalize(input);
  if (clean.length < 2) return null;

  for (const member of members) {
    if (alreadyFound.has(member.name)) continue;
    const allNames = [member.name, ...member.aliases].map(normalize);
    if (allNames.some(name => name === clean)) return member;
  }
  return null;
}

// Get initials from a name (first 2 chars uppercase)
export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// Format seconds as m:ss
export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Score label (bilingual)
export function getScoreLabel(found: number, total: number): { label: string; stars: number } {
  if (found === total) return { label: 'PERFECT!', stars: 5 };
  const pct = found / total;
  if (pct >= 0.8) return { label: 'SO CLOSE!', stars: 4 };
  if (pct >= 0.5) return { label: 'Great round!', stars: 3 };
  if (pct >= 0.3) return { label: 'Not bad!', stars: 2 };
  return { label: 'Try again!', stars: 1 };
}

// Spawn particles from a DOM element
export function spawnParticles(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#D4537E', '#0F6E56', '#BA7517', '#7F77DD', '#378ADD'];

  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    Object.assign(p.style, {
      position: 'fixed', width: '6px', height: '6px', borderRadius: '50%',
      left: cx + 'px', top: cy + 'px', background: colors[i % 5],
      pointerEvents: 'none', zIndex: '50',
    });
    document.body.appendChild(p);
    const angle = (Math.PI * 2 / 6) * i;
    const dist = 30 + Math.random() * 20;
    p.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`, opacity: '0' },
    ], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
    setTimeout(() => p.remove(), 500);
  }
}
