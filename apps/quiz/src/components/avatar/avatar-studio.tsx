'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  BACKGROUNDS,
  CLOTHES,
  DEFAULT_SELECTION,
  FRAMES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  ITEMS,
  IDENTITY_TRANSFORM,
  hairAsset,
  resolveTransform,
  selectionToLayers,
  transformToCss,
  type AvatarCategory,
  type AvatarOption,
  type AvatarSelection,
  type AvatarTransform,
  type ResolvedLayer,
} from '@/lib/avatar/manifest';

type TabKey = 'hair' | 'hairColor' | 'clothes' | 'hat' | 'item' | 'background' | 'frame';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'hair', label: 'Hair' },
  { key: 'hairColor', label: 'Hair color' },
  { key: 'clothes', label: 'Clothes' },
  { key: 'hat', label: 'Hats' },
  { key: 'item', label: 'Items' },
  { key: 'background', label: 'Background' },
  { key: 'frame', label: 'Frame' },
];

// Which category + selected key a tab tunes (geometry categories only).
const TAB_CATEGORY: Partial<Record<TabKey, AvatarCategory>> = {
  hair: 'hair',
  clothes: 'clothes',
  hat: 'hat',
  item: 'item',
};

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function maybe(options: AvatarOption[]): string | null {
  if (!options.length) return null;
  const choices: Array<string | null> = [null, ...options.map((o) => o.key)];
  return choices[Math.floor(Math.random() * choices.length)] ?? null;
}

function selectedKeyFor(category: AvatarCategory, sel: AvatarSelection): string | null {
  switch (category) {
    case 'hair': return sel.hairStyle;
    case 'clothes': return sel.clothes;
    case 'hat': return sel.hat;
    case 'item': return sel.item;
    case 'background': return sel.background;
    case 'frame': return sel.frame;
    case 'base': return 'base';
  }
}

const OPTIONS_BY_CATEGORY: Partial<Record<AvatarCategory, AvatarOption[]>> = {
  hair: HAIR_STYLES,
  clothes: CLOTHES,
  hat: HATS,
  item: ITEMS,
};

function manifestTransform(category: AvatarCategory, key: string | null): AvatarTransform {
  const list = OPTIONS_BY_CATEGORY[category];
  const o = list?.find((x) => x.key === key);
  return resolveTransform(category, o?.transform);
}

type Overrides = Record<string, AvatarTransform>; // `${category}:${key}` -> transform

/**
 * M1.27 avatar builder (FINALIZE). Light-default, refined Reddit-style editor:
 * a live preview compositing transparent PNG layers in z-order on a shared 1024
 * canvas WITH per-asset transforms, category tabs, and Randomize / Reset / Save.
 * Save flattens server-side into one PNG. `?tune=1` exposes a dev-only alignment
 * tuner whose numbers get pasted back into the manifest.
 */
