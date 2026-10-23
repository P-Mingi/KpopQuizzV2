// Run O1, lane O2: preload (NODE_OPTIONS --require), sends the offline Supabase URL (127.0.0.1:9, inlined at build) to the fake server.
const realFetch = globalThis.fetch;
const target = 'http://127.0.0.1:' + (process.env.FAKE_PORT || 4199);
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url && url.startsWith('http://127.0.0.1:9')) {
    const next = target + url.slice('http://127.0.0.1:9'.length);
    return realFetch(typeof input === 'string' || input instanceof URL ? next : new Request(next, input), init);
  }
  return realFetch(input, init);
};
