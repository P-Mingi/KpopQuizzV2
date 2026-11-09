// Run O1 (owner, 2026-11-09): a launch SQL file the owner may apply from the Supabase SQL Editor is ONE DO block. The editor does
// not always keep temp tables or session settings from one statement or one Run to the next (a second Run of L29 raised
// "relation _l29_review does not exist"); a single DO block is one statement, atomic on its own, in the editor and in psql.
//
// toSingleDoBlock(sql, tag) turns a generated file written as statements into that block:
//   - the leading comment lines stay a header above the block, and its "-- o1-transaction:" line says so;
//   - `set lock_timeout = '...';` and `set client_min_messages = ...;` become set_config(..., true) at the top of the block;
//   - each inner `do $x$ ... end $x$;` guard or self-check becomes a nested `begin ... end;` (or `declare ... begin ... end;`) block;
//   - every other statement (update, insert, alter, create or replace view, comments) is kept exactly as written, unindented,
//     so no string literal changes.
// It refuses what it cannot convert safely: a temp table, CONCURRENTLY, a transaction command, any other top-level `set`, the
// outer tag already used in the file, or an inner DO block without its end. A bare top-level `select` would fail at run time
// in plpgsql ("query has no destination"), which the pglite proofs of each file catch.

const DO_OPEN = /^do (\$[A-Za-z0-9_]*\$)[ \t]*(.*)$/;
const DO_CLOSE = /^end (\$[A-Za-z0-9_]*\$);[ \t]*$/;

export function toSingleDoBlock(sql, tag) {
  if (!/^[a-z][a-z0-9_]*$/.test(tag)) throw new Error(`toSingleDoBlock: bad tag ${tag}`);
  const outer = `$${tag}$`;
  if (sql.includes(outer)) throw new Error(`toSingleDoBlock: the tag ${outer} is already used in the file`);
  if (/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i.test(sql)) throw new Error('toSingleDoBlock: a temp table cannot live in one DO block across Runs; rewrite it as arrays or CTEs');
  if (/\bconcurrently\b/i.test(sql)) throw new Error('toSingleDoBlock: CONCURRENTLY cannot run inside a DO block');
  if (/^\s*(begin|commit|rollback|start\s+transaction|savepoint)\s*;/im.test(sql)) throw new Error('toSingleDoBlock: a transaction command cannot run inside a DO block');

  const lines = sql.replace(/\n+$/, '').split('\n');
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('--') || lines[i].trim() === '')) i++;
  const header = lines.slice(0, i).map((l) =>
    l.startsWith('-- o1-transaction:')
      ? l.replace(/^-- o1-transaction:\s*single \(psql --single-transaction\)\.?/, '-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor).')
      : l,
  );
  while (header.length && header[header.length - 1].trim() === '') header.pop();

  const settings = [];
  const body = [];
  const open = [];
  // A statement starts on a line after a blank line, a comment or a line ending with ";" (the SET clause of a multi-line
  // UPDATE is inside a statement, not a top-level set).
  let inStatement = false;
  for (const line of lines.slice(i)) {
    const starts = !inStatement;
    const trimmed = line.trim();
    if (trimmed !== '' && !trimmed.startsWith('--')) inStatement = !trimmed.endsWith(';');
    let m = starts ? /^set lock_timeout = '([^']+)';\s*$/.exec(line) : null;
    if (m) { settings.push(`perform set_config('lock_timeout', '${m[1]}', true);`); continue; }
    m = starts ? /^set client_min_messages = ([a-z0-9]+);\s*$/.exec(line) : null;
    if (m) { settings.push(`perform set_config('client_min_messages', '${m[1]}', true);`); continue; }
    if (starts && /^set\s/i.test(line)) throw new Error(`toSingleDoBlock: a top-level set cannot be converted: ${line.slice(0, 60)}`);
    m = DO_OPEN.exec(line);
    if (m) inStatement = false;
    if (m) {
      open.push(m[1]);
      if (m[2].trim() !== '') body.push(m[2]);
      continue;
    }
    m = DO_CLOSE.exec(line);
    if (m) {
      if (open.pop() !== m[1]) throw new Error(`toSingleDoBlock: ${line} closes no open DO block`);
      body.push('end;');
      continue;
    }
    body.push(line);
  }
  if (open.length) throw new Error(`toSingleDoBlock: ${open.length} inner DO block(s) without an end`);
  while (body.length && body[body.length - 1].trim() === '') body.pop();
  return [...header, '', `do ${outer}`, 'begin', ...settings, '', ...body, '', `end ${outer};`, ''].join('\n');
}

/** The test every converted file must pass: one top-level statement, a DO block with the given tag. */
export function isSingleDoBlock(sql, tag) {
  const outer = `$${tag}$`;
  const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
  return code.startsWith(`do ${outer}\nbegin`) && code.endsWith(`end ${outer};`) && code.split(outer).length === 3;
}