export function AvatarStudio(): React.ReactElement {
  const [sel, setSel] = useState<AvatarSelection>(DEFAULT_SELECTION);
  const [tab, setTab] = useState<TabKey>('hair');
  const [overrides, setOverrides] = useState<Overrides>({});
  const [tune, setTune] = useState(false);
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'auth' | 'error'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTune(new URLSearchParams(window.location.search).get('tune') === '1');
    }
  }, []);

  const layers = useMemo<ResolvedLayer[]>(() => {
    const base = selectionToLayers(sel);
    if (!tune) return base;
    return base.map((l) => {
      const key = selectedKeyFor(l.category, sel);
      const ov = key ? overrides[`${l.category}:${key}`] : undefined;
      return ov ? { ...l, transform: ov } : l;
    });
  }, [sel, overrides, tune]);

  const update = useCallback((patch: Partial<AvatarSelection>) => {
    setSave('idle');
    setSel((s) => ({ ...s, ...patch }));
  }, []);

  const randomize = useCallback(() => {
    setSave('idle');
    setSel({
      hairStyle: (pick([...HAIR_STYLES, null]) as AvatarOption | null)?.key ?? null,
      hairColor: pick(HAIR_COLORS)?.key ?? DEFAULT_SELECTION.hairColor,
      clothes: maybe(CLOTHES),
      hat: maybe(HATS),
      item: maybe(ITEMS),
      background: maybe(BACKGROUNDS),
      frame: maybe(FRAMES),
    });
  }, []);

  const reset = useCallback(() => {
    setSave('idle');
    setSel(DEFAULT_SELECTION);
  }, []);

  const doSave = useCallback(async () => {
    setSave('saving');
    try {
      const res = await fetch('/api/avatar/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: sel }),
      });
      if (res.status === 401) { setSave('auth'); return; }
      setSave(res.ok ? 'saved' : 'error');
    } catch {
      setSave('error');
    }
  }, [sel]);

  // Tune target = the active tab's geometry category + its selected key.
  const tuneCat = TAB_CATEGORY[tab];
  const tuneKey = tuneCat ? selectedKeyFor(tuneCat, sel) : null;
  const tuneId = tuneCat && tuneKey ? `${tuneCat}:${tuneKey}` : null;
  const tuneCurrent: AvatarTransform | null =
    tuneId ? overrides[tuneId] ?? (tuneCat ? manifestTransform(tuneCat, tuneKey) : null) : null;

  const nudge = useCallback((patch: Partial<AvatarTransform>) => {
    if (!tuneId || !tuneCat) return;
    setOverrides((o) => {
      const cur = o[tuneId] ?? manifestTransform(tuneCat, tuneKey);
      return { ...o, [tuneId]: clampTransform({ ...cur, ...patch }) };
    });
  }, [tuneId, tuneCat, tuneKey]);

  return (
    <div className="av-studio">
      <style>{STUDIO_CSS}</style>

      <section className="av-stage" aria-label="Avatar preview">
        <div className="av-glow" aria-hidden="true" />
        <Sparkle className="av-spark av-spark-1" />
        <Sparkle className="av-spark av-spark-2" />
        <div className="av-plate">
          <div className="av-canvas">
            {layers.map((l) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${l.category}:${l.asset}`}
                src={l.asset}
                alt=""
                className="av-layer"
                draggable={false}
                style={{ transform: transformToCss(l.transform), transformOrigin: 'center' }}
              />
            ))}
          </div>
          <div className="av-floor" aria-hidden="true" />
        </div>

        <div className="av-controls">
          <button type="button" className="av-btn av-btn-ghost" onClick={randomize}>
            <span aria-hidden="true">{'✨'}</span> Randomize
          </button>
          <button type="button" className="av-btn av-btn-ghost" onClick={reset}>
            <span aria-hidden="true">{'↺'}</span> Reset
          </button>
          <button
            type="button"
            className="av-btn av-btn-brand"
            onClick={() => void doSave()}
            disabled={save === 'saving'}
            aria-live="polite"
          >
            {save === 'saving' ? 'Saving...' : save === 'saved' ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        {save === 'auth' && <p className="av-note av-note-warn">Sign in to save your avatar.</p>}
        {save === 'error' && <p className="av-note av-note-warn">Something went wrong. Try again.</p>}
        {save === 'saved' && <p className="av-note">Saved. It now shows on your cards across the site.</p>}

        {tune && (
          <TunePanel
            category={tuneCat}
            transform={tuneCurrent}
            onNudge={nudge}
            onReset={() => { if (tuneId) setOverrides((o) => { const n = { ...o }; delete n[tuneId]; return n; }); }}
          />
        )}
      </section>

      <section className="av-picker" aria-label="Customize">
        <div className="av-tabs" role="tablist" aria-label="Categories">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              className={`av-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="av-grid" role="tabpanel">
          {tab === 'hair' && (
            <>
              <NoneTile active={sel.hairStyle === null} onClick={() => update({ hairStyle: null })} />
              {HAIR_STYLES.map((h) => (
                <Tile
                  key={h.key}
                  label={h.label}
                  asset={hairAsset(h.key, sel.hairColor)}
                  active={sel.hairStyle === h.key}
                  onClick={() => update({ hairStyle: h.key })}
                />
              ))}
            </>
          )}

          {tab === 'hairColor' &&
            HAIR_COLORS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`av-tile av-swatch ${sel.hairColor === c.key ? 'is-active' : ''}`}
                onClick={() => update({ hairColor: c.key })}
                aria-pressed={sel.hairColor === c.key}
              >
                <span className="av-swatch-dot" style={{ background: c.swatch }} />
                <span className="av-tile-label">{c.label}</span>
              </button>
            ))}

          {tab === 'clothes' && (
            <GridWithNone options={CLOTHES} activeKey={sel.clothes} onPick={(k) => update({ clothes: k })} />
          )}
          {tab === 'hat' && (
            <GridWithNone options={HATS} activeKey={sel.hat} onPick={(k) => update({ hat: k })} />
          )}
          {tab === 'item' && (
            <GridWithNone options={ITEMS} activeKey={sel.item} onPick={(k) => update({ item: k })} />
          )}
          {tab === 'background' && (
            <EmptyOrGrid options={BACKGROUNDS} activeKey={sel.background} onPick={(k) => update({ background: k })} soon="Backgrounds arrive soon" />
          )}
          {tab === 'frame' && (
            <EmptyOrGrid options={FRAMES} activeKey={sel.frame} onPick={(k) => update({ frame: k })} soon="Frames arrive soon" />
          )}
        </div>
      </section>
    </div>
  );
}

