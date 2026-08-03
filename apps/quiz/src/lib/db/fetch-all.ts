// V-REPAIR sweep B - paginate a PostgREST read past the ~1000-row default cap.
// A read that pulls rows to aggregate in JS silently drops everything past 1000,
// so counts under-count once the table grows. `makeQuery` MUST return a FRESH
// query (all filters applied) on each call, because a built PostgREST query can
// only be awaited once; we re-apply .range() to it per page.
type Ranged = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> };

export async function fetchAllRows<T>(makeQuery: () => Ranged, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(`fetchAllRows: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
