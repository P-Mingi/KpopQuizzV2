// UX v12 feature flag (V12 run rule 5). Everything v12 ships behind
// NEXT_PUBLIC_UX_V12 (default off) and only on top of the v11 redesign: the flag
// is true only when NEXT_PUBLIC_UX_V1 is on too. Flag off = today's v11 code
// paths, byte for byte: a v12 page, API route or cron answers 404 or does nothing
// unless isUxV12(). NEXT_PUBLIC_* is inlined at build time, so the server and the
// client read the same value.
//
// Enable per environment in Vercel (or `.env.local` for dev), with v11 on:
//   NEXT_PUBLIC_UX_V1=1
//   NEXT_PUBLIC_UX_V12=1
import { UX_V1 } from './ux-v1';

const on = (v: string | undefined): boolean => v === '1' || v === 'true';

/** The rule itself, for tests: v12 needs its own switch AND the v11 one. */
export function uxV12From(v1: boolean, v12: string | undefined): boolean {
  return v1 && on(v12);
}

export function isUxV12(): boolean {
  return uxV12From(UX_V1, process.env.NEXT_PUBLIC_UX_V12);
}
