'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AtlasEdge, PositionedNode } from '@/lib/verse/atlas/graph';

// V-ATLAS step 2 - THE MAP. The constellation, drawn in SVG on the V-DESIGN
// system: a three-tier hierarchy in the space's strong ink colour - solid center,
// ink-outlined travelable hubs, soft-outlined leaves, dashed wanted nodes in
// Build mode. Motion is HYBRID and hand-rolled (no deps): resting positions are
// server-computed and never change; the client only springs current positions
// toward rest - a soft settle on load, grab-and-nudge with spring-back on drag.
// prefers-reduced-motion gets the instant static map (zero animation).
// A node click NAVIGATES (opens the page); a hub click TRAVELS (re-centers,
// pushing a breadcrumb). Every node is a real, focusable link in a sane order,
// and travel is announced to assistive tech.

export interface AtlasMapProps {
  center: PositionedNode;
  nodes: PositionedNode[];
  edges: AtlasEdge[];
  trail: Array<{ key: string; label: string }>;
  buildMode?: boolean | undefined;
}

interface Phys { x: number; y: number; vx: number; vy: number }
const STIFF = 0.14;
const DAMP = 0.72;
const DRAG_THRESHOLD = 4; // px in svg space before a press becomes a nudge, not a click

const VIEW = 278; // half-extent of the viewBox; rest radius maxes ~236 + label room

// The strong colour is --verse-ink (guaranteed contrast on every space theme),
// NOT --verse-accent (per-space that can be a pale tint). Three tiers:
// center = solid ink, travelable hub = ink outline, leaf = soft outline.
const INK = 'var(--verse-ink)';
function kindStyle(n: PositionedNode, isCenter: boolean): { r: number; fill: string; stroke: string; dash?: string; textFill: string } {
  if (isCenter) return { r: 25, fill: INK, stroke: INK, textFill: INK };
  if (n.wanted) return { r: 13, fill: 'transparent', stroke: 'color-mix(in srgb, var(--verse-ink) 55%, transparent)', dash: '4 4', textFill: 'var(--txt3, var(--verse-ink))' };
  if (n.kind === 'more') return { r: 13, fill: 'color-mix(in srgb, var(--verse-ink) 6%, var(--bg-surface))', stroke: 'color-mix(in srgb, var(--verse-ink) 40%, transparent)', dash: '2 3', textFill: INK };
  if (n.hub) return { r: 17, fill: 'color-mix(in srgb, var(--verse-ink) 12%, var(--bg-surface))', stroke: INK, textFill: INK };
  return { r: 14, fill: 'var(--bg-surface)', stroke: 'color-mix(in srgb, var(--verse-ink) 34%, transparent)', textFill: INK };
}

function trim(label: string, max = 14): string { return label.length > max ? label.slice(0, max - 1).trimEnd() + '…' : label; }

