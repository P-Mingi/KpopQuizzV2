// Read-only lookup with the ANON key (G2 catalogue work). Never writes.
//   npx tsx scripts/v12/catalogue/q.mts songs "deezer_track_id,title,artist_name,status" artist_name "TWICE" [title "%strategy%"]
import { anonDb } from './lib.mts';

const [table, select, ...filters] = process.argv.slice(2);
if (!table || !select) { console.error('usage: q.mts <table> <select> [col pattern]...'); process.exit(2); }
let q = anonDb().from(table).select(select);
for (let i = 0; i + 1 < filters.length; i += 2) q = q.ilike(filters[i]!, filters[i + 1]!);
const { data, error } = await q.limit(200);
if (error) { console.error(error.message); process.exit(1); }
for (const row of data ?? []) console.log(JSON.stringify(row));
console.log(`${(data ?? []).length} row(s)`);
