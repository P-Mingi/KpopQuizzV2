// Test only (publish-noninteractive.test.ts), loaded with `node --import` into the child that runs publish-card-files.mjs: every fetch of
// the child goes to the test's local server, https://<host>/<path> becoming http://127.0.0.1:<port>/<host>/<path>. Nothing leaves the
// machine, and the script runs unchanged (its https-only rule for CARDS_SUPABASE_URL included).
const base = process.env.CARDS_TEST_SERVER;
if (!base) throw new Error('publish-fetch-preload: CARDS_TEST_SERVER is not set');
const real = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const u = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
  return real(`${base}/${u.host}${u.pathname}${u.search}`, init);
};
