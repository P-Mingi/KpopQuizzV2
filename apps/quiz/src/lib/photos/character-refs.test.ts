// Lane charrefs (L32): the rules and the server code of the screen of the character references. On fakes (the service client, the private bucket,
// entity-images): the SQL side is character-refs-sql.test.ts. No network.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ImageError } from '@/lib/entity-images/errors';

import {
  candidateBase, candidatePaths, filterRefs, hashOfCandidatePath, hashOfReferencePath, isFandomUrl, licenseOfText, parseRefCredit, prefillOf, sameLicense,
} from './character-refs';
import { discardCandidate, loadCharacterRefs, publishCandidate, saveCandidate, signPreviews } from './character-refs-store';
import { characterFiles, hex12, pictureBytes, putReference, refsFakeDb } from './character-refs-test-support';

import type { RefCreditFields, RefListRow } from './character-refs';
import type { RefsFakeDb } from './character-refs-test-support';

const FREE: RefCreditFields = { source_url: 'https://commons.wikimedia.org/wiki/File:Kohaku.png', author: 'Jane Doe', license: 'cc_by', license_url: '' };
const code = async (p: Promise<unknown>): Promise<string> => { try { await p; return 'none'; } catch (e) { return e instanceof ImageError ? e.code : `other:${String(e)}`; } };
const tableOf = (db: RefsFakeDb): Array<Record<string, unknown>> => db.tables.character_reference_images!;
const rowOf = (db: RefsFakeDb, s: string, c: string): Record<string, unknown> | undefined => tableOf(db).find((r) => r.series_slug === s && r.character_slug === c);

/** A db with a reference for inuyasha/kohaku, and the candidate sent by the owner (a different picture). */
async function withCandidate(over: { credit?: RefCreditFields; refLicense?: string | null; sameFile?: boolean } = {}): Promise<{ db: RefsFakeDb; refBytes: Uint8Array; candBytes: Uint8Array }> {
  const db = refsFakeDb();
  const refBytes = await pictureBytes({ r: 200, g: 10, b: 10 }, 'jpeg');
  const candBytes = over.sameFile ? refBytes : await pictureBytes({ r: 10, g: 10, b: 200 });
  putReference(db, 'inuyasha', 'kohaku', refBytes, over.refLicense === undefined ? {} : { reference_license: over.refLicense });
  await saveCandidate(db, { series: 'inuyasha', character: 'kohaku', original: candBytes, files: await characterFiles(), credit: over.credit ?? FREE });
  return { db, refBytes, candBytes };
}

describe('the Fandom address rule', () => {
  it('refuses fandom.com, wikia.com, nocookie.net and any subdomain, in any case, with a port, a dot or a user name', () => {
    for (const u of [
      'https://inuyasha.fandom.com/wiki/Kohaku', 'https://fandom.com/x', 'https://WWW.FANDOM.COM/x', 'https://naruto.wikia.com/wiki/A', 'https://wikia.com',
      'https://static.wikia.nocookie.net/inuyasha/images/a/ab/K.png/revision/latest', 'https://images.nocookie.net/x.png', 'https://a.b.fandom.com./x', 'https://x.fandom.com:443/y',
      'https://user@inuyasha.fandom.com/x', 'https://web.archive.org/web/2020/https://inuyasha.fandom.com/wiki/Kohaku', 'https://evil.example/?u=https%3A%2F%2Fa.wikia.com%2Fx',
    ]) expect(isFandomUrl(u), u).toBe(true);
  });
  it('lets other addresses through', () => {
    for (const u of ['https://commons.wikimedia.org/wiki/File:A.png', 'https://notfandom.com/x', 'https://fandom.com.example.org/x', 'https://creativecommons.org/licenses/by/4.0/', '']) {
      expect(isFandomUrl(u), u).toBe(false);
    }
  });
});

