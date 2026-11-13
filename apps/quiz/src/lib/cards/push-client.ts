// Bunnyverse Cards, lot 4: the browser half of "Notify me". The packs page tile (another lane) reads pushState() and calls turnOn() / turnOff();
// components/cards/notify-button.tsx is the minimal button over them. The browser permission is asked ONLY inside turnOn(), which the player's
// tap calls: nothing in this file runs a prompt on load. Browser only.
import { withBasePath } from '@/lib/site/base-path';

import { cardsPushPublicOn } from './push-flags';

/** unsupported: no push in this browser, or the feature is off; denied: the browser blocks notifications; off: not subscribed; on: subscribed. */
export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

/** Where the service worker lives (the hub serves it at the root so its scope is the whole site) and the API route. */
export const SW_URL = '/sw.js';
export const PUSH_API = '/api/cards/push';

/** The VAPID public key (base64url) the build was made with; written out in full so Next inlines it. */
const publicKey = (): string => process.env.NEXT_PUBLIC_CARDS_VAPID_PUBLIC_KEY ?? '';

/** The key as the bytes the browser's subscribe call wants. */
export function urlBase64ToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** True when this build shows the feature (hub, NEXT_PUBLIC_NET_CARDS_PUSH, a VAPID key) and the browser can do web push. */
export function pushSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!cardsPushPublicOn() || !publicKey()) return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Where the player stands. Never asks anything. */
export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  try {
    return (await currentSubscription()) ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

async function post(method: 'POST' | 'DELETE', body: unknown): Promise<boolean> {
  try {
    const res = await fetch(withBasePath(PUSH_API), { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
    return res.ok;
  } catch {
    return false;
  }
}

/** The tap on "Turn on": asks the permission, registers the service worker, subscribes and tells the server. Returns the new state. */
export async function turnOn(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  // first await of the tap: the permission prompt needs the tap's user activation
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';
  try {
    await navigator.serviceWorker.register(withBasePath(SW_URL), { scope: '/' });
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey()) }));
    const json = sub.toJSON();
    const ok = await post('POST', { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } });
    if (!ok) {
      await sub.unsubscribe();
      return 'off';
    }
    return 'on';
  } catch {
    return 'off';
  }
}

/** The tap on "On": removes the subscription from the server and from the browser. Returns the new state. */
export async function turnOff(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  try {
    const sub = await currentSubscription();
    if (sub) {
      await post('DELETE', { endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch {
    /* the server forgets a dead endpoint on its next send */
  }
  return Notification.permission === 'denied' ? 'denied' : 'off';
}
