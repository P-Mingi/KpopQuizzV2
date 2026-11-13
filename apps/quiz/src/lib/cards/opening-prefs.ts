// KpopCards (agent C): the two switches of the opening, sound and vibration, as a tiny store. Both are on by default (the prototype).
// The top bar (agent B) reads and writes them here; the opening reads them. They live in local storage; when the server prefs of file 107
// exist (agent A), `setPrefsSink` gives the store a function that saves them there too, and `applyServerPrefs` loads them at sign in.
export interface OpeningPrefs { sound: boolean; vibration: boolean }
const KEY = 'kpopcards:prefs';
let cur: OpeningPrefs | null = null;
const subs = new Set<(p: OpeningPrefs) => void>();
let sink: ((p: OpeningPrefs) => void) | null = null;

function read(): OpeningPrefs {
  const d: OpeningPrefs = { sound: true, vibration: true };
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    if (!raw) return d;
    const j = JSON.parse(raw) as Partial<OpeningPrefs>;
    return { sound: typeof j.sound === 'boolean' ? j.sound : true, vibration: typeof j.vibration === 'boolean' ? j.vibration : true };
  } catch { return d; }
}
export function getPrefs(): OpeningPrefs {
  if (!cur) cur = read();
  return cur;
}
function commit(p: OpeningPrefs, toSink: boolean): void {
  cur = p;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the switch still works for this visit */ }
  subs.forEach((f) => f(p));
  if (toSink && sink) sink(p);
}
export function setPref(key: keyof OpeningPrefs, value: boolean): void { commit({ ...getPrefs(), [key]: value }, true); }
export function applyServerPrefs(p: Partial<OpeningPrefs>): void { commit({ ...getPrefs(), ...p }, false); }
export function setPrefsSink(f: ((p: OpeningPrefs) => void) | null): void { sink = f; }
export function subscribePrefs(f: (p: OpeningPrefs) => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
/** For the tests. */
export function resetPrefsForTest(): void { cur = null; subs.clear(); sink = null; }