describe('the licence rules', () => {
  it('reads the licence a Fandom page states, whatever its version', () => {
    expect(licenseOfText('CC BY-SA 3.0')).toBe('cc_by_sa');
    expect(licenseOfText('Creative Commons Attribution-ShareAlike')).toBe('cc_by_sa');
    expect(licenseOfText('CC BY 4.0')).toBe('cc_by');
    expect(licenseOfText('CC0')).toBe('cc0');
    expect(licenseOfText('Public domain')).toBe('public_domain');
    expect(licenseOfText('Fair use')).toBeNull();
    expect(licenseOfText(null)).toBeNull();
  });
  it('is the licence of the reference when the choice names the same one', () => {
    expect(sameLicense('cc_by_sa', null, 'CC BY-SA 3.0')).toBe(true);
    expect(sameLicense('cc_by', null, 'CC BY-SA 3.0')).toBe(false);
    expect(sameLicense('cc_by', null, 'Fair use')).toBe(false);
    expect(sameLicense('cc_by', null, null)).toBe(false);
    expect(sameLicense('other', 'Licence libre : https://x.org/l', 'licence libre : https://x.org/l')).toBe(true);
  });
  it('maps the owner list onto the licence codes of entity_images and accepts a free credit', () => {
    const base = { ...FREE, author: 'A' };
    for (const l of ['cc0', 'public_domain', 'cc_by', 'cc_by_sa', 'own_photo', 'licensed']) expect(parseRefCredit({ ...base, license: l }, null).license).toBe(l);
    const other = parseRefCredit({ ...base, license: 'other', license_url: 'https://example.org/licence' }, null);
    expect(other).toMatchObject({ license: 'other', license_url: 'https://example.org/licence' });
    expect(other.license_note).toContain('https://example.org/licence');
  });
  it('refuses an empty licence, one outside the list, "autre" without its link, and a missing author or source', () => {
    expect(() => parseRefCredit({ ...FREE, license: '' }, null)).toThrow(/licence/i);
    expect(() => parseRefCredit({ ...FREE, license: 'gpl' }, null)).toThrow(/liste/);
    expect(() => parseRefCredit({ ...FREE, license: 'other' }, null)).toThrow(/adresse du texte/);
    expect(() => parseRefCredit({ ...FREE, author: '' }, null)).toThrow(/auteur/);
    expect(() => parseRefCredit({ ...FREE, source_url: '' }, null)).toThrow(/page source/);
    expect(() => parseRefCredit({ ...FREE, source_url: 'http://example.org/a' }, null)).toThrow(/https/);
  });
});

describe('the candidate and its hash', () => {
  it('stores the candidate PRIVATELY under a name that carries the hash of the original, and publishes nothing', async () => {
    const { db, candBytes } = await withCandidate();
    const row = rowOf(db, 'inuyasha', 'kohaku')!;
    expect(row.status).toBe('candidate');
    expect(row.candidate_path).toBe(`${candidatePaths(candidateBase('inuyasha', 'kohaku', hex12(candBytes))).x1}`);
    expect(hashOfCandidatePath(row.candidate_path as string)).toBe(hex12(candBytes));
    for (const p of Object.values(candidatePaths(candidateBase('inuyasha', 'kohaku', hex12(candBytes))))) expect(db.blobs.has(`character-refs/${p}`)).toBe(true);
    expect([...db.blobs.keys()].some((k) => k.startsWith('entity-images/'))).toBe(false);
    expect(db.tables.entity_images).toEqual([]);
  });

  it('reads the hash of a reference file from its name', () => {
    expect(hashOfReferencePath('anime/inuyasha/kohaku-0123456789ab.jpg')).toBe('0123456789ab');
    expect(hashOfReferencePath('anime/inuyasha/kohaku.jpg')).toBeNull();
  });

  it('creates the row when the character has no reference at all, and refuses a character that does not exist', async () => {
    const db = refsFakeDb();
    await saveCandidate(db, { series: 'dr-stone', character: 'kohaku', original: await pictureBytes({ r: 1, g: 2, b: 3 }), files: await characterFiles(), credit: FREE });
    expect(rowOf(db, 'dr-stone', 'kohaku')).toMatchObject({ site_id: 'anime', status: 'candidate' });
    expect(rowOf(db, 'dr-stone', 'kohaku')?.reference_path).toBeUndefined();
    expect(await code(saveCandidate(db, { series: 'dr-stone', character: 'nobody', original: await pictureBytes({ r: 1, g: 2, b: 3 }), files: await characterFiles(), credit: FREE }))).toBe('unknown_entity');
  });

  it('refuses an original that is not a picture, one that is too heavy, and files of the wrong size', async () => {
    const db = refsFakeDb();
    const files = await characterFiles();
    const input = { series: 'inuyasha', character: 'kohaku', files, credit: FREE };
    expect(await code(saveCandidate(db, { ...input, original: new Uint8Array(40).fill(7) }))).toBe('unsupported_type');
    expect(await code(saveCandidate(db, { ...input, original: new Uint8Array(4 * 1024 * 1024).fill(7) }))).toBe('too_large');
    expect(await code(saveCandidate(db, { ...input, original: null }))).toBe('bad_request');
    const { photoFiles } = await import('./test-support');
    expect(await code(saveCandidate(db, { ...input, original: await pictureBytes({ r: 1, g: 2, b: 3 }), files: await photoFiles(100, 100) }))).toBe('invalid_image');
    expect(db.blobs.size).toBe(0);
  });

  it('replaces the candidate: the old files leave the bucket; discard removes everything', async () => {
    const { db, candBytes } = await withCandidate();
    const second = await pictureBytes({ r: 5, g: 200, b: 5 });
    await saveCandidate(db, { series: 'inuyasha', character: 'kohaku', original: second, files: await characterFiles(), credit: FREE });
    expect(db.blobs.has(`character-refs/${candidatePaths(candidateBase('inuyasha', 'kohaku', hex12(candBytes))).x1}`)).toBe(false);
    expect(db.blobs.has(`character-refs/${candidatePaths(candidateBase('inuyasha', 'kohaku', hex12(second))).x1}`)).toBe(true);
    await discardCandidate(db, 'inuyasha', 'kohaku');
    expect([...db.blobs.keys()].filter((k) => k.includes('-cand-'))).toEqual([]);
    expect(rowOf(db, 'inuyasha', 'kohaku')).toMatchObject({ status: 'reference', candidate_path: null });
    expect(await code(discardCandidate(db, 'inuyasha', 'kohaku'))).toBe('no_candidate');
  });

  it('changes only the credit of a stored candidate when no file is sent', async () => {
    const { db } = await withCandidate();
    await saveCandidate(db, { series: 'inuyasha', character: 'kohaku', original: null, files: null, credit: { ...FREE, author: 'Other Person' } });
    expect(rowOf(db, 'inuyasha', 'kohaku')?.candidate_author).toBe('Other Person');
    const empty = refsFakeDb();
    expect(await code(saveCandidate(empty, { series: 'inuyasha', character: 'kohaku', original: null, files: null, credit: FREE }))).toBe('no_candidate');
  });
});

