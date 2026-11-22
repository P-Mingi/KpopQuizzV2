// Bunnyverse Cards, lane KCBANNER: the rules of the KpopCards banner, one inline style string the way styles.ts does it (tokens none, colours fixed:
// the night panel is the same in both themes). It is the ONE copy of the band: the hub home and the kpopquiz.org home draw the same component
// (cards-banner.tsx), and the kpop build reads no sheet of src/styles/sites/, so the rules ride with the component. Every selector starts with the
// id of the section (#kpopcards), which also outranks the global link, heading and focus rules of either site, so nothing leaks in or out.
// The panel: night violet in the colours of the KpopCards card back, white text 15.8:1 or more, the button's pink from #D13A6E (4.6:1 with white)
// to #B42A5C, a fan of three cards that opens a little on hover, and nothing moves with reduced motion.
export const CARDS_BANNER_CSS = `
#kpopcards, #kpopcards *, #kpopcards *::before, #kpopcards *::after { box-sizing: border-box; }
#kpopcards { font-family: var(--font-dm-sans), "DM Sans", "Pretendard", system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 16px; font-weight: 400; line-height: normal; -webkit-font-smoothing: antialiased; }
#kpopcards .kcb-h { margin: 0; line-height: 1.2; font-weight: 800; font-family: inherit; }
#kpopcards .kcb-sub { line-height: 1.55; font-weight: 400; font-family: inherit; }
#kpopcards .kcb-facts li { margin: 0; }
#kpopcards .kcb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 999px; font-family: inherit; font-weight: 700; line-height: 1.2; white-space: nowrap; text-decoration: none; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, background-color .15s ease; }
#kpopcards .kcb-btn:hover { transform: translateY(-1px); }
#kpopcards .kcb-btn:focus-visible { outline: 3px solid #FFFFFF; outline-offset: 2px; }
#kpopcards .kcb-arrow { flex: none; }
#kpopcards { position: relative; isolation: isolate; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: center; gap: 32px; padding: 48px 48px 48px 56px; border-radius: 24px; color: #FFFFFF; background: radial-gradient(70% 120% at 80% 50%, rgba(255, 77, 141, .38), transparent 62%), radial-gradient(60% 90% at 0% 100%, rgba(94, 231, 255, .14), transparent 60%), linear-gradient(135deg, #1A0D38 0%, #140C28 55%, #2A1650 100%); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08), 0 24px 48px rgba(20, 12, 40, .18); }
#kpopcards::before { content: ""; position: absolute; inset: 0; z-index: -1; background-image: radial-gradient(circle, rgba(255, 255, 255, .5) 0 1px, transparent 1.5px); background-size: 24px 24px; opacity: .22; -webkit-mask-image: linear-gradient(100deg, transparent 30%, #000 75%); mask-image: linear-gradient(100deg, transparent 30%, #000 75%); }
#kpopcards .kcb-copy { min-width: 0; }
#kpopcards .kcb-h { color: #FFFFFF; font-size: 36px; letter-spacing: -0.02em; }
#kpopcards .kcb-sub { margin: 8px 0 0; font-size: 17px; color: #D9D2EA; }
#kpopcards .kcb-facts { list-style: none; margin: 20px 0 32px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
#kpopcards .kcb-facts li { display: inline-flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 14px 0 12px; border-radius: 999px; background: rgba(255, 255, 255, .08); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14); font-size: 13px; font-weight: 600; line-height: 1.2; color: #FFFFFF; }
#kpopcards .kcb-facts li::before { content: ""; flex: none; width: 8px; height: 8px; border-radius: 2px; transform: rotate(45deg); background: conic-gradient(#FF5C9E, #FFC24B, #7CF29A, #4FC3FF, #A77BFF, #FF5C9E); box-shadow: 0 0 8px rgba(255, 92, 158, .7); }
#kpopcards .kcb-btn { min-height: 52px; padding: 0 28px; font-size: 16px; color: #FFFFFF; background: linear-gradient(135deg, #D13A6E, #B42A5C); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25), 0 10px 28px rgba(255, 77, 141, .42); }
#kpopcards .kcb-btn:hover { box-shadow: inset 0 1px 0 rgba(255, 255, 255, .25), 0 14px 36px rgba(255, 77, 141, .6); }
#kpopcards .kcb-arrow { transition: transform .2s ease; }
#kpopcards .kcb-btn:hover .kcb-arrow { transform: translateX(3px); }

#kpopcards .kcb-fan { position: relative; height: 280px; }
#kpopcards .kcb-card { --kcb-r: 0deg; --kcb-x: 0px; --kcb-y: 0px; position: absolute; left: 50%; top: 50%; width: 152px; aspect-ratio: 55 / 85; overflow: hidden; border-radius: 12px; transform: translate(-50%, -50%) translate(var(--kcb-x), var(--kcb-y)) rotate(var(--kcb-r)); transition: transform .45s cubic-bezier(.2, .8, .2, 1); box-shadow: 0 2px 3px rgba(0, 0, 0, .35), 0 16px 32px rgba(0, 0, 0, .45); }
#kpopcards .kcb-card::after { content: ""; position: absolute; inset: 8px; border-radius: 8px; border: 1.5px solid rgba(255, 255, 255, .45); pointer-events: none; }
#kpopcards .kcb-holo { --kcb-r: -15deg; --kcb-x: -84px; --kcb-y: 10px; background: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0) 0 6%, rgba(255, 255, 255, .35) 9%, rgba(255, 255, 255, 0) 12%), linear-gradient(150deg, #5DB2FF 0%, #BE92FF 32%, #FF76B6 58%, #FFE27A 82%, #7CF29A 100%); }
#kpopcards .kcb-gold { --kcb-r: 15deg; --kcb-x: 84px; --kcb-y: 10px; background: repeating-linear-gradient(65deg, rgba(255, 255, 255, 0) 0 8%, rgba(255, 255, 255, .3) 11%, rgba(255, 255, 255, 0) 14%), linear-gradient(135deg, #8A5E12 0%, #FFC94D 30%, #FFF1B8 46%, #E0A526 64%, #8A5E12 100%); }
#kpopcards .kcb-gold::after { border-color: rgba(90, 60, 8, .45); }
#kpopcards .kcb-ed { position: absolute; top: 16px; left: 16px; padding: 4px 8px; border-radius: 999px; font-family: var(--font-dm-mono), "DM Mono", ui-monospace, monospace; font-size: 11px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; white-space: nowrap; color: #FFFFFF; background: rgba(20, 12, 40, .55); }
#kpopcards .kcb-gold .kcb-ed { left: auto; right: 16px; color: #3B2A06; background: rgba(255, 255, 255, .55); }
#kpopcards .kcb-back { z-index: 1; --kcb-y: -4px; display: grid; place-items: center; background: radial-gradient(circle at 50% 44%, rgba(255, 77, 141, .6), transparent 46%), repeating-conic-gradient(from 0deg at 50% 44%, #24124A 0 7.5deg, #1A0D38 7.5deg 15deg); }
#kpopcards .kcb-back::before { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .2) 45%, transparent 60%); background-size: 260% 100%; background-position: 100% 0; animation: kcb-sheen 4.5s ease-in-out 1s infinite; pointer-events: none; }
#kpopcards .kcb-mk { position: relative; width: 76px; height: 76px; margin-top: -18px; object-fit: contain; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .45)); }
#kpopcards .kcb-bt { position: absolute; left: 0; right: 0; bottom: 22px; text-align: center; font-size: 11px; font-weight: 800; letter-spacing: .3em; color: rgba(255, 255, 255, .85); }
@keyframes kcb-sheen { 0%, 55% { background-position: 100% 0; } 100% { background-position: -60% 0; } }

@media (max-width: 860px) {
  #kpopcards { grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 32px 24px; }
  #kpopcards .kcb-fan { order: -1; height: 216px; }
  #kpopcards .kcb-card { width: 120px; }
  #kpopcards .kcb-holo { --kcb-x: -70px; }
  #kpopcards .kcb-gold { --kcb-x: 70px; }
  #kpopcards .kcb-mk { width: 60px; height: 60px; }
  #kpopcards .kcb-ed { top: 12px; left: 12px; font-size: 10px; }
  #kpopcards .kcb-gold .kcb-ed { left: auto; right: 12px; }
  #kpopcards .kcb-bt { bottom: 16px; font-size: 10px; }
}
@media (max-width: 620px) {
  #kpopcards .kcb-h { font-size: 28px; }
  #kpopcards .kcb-sub { font-size: 15px; }
  #kpopcards .kcb-facts { margin: 16px 0 24px; }
  #kpopcards .kcb-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  #kpopcards .kcb-card, #kpopcards .kcb-arrow { transition: none; }
  #kpopcards .kcb-back::before { animation: none; }
  #kpopcards .kcb-btn:hover .kcb-arrow { transform: none; }
}
/* The fan opens on hover only with a pointer that hovers and no request for reduced motion. */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  #kpopcards:hover .kcb-holo { --kcb-r: -20deg; --kcb-x: -100px; --kcb-y: 16px; }
  #kpopcards:hover .kcb-gold { --kcb-r: 20deg; --kcb-x: 100px; --kcb-y: 16px; }
  #kpopcards:hover .kcb-back { --kcb-y: -12px; }
}
@media (hover: hover) and (prefers-reduced-motion: no-preference) and (max-width: 860px) {
  #kpopcards:hover .kcb-holo { --kcb-x: -78px; }
  #kpopcards:hover .kcb-gold { --kcb-x: 78px; }
}
`;