export function AtlasMap({ center, nodes, edges, trail, buildMode }: AtlasMapProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const phys = useRef<Phys[]>([]);
  const targets = useRef<Array<{ x: number; y: number }>>([]);
  const raf = useRef<number | null>(null);
  const drag = useRef<{ i: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [, forceTick] = useState(0);
  const [reduced, setReduced] = useState(true); // assume static until we learn otherwise (SSR-safe, no flash of motion)
  const [announce, setAnnounce] = useState('');

  // Learn the motion preference on the client only.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (): void => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const nodesKey = center.key + '|' + nodes.length;

  // One spring runner, shared by load-settle and drag-nudge (no duplicated loop
  // that could drift). Integrates current positions toward their targets and
  // stops the rAF once everything has settled and no drag is active.
  const startSpring = useCallback((): void => {
    if (reduced || raf.current) return;
    const step = (): void => {
      let moving = false;
      const P = phys.current, T = targets.current;
      for (let i = 0; i < P.length; i++) {
        const p = P[i]!, t = T[i]!;
        p.vx = (p.vx + (t.x - p.x) * STIFF) * DAMP;
        p.vy = (p.vy + (t.y - p.y) * STIFF) * DAMP;
        p.x += p.vx; p.y += p.vy;
        if (Math.abs(p.vx) > 0.04 || Math.abs(p.vy) > 0.04 || Math.abs(t.x - p.x) > 0.3 || Math.abs(t.y - p.y) > 0.3) moving = true;
      }
      forceTick((tk) => tk + 1);
      raf.current = (moving || drag.current) ? requestAnimationFrame(step) : null;
    };
    raf.current = requestAnimationFrame(step);
  }, [reduced]);

  // (Re)initialise physics whenever the neighbourhood changes (load or travel).
  useEffect(() => {
    targets.current = nodes.map((n) => ({ x: n.x, y: n.y }));
    phys.current = nodes.map((n) => (reduced
      ? { x: n.x, y: n.y, vx: 0, vy: 0 }
      : { x: n.x * 0.12, y: n.y * 0.12, vx: 0, vy: 0 })); // start bunched near center, settle outward
    forceTick((t) => t + 1);
    setAnnounce(`Now centered on ${center.label}. ${nodes.length - 1} connections shown.`);
    startSpring();
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, reduced]);

  const toSvg = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const u = pt.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  };

  const travelHref = (key: string): string => {
    const idx = trail.findIndex((t) => t.key === key);
    const keys = idx >= 0 ? trail.slice(0, idx + 1).map((t) => t.key) : [...trail.map((t) => t.key), key];
    return `${pathname}?hub=${encodeURIComponent(key)}&trail=${encodeURIComponent(keys.join('~'))}`;
  };

  const hrefFor = (n: PositionedNode, isCenter: boolean): string => {
    if (isCenter || n.kind === 'more' || !n.hub) return n.href; // open the page / exit
    return travelHref(n.key); // hubs travel (re-center)
  };

  const activate = (n: PositionedNode, isCenter: boolean, e: React.MouseEvent): void => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let the browser open a new tab
    e.preventDefault();
    if (drag.current?.moved) return; // a nudge, not a click
    if (isCenter || n.kind === 'more' || !n.hub) router.push(n.href);
    else router.push(travelHref(n.key));
  };

  // Pointer nudge (drag) - only on nodes; the SVG background stays scrollable.
  const onPointerDown = (i: number) => (e: React.PointerEvent): void => {
    if (reduced || e.button === 2) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const u = toSvg(e.clientX, e.clientY);
    drag.current = { i, startX: u.x, startY: u.y, moved: false };
  };
  const onPointerMove = (i: number) => (e: React.PointerEvent): void => {
    const d = drag.current; if (!d || d.i !== i) return;
    const u = toSvg(e.clientX, e.clientY);
    const dx = u.x - d.startX, dy = u.y - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) { targets.current[i] = { x: nodes[i]!.x + dx, y: nodes[i]!.y + dy }; startSpring(); }
  };
  const endDrag = (i: number) => (): void => {
    const d = drag.current; if (!d || d.i !== i) return;
    targets.current[i] = { x: nodes[i]!.x, y: nodes[i]!.y }; // spring back to rest
    const moved = d.moved;
    drag.current = null;
    if (moved) startSpring(); // let it spring home; a moved press already suppressed its click
  };

  const P = phys.current.length === nodes.length ? phys.current : nodes.map((n) => ({ x: n.x, y: n.y, vx: 0, vy: 0 }));
  const posOf = (key: string): Phys => { const idx = nodes.findIndex((n) => n.key === key); return P[idx] ?? { x: 0, y: 0, vx: 0, vy: 0 }; };

  return (
    <div className="relative">
      <p aria-live="polite" className="sr-only">{announce}</p>

      {/* Breadcrumb trail of the journey. */}
      {trail.length > 1 ? (
        <nav aria-label="Atlas trail" className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]">
          {trail.map((t, i) => (
            <span key={t.key} className="inline-flex items-center gap-1.5">
              {i > 0 ? <span aria-hidden className="text-tertiary">/</span> : null}
              {i === trail.length - 1
                ? <span className="font-bold" style={{ color: 'var(--verse-ink)' }}>{t.label}</span>
                : <a href={travelHref(t.key)} onClick={(e) => { e.preventDefault(); router.push(travelHref(t.key)); }} className="verse-link no-underline hover:underline">{t.label}</a>}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--verse-line)', background: 'radial-gradient(120% 80% at 50% 8%, color-mix(in srgb, var(--verse-ink) 5%, transparent), transparent 70%)' }}>
        <svg
          ref={svgRef}
          viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
          className="block h-auto w-full"
          style={{ maxHeight: '62vh', aspectRatio: '1 / 1', touchAction: 'pan-y' }}
          role="group"
          aria-label={`Constellation map centered on ${center.label}`}
        >
          {/* Edges. */}
          <g stroke="color-mix(in srgb, var(--verse-ink) 20%, transparent)" strokeWidth={1} opacity={0.85}>
            {edges.map((e, i) => {
              const a = posOf(e.a), b = posOf(e.b);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
          </g>

          {/* Nodes, in focus order (center, ring 1, ring 2). */}
          {nodes.map((n, i) => {
            const isCenter = n.key === center.key;
            const s = kindStyle(n, isCenter);
            const p = P[i] ?? { x: n.x, y: n.y };
            // Fan each label radially OUTWARD from center so labels don't collide
            // with the ring or each other (rest angle; label rides with the node).
            const ang = isCenter ? Math.PI / 2 : Math.atan2(n.y, n.x);
            const cos = Math.cos(ang), sin = Math.sin(ang);
            // Round label coords to integers: cross-engine float precision (Node
            // vs browser V8) otherwise diverges in the last digit -> hydration mismatch.
            const lx = isCenter ? 0 : Math.round(cos * (s.r + 8));
            const ly = isCenter ? s.r + 14 : Math.round(sin * (s.r + 8) + 4);
            const anchor: 'start' | 'middle' | 'end' = isCenter || Math.abs(cos) < 0.34 ? 'middle' : cos > 0 ? 'start' : 'end';
            return (
              <a
                key={n.key}
                href={hrefFor(n, isCenter)}
                onClick={(e) => activate(n, isCenter, e)}
                onPointerDown={onPointerDown(i)}
                onPointerMove={onPointerMove(i)}
                onPointerUp={endDrag(i)}
                onPointerCancel={endDrag(i)}
                style={{ cursor: 'pointer', touchAction: 'none' }}
                aria-label={`${n.label}${n.wanted ? ' (wanted page, not written yet)' : ''}${isCenter ? ' (current, open page)' : n.hub && n.kind !== 'more' ? ' (travel here)' : ''}`}
              >
                <g transform={`translate(${p.x} ${p.y})`}>
                  {isCenter ? <circle r={s.r + 6} fill="none" stroke="var(--verse-ink)" strokeWidth={1} opacity={0.28} /> : null}
                  <circle r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={isCenter ? 2 : 1.5} strokeDasharray={s.dash} />
                  <text
                    x={lx} y={ly} textAnchor={anchor}
                    fontSize={isCenter ? 13 : 10.5} fontWeight={isCenter || n.hub ? 700 : 600}
                    fill={s.textFill} style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >{trim(n.label, isCenter ? 20 : 13)}</text>
                  <title>{`${n.label}${n.wanted ? ' (wanted)' : ''}`}</title>
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-[12px] text-tertiary">
        {reduced ? 'Tap a hub to travel, a page to open it.' : 'Drag to nudge, tap a hub to travel, a page to open it.'}
        {buildMode ? ' Dashed nodes are wanted pages.' : ''}
      </p>
    </div>
  );
}
