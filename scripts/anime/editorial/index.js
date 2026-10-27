// Run O1, lane E1a: the entry node resolves when `node --test scripts/anime/editorial/` names this folder (node 22
// and later read a folder argument as a path to run, not as a folder to search). It loads every *.test.mjs here, so
// the folder command runs the whole suite; `node --test scripts/anime/editorial/*.test.mjs` runs the files one by one.
import { readdirSync } from 'node:fs';

const here = new URL('./', import.meta.url);
for (const name of readdirSync(here).sort()) {
  if (name.endsWith('.test.mjs')) await import(new URL(name, here));
}
