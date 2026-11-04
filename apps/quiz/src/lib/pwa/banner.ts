// Run PWA (docs/o1/PWA-PLAN.md, section 4): the install banner as plain DOM, built after the page has loaded and the conditions of
// lib/pwa/state.ts hold. It is never in the HTML a page is served with: nothing of it exists on the server, in the React tree or in the
// flight data, so the served pages stay as they are. Small, at the bottom, above the tab bar when there is one, one close button.
// The words come in the view (lib/pwa/copy.ts); no emoji, no dash. Colours are the UX tokens of the site, with a light fallback.

export interface BannerView {
  /** 'prompt': the browser's install window opens from the button. 'ios': two gestures, no button. */
  readonly kind: 'prompt' | 'ios';
  readonly title: string;
  /** The sentence of the prompt banner. */
  readonly body: string;
  /** The two gestures of the iOS banner, in order. */
  readonly steps: readonly [string, string];
  readonly install: string;
  readonly notNow: string;
  readonly close: string;
  /** Pixels between the bottom of the screen and the banner: the height of the tab bar when it shows, plus a margin. */
  readonly bottom: number;
  /** Add the safe area of the screen (the home indicator of an iPhone) to `bottom`: true when no tab bar already covers it. */
  readonly safeArea: boolean;
}

export interface BannerHandlers {
  readonly onInstall: () => void;
  readonly onDismiss: () => void;
}

export interface BannerHandle {
  readonly element: HTMLElement;
  remove(): void;
}

const ROOT_STYLE = [
  'position:fixed', 'left:12px', 'right:12px', 'z-index:70', 'box-sizing:border-box', 'max-width:420px', 'margin:0 auto',
  'display:flex', 'align-items:flex-start', 'gap:8px', 'padding:12px 8px 12px 16px', 'border-radius:16px',
  'background:var(--ux-raised,#fff)', 'color:var(--ux-ink,#1f1b17)', 'border:1px solid var(--ux-edge,#e5e0da)',
  'box-shadow:0 8px 24px rgba(0,0,0,.16)', 'font-family:inherit', 'font-size:14px', 'line-height:1.4',
].join(';');

const BUTTON_BASE = 'font-family:inherit;font-size:14px;font-weight:600;border-radius:999px;padding:8px 16px;min-height:36px;cursor:pointer';

function el(doc: Document, tag: string, style: string, text?: string): HTMLElement {
  const node = doc.createElement(tag);
  node.setAttribute('style', style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Builds the banner, appends it to the body and returns the handle that removes it. */
export function mountBanner(doc: Document, view: BannerView, handlers: BannerHandlers): BannerHandle {
  const px = `${Math.max(0, Math.round(view.bottom))}px`;
  const root = el(doc, 'section', `${ROOT_STYLE};bottom:${view.safeArea ? `calc(${px} + env(safe-area-inset-bottom,0px))` : px}`);
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', view.title);
  root.setAttribute('data-kq-pwa', view.kind);

  const text = el(doc, 'div', 'flex:1;min-width:0');
  text.appendChild(el(doc, 'p', 'margin:0;font-size:15px;font-weight:700', view.title));
  if (view.kind === 'prompt') {
    text.appendChild(el(doc, 'p', 'margin:2px 0 0;color:var(--ux-muted,#6b655e)', view.body));
    const row = el(doc, 'div', 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px');
    const install = el(doc, 'button', `${BUTTON_BASE};border:0;background:var(--ux-pink-fill,#d13a6e);color:var(--ux-on-accent,#fff)`, view.install);
    install.setAttribute('type', 'button');
    install.addEventListener('click', handlers.onInstall);
    const later = el(doc, 'button', `${BUTTON_BASE};border:1px solid var(--ux-edge,#e5e0da);background:transparent;color:inherit`, view.notNow);
    later.setAttribute('type', 'button');
    later.addEventListener('click', handlers.onDismiss);
    row.appendChild(install);
    row.appendChild(later);
    text.appendChild(row);
  } else {
    const list = el(doc, 'ol', 'margin:6px 0 0;padding-left:20px;color:var(--ux-muted,#6b655e)');
    for (const step of view.steps) list.appendChild(el(doc, 'li', 'margin:0', step));
    text.appendChild(list);
  }
  root.appendChild(text);

  const close = el(doc, 'button', 'flex:none;width:40px;height:40px;border:0;border-radius:999px;background:transparent;color:var(--ux-muted,#6b655e);font-family:inherit;font-size:22px;line-height:1;cursor:pointer', '×');
  close.setAttribute('type', 'button');
  close.setAttribute('aria-label', view.close);
  close.addEventListener('click', handlers.onDismiss);
  root.appendChild(close);

  doc.body.appendChild(root);
  return { element: root, remove: () => root.remove() };
}
