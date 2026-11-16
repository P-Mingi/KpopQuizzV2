// Bunnyverse Cards: Supabase loads the extension safeupdate for the API's sessions (PostgREST): a DELETE or an UPDATE without a WHERE
// clause is refused there ("DELETE requires a WHERE clause"), also inside a function the API calls, while the SQL Editor has no such
// guard (integrator, 2026-11-17: "Reconstruire le catalogue" answered 400 in production, cards_build_catalog() ran "delete from
// public.cards_catalog;"). This finds such statements in a function body, for safeupdate.test.ts. Pure: text in, findings out.
//
// What counts, as safeupdate reads it: an UPDATE or a DELETE statement whose own WHERE is missing (WHERE true passes). A WHERE inside a
// subquery of that statement does not count. Not a write: SELECT ... FOR UPDATE, INSERT ... ON CONFLICT DO UPDATE (an INSERT), ON UPDATE
// of a constraint. A statement run through EXECUTE is text: the string literal EXECUTE runs (directly or through format) is scanned too.

export interface Unguarded { kind: 'delete' | 'update'; statement: string }

/** The body without comments, with each string literal replaced by a placeholder; the strings that EXECUTE runs are returned apart. */
function strip(src: string): { code: string; strings: string[] } {
  let code = '';
  const strings: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];
    if (c === '-' && n === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; code += ' '; continue; }
    if (c === "'") {
      let j = i + 1;
      let s = '';
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") { s += "'"; j += 2; continue; }
        if (src[j] === "'") break;
        s += src[j]; j++;
      }
      if (executed(code)) strings.push(s);
      code += ` '' `;
      i = j + 1;
      continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(src.slice(i));
      if (m) {
        const tag = m[0];
        const e = src.indexOf(tag, i + tag.length);
        const inner = src.slice(i + tag.length, e < 0 ? src.length : e);
        if (executed(code)) strings.push(inner);
        code += ` '' `;
        i = e < 0 ? src.length : e + tag.length;
        continue;
      }
    }
    code += c;
    i++;
  }
  return { code, strings };
}

/** True when the string that follows this code is run by EXECUTE (execute '...', execute format('...', ...)). */
const executed = (code: string): boolean => /\bexecute\s*(format\s*\(\s*)?$/i.test(code.slice(-60));

/** The statements of a body (split on the semicolons outside strings), lower case, spaces collapsed. */
const statements = (code: string): string[] => code.split(';').map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);

/** True when the statement, from `start`, has a WHERE at its own level (not inside parentheses opened after `start`). */
function ownWhere(st: string, start: number): boolean {
  let depth = 0;
  for (let i = start; i < st.length; i++) {
    const c = st[i];
    if (c === '(') depth++;
    else if (c === ')') { if (depth === 0) return false; depth--; }
    else if (depth === 0 && /\bwhere\b/y.test(st.slice(i, i + 6)) && (i === 0 || /[^a-z0-9_]/.test(st[i - 1]!))) return true;
  }
  return false;
}

function scanCode(code: string): Unguarded[] {
  const out: Unguarded[] = [];
  for (const st of statements(code)) {
    for (const m of st.matchAll(/(?<![a-z0-9_])delete\s+from\s/g)) {
      if (!ownWhere(st, m.index!)) out.push({ kind: 'delete', statement: st });
    }
    for (const m of st.matchAll(/(?<![a-z0-9_])update\s+(only\s+)?[a-z0-9_."]+(\s+(as\s+)?[a-z0-9_]+)?\s+set\s/g)) {
      const before = st.slice(Math.max(0, m.index! - 20), m.index!);
      if (/\bdo\s*$/.test(before)) continue; // insert ... on conflict do update set: an INSERT for safeupdate
      if (!ownWhere(st, m.index!)) out.push({ kind: 'update', statement: st });
    }
  }
  return out;
}

/** Every UPDATE or DELETE without its own WHERE in a function body, the dynamic statements of its string literals included. */
export function unguardedWrites(body: string): Unguarded[] {
  const { code, strings } = strip(body);
  const found = scanCode(code);
  for (const s of strings) {
    const t = s.trim().toLowerCase();
    if (/^(delete\s+from|update)\s/.test(t)) found.push(...scanCode(s));
  }
  return found;
}
