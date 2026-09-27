#!/usr/bin/env node
// C3: read-only look at a Next build's prerendered pages: for each route, the revalidate the
// build recorded and what its prerendered HTML contains (hub links, quiz of the day, groups
// rail, "N groups" intro). A render that lost a read should carry a short revalidate (C3-002,
// C3-003 fixes). Usage: node build-cache-state.mjs <apps/quiz/.next dir> [route ...]
import fs from 'node:fs';
import path from 'node:path';

const [, , dir, ...routes] = process.argv;
const m = JSON.parse(fs.readFileSync(path.join(dir, 'prerender-manifest.json'), 'utf8'));
const list = routes.length ? routes : ['/', '/groups', '/blackpink-quiz', '/ateez-quiz', '/blindtest'];
for (const r of list) {
  const e = m.routes[r];
  const file = path.join(dir, 'server/app', r === '/' ? 'index.html' : `${r.slice(1)}.html`);
  const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const stat = fs.existsSync(file) ? fs.statSync(file).mtime.toISOString() : '-';
  const hubs = new Set(html.match(/href="\/[a-z0-9-]+-quiz"/g) ?? []).size;
  const groupsIntro = (html.match(/on KpopQuiz\. (?:<!-- -->)?(\d+)(?:<!-- -->)? groups/) ?? [])[1] ?? '-';
  process.stdout.write(`${r}: revalidate ${e ? e.initialRevalidateSeconds : '(not prerendered)'} | html ${stat} ${html.length} B | hub links ${hubs} | daily=quiz ${(html.match(/daily=quiz/g) ?? []).length} | "All 90 groups" ${(html.match(/All 90 groups/g) ?? []).length} | groups intro ${groupsIntro}\n`);
}