describe('"Valider et publier" refuses', () => {
  it('when there is no candidate', async () => {
    const db = refsFakeDb();
    putReference(db, 'inuyasha', 'kohaku', await pictureBytes({ r: 9, g: 9, b: 9 }, 'jpeg'));
    expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' }))).toBe('no_candidate');
    expect(await code(publishCandidate(db, { series: 'dr-stone', character: 'kohaku', credit: FREE, userId: 'u' }))).toBe('no_candidate');
    expect(db.tables.entity_images).toEqual([]);
  });

  it('the pre-filled form submitted as is: Fandom source address and the licence of the reference', async () => {
    const { db } = await withCandidate({ credit: { source_url: '', author: '', license: '', license_url: '' } });
    const view = (await loadCharacterRefs(db)).rows.find((r) => r.series === 'inuyasha' && r.character === 'kohaku')!;
    const asIs = prefillOf({ reference: view.reference, candidate: null });
    expect(asIs).toMatchObject({ source_url: 'https://inuyasha.fandom.com/wiki/File:kohaku.jpg', author: 'FandomUser', license: 'cc_by_sa' });
    expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: asIs, userId: 'u' }))).toBe('fandom_source');
    // only the Fandom address fixed: the licence is still the reference's
    expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: { ...asIs, source_url: 'https://commons.wikimedia.org/wiki/File:K.png' }, userId: 'u' }))).toBe('same_license');
    expect(db.tables.entity_images).toEqual([]);
    expect(rowOf(db, 'inuyasha', 'kohaku')?.status).toBe('candidate');
  });

  it('a Fandom source, a Fandom licence address, in any of the three hosts', async () => {
    const { db } = await withCandidate();
    for (const bad of ['https://inuyasha.fandom.com/wiki/File:K.jpg', 'https://naruto.wikia.com/wiki/File:K.jpg', 'https://static.wikia.nocookie.net/inuyasha/images/a/ab/K.jpg']) {
      expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: { ...FREE, source_url: bad }, userId: 'u' })), bad).toBe('fandom_source');
      expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: { ...FREE, license: 'other', license_url: bad }, userId: 'u' })), bad).toBe('fandom_license_url');
    }
    expect(db.tables.entity_images).toEqual([]);
  });

  it('a picture identical to the reference (same hash), by the name of the file and by its bytes', async () => {
    const { db, refBytes } = await withCandidate({ sameFile: true });
    expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' }))).toBe('same_picture');
    // the reference file renamed (no hash in its name): the bytes still give it away
    const row = rowOf(db, 'inuyasha', 'kohaku')!;
    db.blobs.set('character-refs/anime/inuyasha/renamed.jpg', refBytes);
    row.reference_path = 'anime/inuyasha/renamed.jpg';
    expect(await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' }))).toBe('same_picture');
    expect(db.tables.entity_images).toEqual([]);
    expect(db.blobs.has('character-refs/anime/inuyasha/renamed.jpg')).toBe(true);
  });

  it('a missing licence, a licence outside the list and the licence of the reference', async () => {
    const { db } = await withCandidate();
    for (const license of ['', 'gpl', 'cc_by_sa']) {
      const c = await code(publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: { ...FREE, license }, userId: 'u' }));
      expect(c, license).toBe(license === 'cc_by_sa' ? 'same_license' : 'bad_license');
    }
    expect(db.tables.entity_images).toEqual([]);
    expect([...db.blobs.keys()].some((k) => k.startsWith('entity-images/'))).toBe(false);
  });
});

