'use client';

// KpopCards, DEVELOPMENT FIXTURE ONLY (CARDS_UI_FIXTURE=1, never in a production build: the lobby imports this behind a NODE_ENV production check, so the bundle never
// holds it): the prototype's "Prototype controls" under the lobby, with the prototype's button ids, so the QA harness can reach the same states (force the golden pack,
// a Gold, a Full Art, the timer cap, the guest view, an empty binder, reduced motion). They act on the seeded mock through duck typing: nothing here is a real feature.
import { useCards } from './cards-provider';

interface MockHooks {
  data: { opened: number; stock: number; timerToday: number };
  forceGolden?: () => void;
  forceGuarantee?: () => void;
  forceFullArt?: () => void;
}

export function ProtoControls(): React.ReactElement {
  const { kc, toast, refresh, lobby } = useCards();
  const m = kc as unknown as MockHooks | null;
  const go = (state: string): void => { const u = new URL(window.location.href); u.searchParams.set('kcstate', state); window.location.href = u.toString(); };
  const act = (f: () => void, msg: string): void => { if (!m) return; f(); toast(msg); void refresh(); };
  return (
    <details className="proto">
      <summary>Prototype controls</summary>
      <div>
        <button type="button" className="btn-quiet" id="force-golden" onClick={() => act(() => { m!.data.opened += 9 - (m!.data.opened % 10); m!.forceGolden?.(); }, 'Your next pack is golden.')}>Next pack: golden</button>
        <button type="button" className="btn-quiet" id="force-ur" onClick={() => act(() => m!.forceGuarantee?.(), 'The next pack will hold a Gold.')}>Next pack: Gold</button>
        <button type="button" className="btn-quiet" id="force-l" onClick={() => act(() => m!.forceFullArt?.(), 'The next pack will hold a Full Art.')}>Next pack: Full Art</button>
        <button type="button" className="btn-quiet" id="cap-39" onClick={() => act(() => { m!.data.timerToday = 39; m!.data.stock = Math.min(m!.data.stock, (lobby?.cap ?? 10) - 1); }, '39 timer packs used today.')}>Timer: 39 of 40 used</button>
        <button type="button" className="btn-quiet" id="guest-tg" onClick={() => go('guest')}>Guest view</button>
        <button type="button" className="btn-quiet" id="rm-tg" onClick={() => { document.documentElement.classList.toggle('rm'); toast('Reduced motion toggled.'); }}>Reduced motion</button>
        <button type="button" className="btn-quiet" id="reset-empty" onClick={() => go('empty')}>Empty binder</button>
        <button type="button" className="btn-quiet" id="reset-example" onClick={() => go('example')}>Example binder</button>
        <span>Development fixture only. Photos are placeholders.</span>
      </div>
    </details>
  );
}
