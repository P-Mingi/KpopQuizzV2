// Bunnyverse Cards, lot 3 point A18: what the browser keeps of the guest demo pack, in localStorage only (never a cookie, never sent but
// to /api/cards/demo/claim): a random device id, the signed token of the demo pack not yet attached, and a flag that this visitor has
// opened their one demo. Every access is wrapped: a private window or blocked storage just means no demo memory.
const DEVICE = 'bvc-demo-device-v1';
const TOKEN = 'bvc-demo-token-v1';
const USED = 'bvc-demo-used-v1';

function get(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function set(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* storage blocked: the demo is simply not remembered */ }
}
function del(k: string): void {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
}

/** A random device id of 32 URL-safe characters, made once. */
export function deviceId(): string {
  const have = get(DEVICE);
  if (have && /^[A-Za-z0-9_-]{16,64}$/.test(have)) return have;
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  const id = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  set(DEVICE, id);
  return id;
}
export const demoUsed = (): boolean => get(USED) === '1';
export const markDemoUsed = (token: string): void => { set(USED, '1'); set(TOKEN, token); };
export const pendingDemo = (): string | null => get(TOKEN);
export const clearPendingDemo = (): void => del(TOKEN);