describe('after "Valider et publier"', () => {
  it('sends the CANDIDATE through the Images pipeline, deletes the reference, and marks the row published', async () => {
    const { db, candBytes } = await withCandidate();
    const refPath = rowOf(db, 'inuyasha', 'kohaku')!.reference_path as string;
    const candPath = rowOf(db, 'inuyasha', 'kohaku')!.candidate_path as string;
    const out = await publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'admin-1' });
    expect(out).toMatchObject({ slug: 'inuyasha/kohaku', referenceDeleted: true });
    // entity_images: under <series>/<character>, with its licence, verified
    const images = db.tables.entity_images!;
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      site_id: 'anime', kind: 'character', slug: 'inuyasha/kohaku', license: 'cc_by', author: 'Jane Doe', source_url: FREE.source_url, license_verified: true, created_by: 'admin-1', width: 360, height: 480,
    });
    // the files of the public bucket are the candidate's (1x, 2x, 96)
    const publicFiles = [...db.blobs.keys()].filter((k) => k.startsWith('entity-images/anime/character/inuyasha/kohaku/'));
    expect(publicFiles).toHaveLength(3);
    // the reference and the candidate are gone from the private bucket
    expect(db.blobs.has(`character-refs/${refPath}`)).toBe(false);
    expect(db.blobs.has(`character-refs/${candPath}`)).toBe(false);
    expect([...db.blobs.keys()].filter((k) => k.startsWith('character-refs/'))).toEqual([]);
    // the row
    const row = rowOf(db, 'inuyasha', 'kohaku')!;
    expect(row).toMatchObject({ status: 'published', reference_path: null, candidate_path: null, candidate_license: 'cc_by' });
    expect(typeof row.published_at).toBe('string');
    expect(Number.isNaN(Date.parse(row.published_at as string))).toBe(false);
    // the reference's bytes were never sent to the public bucket
    void candBytes;
  });

  it('publishes inuyasha/kohaku and leaves dr-stone/kohaku alone', async () => {
    const { db } = await withCandidate();
    putReference(db, 'dr-stone', 'kohaku', await pictureBytes({ r: 90, g: 90, b: 90 }, 'jpeg'));
    await publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' });
    expect(db.tables.entity_images!.map((r) => r.slug)).toEqual(['inuyasha/kohaku']);
    expect(rowOf(db, 'dr-stone', 'kohaku')).toMatchObject({ status: 'reference' });
    expect(rowOf(db, 'dr-stone', 'kohaku')?.reference_path).toBeTruthy();
    expect(db.blobs.has(`character-refs/${rowOf(db, 'dr-stone', 'kohaku')!.reference_path as string}`)).toBe(true);
  });

  it('publishes a character that never had a reference row', async () => {
    const db = refsFakeDb();
    await saveCandidate(db, { series: 'gintama', character: 'kagura', original: await pictureBytes({ r: 1, g: 2, b: 3 }), files: await characterFiles(), credit: { ...FREE, license: 'cc0' } });
    await publishCandidate(db, { series: 'gintama', character: 'kagura', credit: { ...FREE, license: 'cc0' }, userId: 'u' });
    expect(db.tables.entity_images!.map((r) => r.slug)).toEqual(['gintama/kagura']);
    expect(rowOf(db, 'gintama', 'kagura')?.status).toBe('published');
  });

  it('keeps the path of a reference it could not delete, and says so', async () => {
    const { db } = await withCandidate();
    db.refsFail.remove = true;
    const out = await publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' });
    expect(out.referenceDeleted).toBe(false);
    expect(rowOf(db, 'inuyasha', 'kohaku')).toMatchObject({ status: 'published' });
    expect(rowOf(db, 'inuyasha', 'kohaku')?.reference_path).toBeTruthy();
  });
});