// Clamp the tuner to sane ranges so a layer cannot be flung fully off-canvas.
function clampTransform(t: AvatarTransform): AvatarTransform {
  const c = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    x: c(Math.round(t.x), -400, 400),
    y: c(Math.round(t.y), -400, 400),
    scale: c(round2(t.scale), 0.3, 2.5),
    rotate: c(Math.round(t.rotate), -180, 180),
  };
}

function TunePanel({
  category,
  transform,
  onNudge,
  onReset,
}: {
  category: AvatarCategory | undefined;
  transform: AvatarTransform | null;
  onNudge: (p: Partial<AvatarTransform>) => void;
  onReset: () => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  if (!category || !transform) {
    return (
      <div className="av-tune">
        <p className="av-tune-hint">Tune mode. Pick a Hair / Clothes / Hat / Item, then nudge it.</p>
      </div>
    );
  }
  const snippet = formatTransform(transform);
  const row = (label: string, minus: Partial<AvatarTransform>, plus: Partial<AvatarTransform>, val: string) => (
    <div className="av-tune-row">
      <span className="av-tune-label">{label}</span>
      <button type="button" className="av-nudge" onClick={() => onNudge(minus)}>{'−'}</button>
      <span className="av-tune-val">{val}</span>
      <button type="button" className="av-nudge" onClick={() => onNudge(plus)}>{'+'}</button>
    </div>
  );
  return (
    <div className="av-tune">
      <div className="av-tune-head">
        <strong>Tune: {category}</strong>
        <button type="button" className="av-tune-reset" onClick={onReset}>reset</button>
      </div>
      {row('X', { x: transform.x - 4 }, { x: transform.x + 4 }, String(transform.x))}
      {row('Y', { y: transform.y - 4 }, { y: transform.y + 4 }, String(transform.y))}
      {row('Scale', { scale: round2(transform.scale - 0.02) }, { scale: round2(transform.scale + 0.02) }, transform.scale.toFixed(2))}
      {row('Rotate', { rotate: transform.rotate - 2 }, { rotate: transform.rotate + 2 }, `${transform.rotate}°`)}
      <div className="av-tune-out">
        <code>{snippet}</code>
        <button
          type="button"
          className="av-tune-copy"
          onClick={() => { void navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// Compact manifest snippet: only the fields that differ from identity.
function formatTransform(t: AvatarTransform): string {
  const parts: string[] = [];
  if (t.x !== IDENTITY_TRANSFORM.x) parts.push(`x: ${t.x}`);
  if (t.y !== IDENTITY_TRANSFORM.y) parts.push(`y: ${t.y}`);
  if (t.scale !== IDENTITY_TRANSFORM.scale) parts.push(`scale: ${round2(t.scale)}`);
  if (t.rotate !== IDENTITY_TRANSFORM.rotate) parts.push(`rotate: ${t.rotate}`);
  return `{ ${parts.join(', ')} }`;
}

function GridWithNone({
  options,
  activeKey,
  onPick,
}: {
  options: AvatarOption[];
  activeKey: string | null;
  onPick: (k: string | null) => void;
}): React.ReactElement {
  return (
    <>
      <NoneTile active={activeKey === null} onClick={() => onPick(null)} />
      {options.map((o) => (
        <Tile key={o.key} label={o.label} asset={o.asset} active={activeKey === o.key} onClick={() => onPick(o.key)} />
      ))}
    </>
  );
}

function EmptyOrGrid(props: {
  options: AvatarOption[];
  activeKey: string | null;
  onPick: (k: string | null) => void;
  soon: string;
}): React.ReactElement {
  if (props.options.length === 0) {
    return (
      <div className="av-empty">
        <span aria-hidden="true" className="av-empty-icon">{'○'}</span>
        <p>{props.soon}</p>
      </div>
    );
  }
  return <GridWithNone options={props.options} activeKey={props.activeKey} onPick={props.onPick} />;
}

function Tile({
  label,
  asset,
  active,
  onClick,
}: {
  label: string;
  asset: string | null;
  active: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button type="button" className={`av-tile ${active ? 'is-active' : ''}`} onClick={onClick} aria-pressed={active}>
      {asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset} alt="" className="av-thumb" loading="lazy" draggable={false} />
      ) : null}
      <span className="av-tile-label">{label}</span>
      {active && <span className="av-check" aria-hidden="true">{'✓'}</span>}
    </button>
  );
}

function NoneTile({ active, onClick }: { active: boolean; onClick: () => void }): React.ReactElement {
  return (
    <button type="button" className={`av-tile av-none ${active ? 'is-active' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="av-none-mark" aria-hidden="true" />
      <span className="av-tile-label">None</span>
      {active && <span className="av-check" aria-hidden="true">{'✓'}</span>}
    </button>
  );
}

function Sparkle({ className }: { className: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" width="24" height="24">
      <path d="M12 0c.6 5.4 2.6 7.4 8 8-5.4.6-7.4 2.6-8 8-.6-5.4-2.6-7.4-8-8 5.4-.6 7.4-2.6 8-8z" fill="currentColor" />
    </svg>
  );
}

const STUDIO_CSS = `
.av-studio { display: grid; gap: 18px; max-width: 1060px; margin: 0 auto; }
.av-studio > * { min-width: 0; }
.av-stage {
  position: relative; overflow: hidden;
  border-radius: 26px; padding: 24px 20px 20px;
  background:
    radial-gradient(130% 100% at 50% -8%, color-mix(in srgb, var(--brand) 13%, var(--surface)) 0%, var(--surface) 58%);
  border: 1px solid var(--border);
  box-shadow: 0 24px 60px -34px color-mix(in srgb, var(--brand) 60%, transparent), 0 1px 0 rgba(255,255,255,.5) inset;
}
.av-glow {
  position: absolute; left: 50%; top: -16%; width: 86%; aspect-ratio: 1; translate: -50% 0;
  background: radial-gradient(circle, color-mix(in srgb, var(--brand) 26%, transparent) 0%, transparent 62%);
  filter: blur(10px); pointer-events: none;
}
.av-spark { position: absolute; color: color-mix(in srgb, var(--brand) 78%, white); opacity: .6; }
.av-spark-1 { top: 20px; left: 26px; width: 16px; }
.av-spark-2 { top: 40px; right: 30px; width: 12px; opacity: .48; }
.av-plate {
  position: relative; width: min(78vw, 340px); margin: 0 auto;
}
.av-canvas {
  position: relative; width: 100%; aspect-ratio: 1; border-radius: 24px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand) 7%, var(--surface)) 0%, var(--surface) 70%);
  box-shadow: inset 0 0 0 1px var(--border), inset 0 -22px 40px -30px color-mix(in srgb, var(--brand) 50%, transparent);
  overflow: hidden;
}
.av-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.av-floor {
  position: absolute; left: 50%; bottom: 14px; translate: -50% 0;
  width: 54%; height: 16px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--txt1) 22%, transparent) 0%, transparent 70%);
  filter: blur(2px); pointer-events: none;
}
.av-controls { display: grid; grid-template-columns: 1fr 1fr 1.25fr; gap: 9px; margin-top: 16px; }
.av-btn {
  appearance: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 13px;
  border-radius: 14px; padding: 12px 10px; border: 1px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: transform .12s ease, background .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.av-btn-ghost { background: var(--surface); color: var(--txt1); }
.av-btn-ghost:hover { border-color: color-mix(in srgb, var(--brand) 40%, var(--border)); }
.av-btn-brand {
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand) 92%, white) 0%, var(--brand) 100%);
  color: #fff; border-color: transparent;
  box-shadow: 0 12px 24px -12px color-mix(in srgb, var(--brand) 92%, transparent);
}
.av-btn:disabled { opacity: .65; cursor: default; }
.av-note { text-align: center; font-size: 11.5px; color: var(--txt3); margin: 10px 0 0; }
.av-note-warn { color: var(--brand); }
.av-picker {
  border-radius: 22px; border: 1px solid var(--border); background: var(--surface);
  padding: 14px; box-shadow: 0 14px 36px -28px rgba(0,0,0,.5);
}
.av-tabs { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; margin-bottom: 4px; }
.av-tabs::-webkit-scrollbar { display: none; }
.av-tab {
  flex: 0 0 auto; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 12.5px;
  white-space: nowrap; padding: 8px 15px; border-radius: 999px;
  border: 1px solid var(--border); background: var(--surface-alt); color: var(--txt2);
  transition: background .15s ease, color .15s ease, transform .12s ease, border-color .15s ease;
}
.av-tab:hover { border-color: color-mix(in srgb, var(--brand) 35%, var(--border)); }
.av-tab.is-active { background: var(--brand); color: #fff; border-color: transparent; }
.av-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.av-tile {
  position: relative; cursor: pointer; font-family: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  gap: 4px; padding: 9px 6px 8px; aspect-ratio: 1 / 1;
  border-radius: 16px; border: 1.5px solid var(--border); background: var(--surface-alt);
  transition: border-color .14s ease, transform .12s ease, box-shadow .14s ease;
}
.av-tile.is-active { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 20%, transparent); }
.av-thumb { width: 100%; flex: 1; min-height: 0; object-fit: contain; }
.av-tile-label { font-size: 10.5px; font-weight: 600; color: var(--txt2); text-align: center; line-height: 1.1; }
.av-tile.is-active .av-tile-label { color: var(--brand); }
.av-check {
  position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 50%;
  background: var(--brand); color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center;
  box-shadow: 0 2px 6px -2px color-mix(in srgb, var(--brand) 80%, transparent);
}
.av-none-mark {
  flex: 1; width: 100%; border-radius: 11px;
  background: repeating-linear-gradient(45deg, var(--surface) 0 7px, transparent 7px 14px), color-mix(in srgb, var(--txt3) 16%, var(--surface));
  box-shadow: inset 0 0 0 1px var(--border);
}
.av-swatch { justify-content: center; gap: 9px; }
.av-swatch-dot { width: 40px; height: 40px; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(255,255,255,.55), 0 3px 8px -3px rgba(0,0,0,.45); }
.av-empty { grid-column: 1 / -1; text-align: center; color: var(--txt3); padding: 32px 12px; font-size: 13px; }
.av-empty-icon { display: block; font-size: 26px; margin-bottom: 6px; opacity: .55; }

