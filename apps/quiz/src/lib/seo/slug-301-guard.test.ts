import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// SEO Mission 3, part D, point 1: "a test blocks any slug change without a 301" (rulebook 9.4).
//
// How a slug change gets its 301 in this repo (lib/seo/slug-redirects.ts):
//   - an UPDATE of quizzes.slug or groups.slug, from anywhere, is recorded by a database trigger
//     (docs/pending-migrations/seo-watch.sql) into seo_slug_redirects;
//   - a route that makes a slug disappear without an UPDATE (deleting a group whose quizzes
//     move elsewhere) records it itself with recordSlugRedirect();
//   - the pages that answer for a slug ask renamedTarget() before a 404 and answer a permanent
//     redirect to the new URL.
// This file fails when code starts writing or removing a quiz or group slug through any other
// path, when the trigger leaves the migration, or when a page stops asking before its 404.

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../../', import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** The text inside the parentheses that open at `open` (index of '('). */
function insideParens(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
}

type SlugWrite = { table: 'quizzes' | 'groups'; op: 'writes-slug' | 'deletes-row' };

/**
 * Every place a file writes a quiz or group slug (update or upsert whose payload can hold a
 * `slug` key) or deletes a group row (its URLs vanish). Conservative: a payload built in a
 * variable counts when the file assigns `slug` on it, or fills it by key from a list naming
 * 'slug'; a spread of an unknown object counts too.
 */
function slugWrites(text: string): SlugWrite[] {
  const found: SlugWrite[] = [];
  const re = /\.from\(\s*['"](quizzes|groups)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const table = m[1] as 'quizzes' | 'groups';
    const chain = text.slice(m.index, m.index + 2000).split(/;\s*\n/)[0]!;
    const op = /\.(update|upsert)\(/.exec(chain);
    if (op) {
      const payload = insideParens(chain, op.index + op[0].length - 1).trim();
      let writes = false;
      if (payload.startsWith('{') || payload.startsWith('[')) {
        writes = /(^|[{,\s])['"]?slug['"]?\s*[:,}]/.test(payload) || payload.includes('...');
      } else {
        const v = /^[A-Za-z_$][\w$]*/.exec(payload)?.[0];
        if (v) {
          const esc = v.replace(/\$/g, '\\$');
          const direct = new RegExp(`\\b${esc}\\s*(\\.slug|\\[\\s*['"]slug['"]\\s*\\])\\s*=(?!=)`).test(text);
          const byKey = new RegExp(`\\b${esc}\\s*\\[\\s*[A-Za-z_$][\\w$]*\\s*\\]\\s*=(?!=)`).test(text) && /\[[^\]]*['"]slug['"][^\]]*\]/.test(text);
          const literal = new RegExp(`\\b${esc}\\b[^=;]*=\\s*\\{[^}]*\\bslug\\b\\s*[:,}]`).test(text);
          writes = direct || byKey || literal;
        } else {
          writes = true; // an expression we cannot read: make a human look
        }
      }
      if (writes) found.push({ table, op: 'writes-slug' });
    }
    if (table === 'groups' && /\.delete\(/.test(chain)) found.push({ table, op: 'deletes-row' });
  }
  return found;
}

// Every file that writes or removes a slug, and how its 301 is guaranteed. A new file in the
// scan fails the first test until someone adds it here with a real mechanism.
const REGISTRY: Record<string, { op: SlugWrite['op']; table: SlugWrite['table']; how: 'db-trigger' | 'records-redirect' | 'empty-group-only' }> = {
  // Approving a user-submitted group may set its slug: an UPDATE, recorded by the trigger.
  'app/api/admin/group/[id]/approve/route.ts': { op: 'writes-slug', table: 'groups', how: 'db-trigger' },
  // Merging deletes the duplicate group after moving its quizzes: the route records old -> target.
  'app/api/admin/group/[id]/merge/route.ts': { op: 'deletes-row', table: 'groups', how: 'records-redirect' },
  // Deleting a group is refused while it has any quiz, so its hub never had content to link to.
  'app/api/admin/group/[id]/route.ts': { op: 'deletes-row', table: 'groups', how: 'empty-group-only' },
};

const MIGRATION = readFileSync(join(REPO, 'docs/pending-migrations/seo-watch.sql'), 'utf8');

describe('slug-301 guard: who changes a quiz or group slug', () => {
  const scan = new Map<string, SlugWrite[]>();
  for (const f of sourceFiles(SRC)) {
    const w = slugWrites(readFileSync(f, 'utf8'));
    if (w.length) scan.set(relative(SRC, f), w);
  }

  it('the files that write or remove a slug are exactly the registered ones', () => {
    expect([...scan.keys()].sort()).toEqual(Object.keys(REGISTRY).sort());
  });

  it('each registered file does what it is registered for', () => {
    for (const [file, entry] of Object.entries(REGISTRY)) {
      expect(scan.get(file), file).toContainEqual({ table: entry.table, op: entry.op });
    }
  });

  it('db-trigger: the migration records every slug UPDATE on quizzes and on groups', () => {
    const flat = MIGRATION.replace(/\s+/g, ' ');
    expect(flat).toContain('create trigger seo_slug_redirect_on_quiz after update of slug on public.quizzes for each row when (old.slug is distinct from new.slug)');
    expect(flat).toContain('create trigger seo_slug_redirect_on_group after update of slug on public.groups for each row when (old.slug is distinct from new.slug)');
    for (const entry of Object.values(REGISTRY).filter((e) => e.how === 'db-trigger')) {
      expect(flat).toContain(`after update of slug on public.${entry.table}`);
    }
  });

  it('records-redirect: the route calls recordSlugRedirect after reading both slugs', () => {
    for (const [file, entry] of Object.entries(REGISTRY).filter(([, e]) => e.how === 'records-redirect')) {
      const text = readFileSync(join(SRC, file), 'utf8');
      expect(text, file).toMatch(/recordSlugRedirect\(adminDb, 'group', sourceSlug, targetSlug\)/);
      expect(text.indexOf("select('id, slug')"), file).toBeLessThan(text.indexOf('.delete()'));
      expect(entry.table).toBe('groups');
    }
  });

  it('empty-group-only: the delete route still refuses a group that has quizzes', () => {
    for (const [file] of Object.entries(REGISTRY).filter(([, e]) => e.how === 'empty-group-only')) {
      const text = readFileSync(join(SRC, file), 'utf8');
      expect(text, file).toContain("'Move or delete the quizzes first'");
      expect(text.indexOf("from('quizzes')"), file).toBeLessThan(text.indexOf('.delete()'));
    }
  });

  it('the quiz edit routes keep the slug (no route renames a quiz)', () => {
    for (const f of ['app/api/quiz/[id]/route.ts', 'app/api/admin/quiz/[id]/route.ts']) {
      expect(scan.has(f), f).toBe(false);
    }
  });
});

describe('slug-301 guard: the scanner bites', () => {
  it('flags a literal slug update, a variable that gets a slug, a keyed fill and a spread', () => {
    expect(slugWrites(`await db.from('quizzes').update({ slug: next, title }).eq('id', id);\n`)).toEqual([{ table: 'quizzes', op: 'writes-slug' }]);
    expect(slugWrites(`const u: Record<string, unknown> = {};\nu.slug = s;\nawait db.from('groups').update(u).eq('id', 1);\n`)).toEqual([{ table: 'groups', op: 'writes-slug' }]);
    expect(slugWrites(`const allowed = ['name', 'slug'];\nfor (const k of allowed) up[k] = body[k];\nawait db.from('groups').update(up).eq('id', 1);\n`)).toEqual([{ table: 'groups', op: 'writes-slug' }]);
    expect(slugWrites(`await db.from('quizzes').update({ ...body }).eq('id', id);\n`)).toEqual([{ table: 'quizzes', op: 'writes-slug' }]);
    expect(slugWrites(`await db.from('quizzes').upsert({ id, slug }).select();\n`)).toEqual([{ table: 'quizzes', op: 'writes-slug' }]);
    expect(slugWrites(`await db.from('groups').delete().eq('id', 1);\n`)).toEqual([{ table: 'groups', op: 'deletes-row' }]);
  });

  it('ignores updates that cannot touch the slug, and reads of the slug', () => {
    expect(slugWrites(`await db.from('quizzes').update({ title, updated_at: now }).eq('id', id).select('slug, status');\n`)).toEqual([]);
    expect(slugWrites(`const update = { title };\nupdate.title = 'x';\nawait db.from('quizzes').update(update).eq('id', id).select('slug').maybeSingle();\n`)).toEqual([]);
    expect(slugWrites(`await db.from('groups').select('slug').eq('id', 1);\n`)).toEqual([]);
    expect(slugWrites(`await db.from('quizzes').delete().eq('id', 1);\n`)).toEqual([]);
  });
});

describe('slug-301 guard: the pages answer a permanent redirect before their 404', () => {
  const read = (p: string): string => readFileSync(join(SRC, p), 'utf8');

  it('/q/<slug> asks for a renamed quiz before notFound', () => {
    const t = read('app/(site)/q/[slug]/page.tsx');
    expect(t).toContain("from '@/lib/seo/slug-redirects'");
    expect(t).toMatch(/await redirectIfRenamed\('quiz', slug, renamedPath\.quiz\);\s*notFound\(\);/);
  });

  it('/<group>-quiz and /<group>-trivia ask for a renamed group in the metadata and in the page', () => {
    const t = read('app/(site)/[slug]/page.tsx');
    expect(t.match(/await redirectIfRenamed\('group', parsed\.groupSlug, renamedFamily\(parsed\.type\)\);/g)).toHaveLength(2);
  });

  it('/blindtest/group-<slug> asks for a renamed group in the metadata and in the page', () => {
    const t = read('app/(site)/blindtest/[mode]/page.tsx');
    expect(t.match(/await redirectIfRenamed\('group', [^,]+, renamedPath\.groupBlindtest\);\s*notFound\(\);/g)).toHaveLength(2);
  });
});

// The serving side, run for real with the database read and Next's redirect mocked.
const navigation = vi.hoisted(() => ({ permanentRedirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT ${url}`); }) }));
const table = vi.hoisted(() => ({ rows: new Map<string, string>(), fail: false }));
vi.mock('next/navigation', () => navigation);
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({
    from: () => {
      const filters: Record<string, string> = {};
      const q = {
        select: () => q,
        eq: (col: string, val: string) => { filters[col] = val; return q; },
        maybeSingle: async () => {
          if (table.fail) return { data: null, error: { code: '42P01', message: 'relation "seo_slug_redirects" does not exist' } };
          const next = table.rows.get(`${filters.kind}:${filters.old_slug}`);
          return { data: next ? { new_slug: next } : null, error: null };
        },
      };
      return q;
    },
  }),
}));

describe('slug-301 guard: renamed URLs redirect, everything else 404s as before', () => {
  beforeEach(() => {
    navigation.permanentRedirect.mockClear();
    table.rows = new Map([['quiz:bts-hard', 'bts-hard-v2'], ['group:old-dup', 'bts'], ['quiz:loop', 'loop']]);
    table.fail = false;
  });

  it('an old quiz slug answers a permanent redirect to /q/<new>', async () => {
    const { redirectIfRenamed, renamedPath } = await import('./slug-redirects');
    await expect(redirectIfRenamed('quiz', 'bts-hard', renamedPath.quiz)).rejects.toThrow('NEXT_REDIRECT /q/bts-hard-v2');
    expect(navigation.permanentRedirect).toHaveBeenCalledWith('/q/bts-hard-v2');
  });

  it('an old group slug redirects each page family to the same family', async () => {
    const { redirectIfRenamed, renamedPath } = await import('./slug-redirects');
    await expect(redirectIfRenamed('group', 'old-dup', renamedPath.groupHub)).rejects.toThrow('NEXT_REDIRECT /bts-quiz');
    await expect(redirectIfRenamed('group', 'old-dup', renamedPath.groupTrivia)).rejects.toThrow('NEXT_REDIRECT /bts-trivia');
    await expect(redirectIfRenamed('group', 'old-dup', renamedPath.groupBlindtest)).rejects.toThrow('NEXT_REDIRECT /blindtest/group-bts');
  });

  it('an unknown slug, a self loop, a junk slug or a missing table: no redirect, the page 404s', async () => {
    const { redirectIfRenamed, renamedPath } = await import('./slug-redirects');
    await expect(redirectIfRenamed('quiz', 'never-existed', renamedPath.quiz)).resolves.toBeUndefined();
    await expect(redirectIfRenamed('quiz', 'loop', renamedPath.quiz)).resolves.toBeUndefined();
    await expect(redirectIfRenamed('quiz', '../etc', renamedPath.quiz)).resolves.toBeUndefined();
    await expect(redirectIfRenamed('group', 'bts-hard', renamedPath.groupHub)).resolves.toBeUndefined(); // kinds stay apart
    table.fail = true;
    await expect(redirectIfRenamed('quiz', 'bts-hard-2', renamedPath.quiz)).resolves.toBeUndefined();
    expect(navigation.permanentRedirect).not.toHaveBeenCalled();
  });

  it('a slow read gives up and lets the page 404', async () => {
    const { lookupRenamed } = await import('./slug-redirects');
    const never = (): Promise<null> => new Promise(() => undefined);
    await expect(lookupRenamed('quiz', 'bts-hard', never, 20)).resolves.toBeNull();
  });

  it('targetOf refuses unusable rows', async () => {
    const { targetOf } = await import('./slug-redirects');
    expect(targetOf('a', { new_slug: 'b' })).toBe('b');
    expect(targetOf('a', { new_slug: 'a' })).toBeNull();
    expect(targetOf('a', { new_slug: 'B C' })).toBeNull();
    expect(targetOf('a', { new_slug: 42 })).toBeNull();
    expect(targetOf('a', null)).toBeNull();
  });

  it('recordSlugRedirect calls the migration function and fails soft', async () => {
    const { recordSlugRedirect } = await import('./slug-redirects');
    const rpc = vi.fn(async () => ({ error: null }));
    expect(await recordSlugRedirect({ rpc } as never, 'group', 'old-dup', 'bts')).toBe(true);
    expect(rpc).toHaveBeenCalledWith('seo_record_slug_redirect', { p_kind: 'group', p_old: 'old-dup', p_new: 'bts' });
    const missing = vi.fn(async () => ({ error: { message: 'Could not find the function' } }));
    expect(await recordSlugRedirect({ rpc: missing } as never, 'group', 'a', 'b')).toBe(false);
    expect(await recordSlugRedirect({ rpc } as never, 'group', 'same', 'same')).toBe(false);
  });
});