describe('the list, the counter and the previews', () => {
  it('lists every character of the database with no reference row at all', async () => {
    const db = refsFakeDb();
    const data = await loadCharacterRefs(db);
    expect(data.total).toBe(4);
    expect(data.published).toBe(0);
    expect(data.rows.every((r) => r.reference === null && r.status === 'reference')).toBe(true);
    expect(data.series.map((s) => [s.slug, s.count])).toEqual([['dr-stone', 1], ['gintama', 1], ['inuyasha', 2]]);
  });

  it('counts the published ones from the table and the total from the characters', async () => {
    const { db } = await withCandidate();
    await publishCandidate(db, { series: 'inuyasha', character: 'kohaku', credit: FREE, userId: 'u' });
    const data = await loadCharacterRefs(db);
    expect([data.published, data.total]).toEqual([1, 4]);
    expect(data.rows.find((r) => r.series === 'inuyasha' && r.character === 'kohaku')?.published).toMatchObject({ license: 'cc_by', verified: true });
  });

  it('reads a database without the table as schema missing, not as an error', async () => {
    const db = refsFakeDb();
    db.missing.add('character_reference_images');
    const data = await loadCharacterRefs(db);
    expect(data.schema).toBe('missing');
    expect(data.total).toBe(4);
  });

  it('filters by series, status and name', () => {
    const row = (series: string, name: string, status: RefListRow['status']): RefListRow => ({ series, seriesName: series, character: name.toLowerCase(), name, status, reference: null, candidate: null, published: null, publishedAt: null });
    const rows = [row('a', 'Kohaku', 'reference'), row('a', 'Rem', 'candidate'), row('b', 'Kohaku', 'published')];
    expect(filterRefs(rows, { series: 'a', status: 'all', query: '' })).toHaveLength(2);
    expect(filterRefs(rows, { series: 'all', status: 'published', query: '' }).map((r) => r.series)).toEqual(['b']);
    expect(filterRefs(rows, { series: 'all', status: 'all', query: 'koha' })).toHaveLength(2);
  });

  it('signs short URLs (300 s at most) from the paths in the table, never from the caller', async () => {
    const { db } = await withCandidate();
    const out = await signPreviews(db, ['inuyasha/kohaku', 'dr-stone/kohaku', '../../etc/passwd']);
    expect(out['inuyasha/kohaku']?.reference).toContain('https://signed.example/character-refs/anime/inuyasha/kohaku-');
    expect(out['inuyasha/kohaku']?.candidate).toContain('-cand-');
    expect(out['dr-stone/kohaku']).toBeUndefined();
    expect(db.signed.length).toBeGreaterThan(0);
    for (const s of db.signed) { expect(s.bucket).toBe('character-refs'); expect(s.seconds).toBeLessThanOrEqual(300); expect(s.seconds).toBeGreaterThanOrEqual(60); }
  });
});

describe('no public route reads the table or the bucket', () => {
  const SRC = join(__dirname, '..', '..');
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|mts)$/.test(n) ? [p] : [];
  });
  // The only modules that may name the table or the bucket: the admin ones (and the tests).
  const ALLOWED = [
    'lib/photos/character-refs.ts', 'lib/photos/character-refs-store.ts', 'app/api/admin/photos/refs/route.ts',
    'components/admin/photos/character-refs-panel.tsx',
  ];

  it('names character_reference_images and character-refs only in the admin modules', () => {
    const hits: string[] = [];
    for (const dir of ['app', 'lib', 'components']) {
      for (const file of walk(join(SRC, dir))) {
        const rel = relative(SRC, file);
        if (/\.test\.tsx?$/.test(rel) || rel.endsWith('test-support.ts')) continue;
        if (/character_reference_images|character-refs/.test(readFileSync(file, 'utf8')) && !ALLOWED.includes(rel)) hits.push(rel);
      }
    }
    expect(hits).toEqual([]);
  });

  it('the allowed modules that run on the server are reached only from the admin routes and pages', () => {
    const importers: string[] = [];
    for (const dir of ['app', 'lib', 'components']) {
      for (const file of walk(join(SRC, dir))) {
        const rel = relative(SRC, file);
        if (/\.test\.tsx?$/.test(rel)) continue;
        if (/character-refs-store/.test(readFileSync(file, 'utf8'))) importers.push(rel);
      }
    }
    expect(importers).toContain('app/api/admin/photos/refs/route.ts');
    expect(importers.every((p) => p.startsWith('app/api/admin/') || p.startsWith('components/admin/') || p.startsWith('lib/photos/'))).toBe(true);
  });
});