.av-tune { margin-top: 14px; border-top: 1px dashed var(--border); padding-top: 12px; }
.av-tune-hint { font-size: 12px; color: var(--txt3); margin: 0; text-align: center; }
.av-tune-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--txt2); margin-bottom: 8px; text-transform: capitalize; }
.av-tune-reset { font-size: 11px; color: var(--brand); background: none; border: none; cursor: pointer; font-family: inherit; }
.av-tune-row { display: grid; grid-template-columns: 52px 32px 1fr 32px; align-items: center; gap: 8px; margin-bottom: 6px; }
.av-tune-label { font-size: 11px; color: var(--txt3); }
.av-tune-val { text-align: center; font-size: 12px; font-weight: 700; color: var(--txt1); font-variant-numeric: tabular-nums; }
.av-nudge { cursor: pointer; font-family: inherit; font-weight: 800; border: 1px solid var(--border); background: var(--surface-alt); color: var(--txt1); border-radius: 9px; height: 30px; }
.av-tune-out { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
.av-tune-out code { flex: 1; font-size: 11.5px; background: var(--surface-alt); border: 1px solid var(--border); border-radius: 9px; padding: 7px 9px; color: var(--txt1); overflow-x: auto; }
.av-tune-copy { cursor: pointer; font-family: inherit; font-weight: 700; font-size: 11.5px; border: none; background: var(--brand); color: #fff; border-radius: 9px; padding: 8px 12px; }

@media (min-width: 768px) {
  .av-studio { grid-template-columns: 0.95fr 1.05fr; align-items: start; gap: 22px; }
  .av-stage { position: sticky; top: 18px; }
  .av-plate { width: min(38vw, 380px); }
  .av-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (prefers-reduced-motion: no-preference) {
  .av-btn:hover { transform: translateY(-1px); }
  .av-btn:active { transform: translateY(0) scale(.985); }
  .av-tab:active { transform: scale(.96); }
  .av-tile:hover { transform: translateY(-2px); }
  .av-spark { animation: av-twinkle 3.4s ease-in-out infinite; }
  .av-spark-2 { animation-delay: 1s; }
  .av-layer { transition: transform .2s cubic-bezier(.2,.8,.2,1), opacity .18s ease; }
}
@keyframes av-twinkle { 0%, 100% { opacity: .22; transform: scale(.82); } 50% { opacity: .66; transform: scale(1); } }
`;
