/**
 * The 390 px mock of the research Lab (docs/ROCKHOPPER_RESEARCH.md, TT8): a developed bot save
 * (factories on, T3 open) is loaded in the real game at phone size, the camera is held at the
 * T3 zoom of 0.58, and the Lab, its drag ghost and its bubble are drawn over the game at real
 * world positions and scale. The Lab is not simulated: its hold, count and the chunk arcing into
 * it are staged. Which ores each belt carried is measured over the last 30 s of the sim before
 * the save. Requires the dev server (npm start).
 *
 *   npx tsx tools/rockhopper-lab-mock.ts [outDir]
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { CROSS_HALF, ORES, SLOTS, TICK_HZ } from '../src/rockhopper/config';
import {
  beltPath,
  crossingsOf,
  machinePos,
  pathLength,
  pointAlong,
  step,
} from '../src/rockhopper/sim';
import { serialize } from '../src/rockhopper/save';
import { runBot } from './rockhopper-bot';

const out = process.argv[2] ?? 'docs/reviews/evidence';
const url = process.env.ROCKHOPPER_URL ?? 'http://localhost:8084/';
const SEED = 2;
const MINUTES = 34;
const ZOOM = 0.58;
/** The Lab's dome radius, and TT2's clearances from plates and belt ends (world units). */
const LAB_R = 18;
const PLATE_CLEAR = CROSS_HALF + LAB_R + 4;
const END_CLEAR = 25 + LAB_R;

const { state: s } = runBot({ minutes: MINUTES, laser: true, seed: SEED, factories: true });
// Which ores each belt carried in the last 30 s (what the ghost's chips light from).
const carried = new Map<number, Set<number>>();
for (let t = 0; t < 30 * TICK_HZ; t++) {
  step(s);
  for (const m of s.machines)
    for (const it of m.out?.items ?? []) {
      if (it.alloy !== undefined) continue;
      if (!carried.has(m.id)) carried.set(m.id, new Set());
      for (const o of it.ores) carried.get(m.id)!.add(o);
    }
  s.events.length = 0;
}
const ICE = 3,
  GOLD = 4;
const byId = (id: number) => s.machines.find((x) => x.id === id)!;
const tierOf = (id: number) => {
  const m = byId(id);
  return m.kind === 'drill' ? SLOTS[m.slot].tier : 0;
};
const plates = crossingsOf(s).plates;
/** Distances along belt `id` where a plate sits. */
const platesOn = (id: number) =>
  plates.flatMap((p) => p.sides.filter((x) => x.id === id).map((x) => x.at));
/** Whether distance d along belt `id` is a legal Lab spot under TT2's clearances. */
function legal(id: number, d: number, len: number) {
  if (d < END_CLEAR || d > len - END_CLEAR) return false;
  if (!platesOn(id).every((a) => Math.abs(a - d) >= PLATE_CLEAR)) return false;
  // Clear of every machine, and of the spot its "full" chip is drawn at (render.ts), by
  // straight-line distance: their radius plus the dome's plus 4 u.
  const q = pointAlong(beltPath(s, byId(id))!, d);
  return s.machines.every((m) => {
    const c = machinePos(m);
    const r = m.kind === 'drill' ? 16 : 25;
    const chip = { x: c.x + 12, y: c.y - (m.kind === 'drill' ? 16 : 26) };
    return (
      Math.hypot(q.x - c.x, q.y - c.y) >= r + LAB_R + 4 &&
      Math.hypot(q.x - chip.x, q.y - chip.y) >= 8 + LAB_R + 4
    );
  });
}
function spotAt(id: number, d: number) {
  const a = pointAlong(beltPath(s, byId(id))!, d);
  return { id, x: a.x, y: a.y, ux: a.ux, uy: a.uy, ores: [...(carried.get(id) ?? [])] };
}
/** The longest raw drill belt matching `want`, at its legal spot farthest clear of any rock. */
function beltSpot(want: (ores: Set<number>, id: number) => boolean) {
  let best: { id: number; len: number } | null = null;
  for (const m of s.machines) {
    if (m.kind !== 'drill' || !m.out) continue;
    const ores = carried.get(m.id);
    if (!ores || !want(ores, m.id)) continue;
    const len = pathLength(beltPath(s, m)!);
    if (!best || len > best.len) best = { id: m.id, len };
  }
  if (!best) throw new Error('no belt matches');
  const p = beltPath(s, byId(best.id))!;
  const clear = (q: { x: number; y: number }) =>
    Math.min(...SLOTS.map((d) => Math.hypot(q.x - d.x, q.y - d.y) - d.r * 10));
  let at = -1;
  // Keep to the middle of the belt, clear of the machines at both ends.
  for (let d = best.len * 0.3; d <= best.len * 0.7; d += 2)
    if (
      legal(best.id, d, best.len) &&
      (at < 0 || clear(pointAlong(p, d)) > clear(pointAlong(p, at)))
    )
      at = d;
  if (at < 0) throw new Error('no legal spot');
  return spotAt(best.id, at);
}
const both = beltSpot((o, id) => o.has(ICE) && o.has(GOLD) && tierOf(id) === 2);
const iceOnly = beltSpot((o, id) => o.has(ICE) && !o.has(GOLD) && tierOf(id) === 1);
/** The Lab at minimum clearance beside a plate, on any belt with a legal spot there. */
const nearPlate = (() => {
  for (const pl of plates)
    for (const side of pl.sides) {
      const len = pathLength(beltPath(s, byId(side.id))!);
      // The nearest legal spot to the plate, from its minimum clearance outwards.
      for (let e = PLATE_CLEAR; e <= PLATE_CLEAR + 40; e += 2)
        for (const d of [side.at - e, side.at + e])
          if (legal(side.id, d, len)) return { ...spotAt(side.id, d), fromPlate: e };
    }
  return null;
})();
const slotsOpen = s.slots.filter((x) => x.unlocked).length;
console.log(
  `seed ${SEED}, ${MINUTES} min bot save (+30 s): ${s.machines.length} machines, ${slotsOpen} slots open, ${plates.length} plates`
);
console.log(`Lab belt: drill #${both.id} (T2), carried ${both.ores.join(',')}`);
console.log(`ghost belt: drill #${iceOnly.id} (T1), carried ${iceOnly.ores.join(',')}`);
console.log(
  nearPlate
    ? `beside a plate: belt #${nearPlate.id}, ${nearPlate.fromPlate} u from it`
    : 'no legal spot beside a plate'
);

const oreDefs = Object.fromEntries(
  Object.entries(ORES).map(([k, v]) => [k, { color: v.color, name: v.name }])
);

/** Everything drawn in the page: kept self-contained, it runs in the browser. */
function install(arg: { ores: Record<string, { color: string; name: string }>; zoom: number }) {
  const INK = '#16102E',
    DEEP = '#2E2566',
    CREAM = '#FFF4E0',
    LILAC = '#C9C3E6',
    MINT = '#3CF0A8',
    CORAL = '#FF6B5B';
  const LAB_R_PAGE = 18;
  type P = { x: number; y: number };
  type R = {
    toScreen(p: P): P;
    cam: { z: number };
    goal(s: unknown, reveal: boolean): { x: number; y: number; z: number };
  };
  const w = window as unknown as { __rockhopper: { renderer: R }; __mock: unknown };
  // Hold the camera at the T3 zoom the spec names.
  const r = w.__rockhopper.renderer;
  const goal = r.goal.bind(r);
  const pan = { y: 0 };
  r.goal = (st, rv) => {
    const g = goal(st, rv);
    return { ...g, y: g.y + pan.y, z: arg.zoom };
  };
  (window as unknown as { __mockPan: typeof pan }).__mockPan = pan;
  const cv = document.createElement('canvas');
  const dpr = window.devicePixelRatio;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  Object.assign(cv.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: innerWidth + 'px',
    height: innerHeight + 'px',
    pointerEvents: 'none',
    zIndex: '5',
  });
  document.body.append(cv);
  const c = cv.getContext('2d')!;
  const shapeOf = (cx: CanvasRenderingContext2D, ore: number, k: number, bar = false) => {
    cx.beginPath();
    if (bar) {
      const wv = k * 1.55,
        h = k * 0.85;
      cx.moveTo(-wv * 0.72, -h);
      cx.lineTo(wv * 0.72, -h);
      cx.lineTo(wv, h);
      cx.lineTo(-wv, h);
      cx.closePath();
    } else if (ore === 2) cx.arc(0, 0, k * 1.05, 0, Math.PI * 2);
    else if (ore === 3) {
      cx.moveTo(0, -k * 1.2);
      cx.lineTo(k * 1.1, k * 0.9);
      cx.lineTo(-k * 1.1, k * 0.9);
      cx.closePath();
    } else if (ore === 4) {
      cx.moveTo(0, -k * 1.25);
      cx.lineTo(k * 1.1, 0);
      cx.lineTo(0, k * 1.25);
      cx.lineTo(-k * 1.1, 0);
      cx.closePath();
    } else
      for (let i = 0; i < 7; i++) {
        const a = (Math.PI / 3) * i;
        if (i) cx.lineTo(Math.cos(a) * k * 1.12, Math.sin(a) * k * 1.12);
        else cx.moveTo(Math.cos(a) * k * 1.12, Math.sin(a) * k * 1.12);
      }
  };
  /** A chunk or bar as the game draws it; `missing` is a dashed socket with a coral slash. */
  const chunk = (
    cx: CanvasRenderingContext2D,
    ore: number,
    rr: number,
    o: { bar?: boolean; missing?: boolean } = {}
  ) => {
    if (o.missing) {
      cx.save();
      shapeOf(cx, ore, rr);
      cx.setLineDash([rr * 0.5, rr * 0.35]);
      cx.lineWidth = Math.max(1.5, rr * 0.25);
      cx.strokeStyle = arg.ores[ore].color;
      cx.globalAlpha = 0.8;
      cx.stroke();
      cx.setLineDash([]);
      cx.globalAlpha = 1;
      cx.strokeStyle = CORAL;
      cx.lineCap = 'round';
      cx.lineWidth = Math.max(2, rr * 0.3);
      cx.beginPath();
      cx.moveTo(-rr * 1.1, rr * 1.1);
      cx.lineTo(rr * 1.1, -rr * 1.1);
      cx.stroke();
      cx.restore();
      return;
    }
    shapeOf(cx, ore, rr + Math.max(0.9, rr * 0.28), o.bar);
    cx.fillStyle = INK;
    cx.fill();
    shapeOf(cx, ore, rr, o.bar);
    cx.fillStyle = arg.ores[ore].color;
    cx.fill();
    cx.fillStyle = o.bar ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)';
    if (o.bar) cx.fillRect(-rr * 0.6, -rr * 0.45, rr * 1.1, rr * 0.3);
    else cx.fillRect(-rr * 0.55, -rr * 0.6, rr * 0.5, rr * 0.35);
  };
  const label = (text: string, x: number, y: number, size: number, fill = CREAM) => {
    c.font = `${size}px "Lilita One", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 6;
    c.strokeStyle = INK;
    c.strokeText(text, x, y);
    c.fillStyle = fill;
    c.fillText(text, x, y);
  };
  /** A dark pill with text, like the slot price tags. */
  const tag = (text: string, x: number, y: number, size = 14, fill = CREAM) => {
    c.font = `${size}px "Lilita One", sans-serif`;
    const tw = c.measureText(text).width + 16;
    c.fillStyle = 'rgba(22,16,46,0.92)';
    c.strokeStyle = '#3F3480';
    c.lineWidth = 2.5;
    c.beginPath();
    c.roundRect(x - tw / 2, y - size * 0.75, tw, size * 1.5, size * 0.75);
    c.fill();
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = fill;
    c.fillText(text, x, y + 1);
  };
  type Held = false | 'chunk' | 'bar';
  /**
   * The Lab at screen point p, zoom z, on a belt running along dir: a lavender glass dome on a
   * clamp whose feet run along the belt. Hold rings: one half per ore.
   */
  const lab = (
    p: P,
    z: number,
    dir: P,
    ores: [number, number],
    held: [Held, Held],
    o: { holo?: boolean; inert?: boolean } = {}
  ) => {
    c.save();
    c.translate(p.x, p.y);
    c.scale(z, z);
    if (o.holo) c.globalAlpha = 0.7;
    c.save();
    c.rotate(Math.atan2(dir.y, dir.x));
    c.fillStyle = INK;
    c.beginPath();
    c.roundRect(-22, -7.5, 44, 15, 6);
    c.fill();
    c.fillStyle = o.holo ? CREAM : '#E6D3B3';
    c.beginPath();
    c.roundRect(-19.5, -5, 39, 10, 4);
    c.fill();
    c.restore();
    // Hold rings, at least 3 px on screen: lit in the ore's colour, else that colour dashed.
    // The hologram and an inert Lab draw no rings: only the ghost's pill speaks about ores.
    const lw = Math.max(4.2, 3 / z);
    for (const k of o.holo || o.inert ? [] : [0, 1]) {
      const a0 = k === 0 ? Math.PI * 0.58 : -Math.PI * 0.42,
        a1 = k === 0 ? Math.PI * 1.42 : Math.PI * 0.42;
      c.lineCap = 'round';
      c.strokeStyle = INK;
      c.lineWidth = lw + 3.4;
      c.beginPath();
      c.arc(0, -5, 18, a0, a1);
      c.stroke();
      c.strokeStyle = arg.ores[ores[k]].color;
      c.lineWidth = lw;
      if (!held[k]) {
        c.globalAlpha = 0.5;
        c.setLineDash([3.5, 4]);
      }
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = o.holo ? 0.7 : 1;
    }
    // Lavender glass dome.
    c.fillStyle = INK;
    c.beginPath();
    c.arc(0, -5, 13.5, Math.PI, 0);
    c.lineTo(13.5, 1);
    c.lineTo(-13.5, 1);
    c.fill();
    c.fillStyle = o.holo ? CREAM : LILAC;
    c.beginPath();
    c.arc(0, -5, 11, Math.PI, 0);
    c.lineTo(11, -1.5);
    c.lineTo(-11, -1.5);
    c.fill();
    if (!o.holo) {
      c.fillStyle = DEEP;
      c.beginPath();
      c.arc(0, -4, 7.5, Math.PI, 0);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath();
      c.ellipse(-7, -10, 1.6, 3.2, -0.6, 0, Math.PI * 2);
      c.fill();
    }
    held.forEach((h, k) => {
      if (!h || o.holo) return;
      c.save();
      c.translate(k === 0 ? -3.4 : 3.4, -6.5);
      chunk(c, ores[k], 2.4, { bar: h === 'bar' });
      c.restore();
    });
    // Antenna with a mint bulb: research.
    c.strokeStyle = INK;
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(0, -16);
    c.lineTo(0, -22);
    c.stroke();
    c.fillStyle = INK;
    c.beginPath();
    c.arc(0, -23.5, 3.8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = o.inert ? '#6F66A0' : MINT;
    c.beginPath();
    c.arc(0, -23.5, 2.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };
  /** The ghost's chips: each ore lit if the belt carried it in the last 30 s, else missing. */
  const chipPill = (x: number, y: number, ores: number[], lit: boolean[]) => {
    const wv = 30 * ores.length + 12;
    x = Math.max(8 + wv / 2, Math.min(innerWidth - 8 - wv / 2, x));
    c.fillStyle = 'rgba(22,16,46,0.92)';
    c.strokeStyle = '#3F3480';
    c.lineWidth = 3;
    c.beginPath();
    c.roundRect(x - wv / 2, y - 18, wv, 36, 18);
    c.fill();
    c.stroke();
    ores.forEach((o, i) => {
      c.save();
      c.translate(x - wv / 2 + 21 + i * 30, y);
      chunk(c, o, 7.5, { missing: !lit[i] });
      c.restore();
    });
  };
  /** The game's placement hologram footprint (render.ts hologram): shadow, ring, crosshair. */
  const footprint = (g: P, z: number, ok: boolean, lift: number) => {
    const R = LAB_R_PAGE;
    c.save();
    c.translate(g.x, g.y);
    c.scale(z, z);
    c.fillStyle = 'rgba(10,6,28,0.5)';
    c.beginPath();
    c.ellipse(0, 0, R * (0.85 - lift / 120), R * (0.62 - lift / 160), 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = ok ? MINT : CORAL;
    c.lineWidth = 3 / z;
    c.setLineDash([6 / z, 5 / z]);
    c.beginPath();
    c.arc(0, 0, R + 4, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.lineWidth = 2 / z;
    c.strokeStyle = CREAM;
    c.beginPath();
    c.moveTo(-7, 0);
    c.lineTo(7, 0);
    c.moveTo(0, -7);
    c.lineTo(0, 7);
    c.stroke();
    if (!ok) {
      c.strokeStyle = CORAL;
      c.lineWidth = 4 / z;
      c.beginPath();
      c.moveTo(-R * 0.5, -R * 0.5);
      c.lineTo(R * 0.5, R * 0.5);
      c.moveTo(R * 0.5, -R * 0.5);
      c.lineTo(-R * 0.5, R * 0.5);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,244,224,0.5)';
    c.lineWidth = 1.5 / z;
    c.setLineDash([3 / z, 3 / z]);
    c.beginPath();
    c.moveTo(0, -lift + R * 0.4);
    c.lineTo(0, -2);
    c.stroke();
    c.setLineDash([]);
    c.restore();
  };
  type Data = {
    lab: P & { ux: number; uy: number };
    ores: [number, number];
    held: [Held, Held];
    count?: string;
    arc?: boolean;
    ghost?: P & { ux: number; uy: number };
    ok?: boolean;
    lit?: boolean[];
    finger?: P;
    noBelt?: boolean;
    reveal?: string;
  };
  const scene = { kind: 'none', data: null as unknown as Data };
  const frame = () => {
    const z = r.cam.z;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    const d = scene.data;
    if (scene.kind === 'ghost' && d.ghost) {
      // A Lab being placed or moved: the game's hologram, lifted above the snap point.
      const g = r.toScreen(d.ghost);
      const lift = 16;
      footprint(g, z, d.ok !== false, lift);
      const dir = { x: d.ghost.ux, y: d.ghost.uy };
      lab({ x: g.x, y: g.y - lift * z }, z, dir, d.ores, [false, false], { holo: true });
      const y = g.y - 36 * Math.max(1, z) - 26;
      if (d.ok === false) label('drop it on a belt', g.x, y, 15);
      else chipPill(g.x, y, d.ores, d.lit!);
      if (d.finger) {
        const f = r.toScreen(d.finger);
        c.fillStyle = 'rgba(255,244,224,0.35)';
        c.beginPath();
        c.arc(f.x, f.y + 30, 16, 0, Math.PI * 2);
        c.fill();
      }
    } else if (scene.kind === 'lab') {
      const p = r.toScreen(d.lab);
      if (d.arc) {
        // A skimmed gold chunk mid-arc, at the size chunks are drawn on belts (×1.3 airborne).
        const from = r.toScreen({ x: d.lab.x - d.lab.ux * 22, y: d.lab.y - d.lab.uy * 22 });
        const to = { x: p.x, y: p.y - 7 * z };
        const t = 0.6;
        const mx = from.x + (to.x - from.x) * t,
          my = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 20 * z;
        c.setLineDash([2, 3]);
        c.strokeStyle = 'rgba(255,244,224,0.7)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(from.x, from.y);
        c.quadraticCurveTo((from.x + mx) / 2, my - 3, mx, my);
        c.stroke();
        c.setLineDash([]);
        c.save();
        c.translate(mx, my);
        chunk(c, d.ores[1], 3.8 * 1.3 * z);
        c.restore();
      }
      lab(p, z, { x: d.lab.ux, y: d.lab.uy }, d.ores, d.held, { inert: d.noBelt });
      const ty = p.y - 34 * z - 8;
      if (d.noBelt) tag('no belt', p.x, ty, 14, CORAL);
      else if (d.count) tag(d.count, p.x, ty, 14, d.count === 'tap to pick' ? MINT : CREAM);
      if (d.reveal) label(d.reveal, p.x, ty - 24, 16, MINT);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  w.__mock = scene;
}

/** The Lab's bubble, built from the game's bubble classes and placed by its positionBubble rule. */
function bubble(arg: {
  ores: Record<string, { color: string; name: string }>;
  lab: { x: number; y: number };
}) {
  type P = { x: number; y: number };
  const a = (window as unknown as { __rockhopper: { renderer: { toScreen(p: P): P } } })
    .__rockhopper;
  const rows: [number, number, number, number, boolean][] = [
    [3, 4, 12, 60, true],
    [2, 4, 0, 60, false],
    [3, 5, 0, 20, false],
    [4, 5, 0, 20, false],
  ];
  const b = document.createElement('div');
  b.className = 'rh-bubble';
  Object.assign(b.style, {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '6px',
    borderRadius: '26px',
    zIndex: '6',
  });
  const note = document.createElement('div');
  note.className = 'rh-note';
  note.innerHTML = '<b>Research</b>: bring both ores to the Lab';
  b.append(note);
  const chipCanvas = (o: number) => {
    const cv = document.createElement('canvas');
    cv.width = 40;
    cv.height = 40;
    cv.style.width = '20px';
    cv.style.height = '20px';
    const cx = cv.getContext('2d')!;
    cx.translate(20, 20);
    cx.beginPath();
    const k = 11;
    if (o === 2) cx.arc(0, 0, k, 0, Math.PI * 2);
    else if (o === 3) {
      cx.moveTo(0, -k * 1.2);
      cx.lineTo(k * 1.1, k * 0.9);
      cx.lineTo(-k * 1.1, k * 0.9);
      cx.closePath();
    } else if (o === 4) {
      cx.moveTo(0, -k * 1.25);
      cx.lineTo(k * 1.1, 0);
      cx.lineTo(0, k * 1.25);
      cx.lineTo(-k * 1.1, 0);
      cx.closePath();
    } else
      for (let i = 0; i < 7; i++) {
        const t = (Math.PI / 3) * i;
        if (i) cx.lineTo(Math.cos(t) * k, Math.sin(t) * k);
        else cx.moveTo(Math.cos(t) * k, Math.sin(t) * k);
      }
    cx.fillStyle = arg.ores[o].color;
    cx.lineWidth = 4;
    cx.strokeStyle = '#16102E';
    cx.fill();
    cx.stroke();
    return cv;
  };
  for (const [x, y, n, of, on] of rows) {
    // The active row is cream with a mint ring and an "Active" tag: mint fill means spending.
    const btn = document.createElement('button');
    btn.className = 'rh-pill';
    Object.assign(btn.style, {
      justifyContent: 'space-between',
      gap: '14px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: on ? '0 0 0 3px #3CF0A8, 0 4px 0 #16102E' : '',
    });
    const left = document.createElement('span');
    Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '4px' });
    left.append(chipCanvas(x), chipCanvas(y));
    const name = document.createElement('span');
    Object.assign(name.style, {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: '1',
      marginLeft: '4px',
    });
    if (on) {
      const lv = document.createElement('span');
      lv.className = 'rh-lv';
      lv.textContent = '▶ Active';
      Object.assign(lv.style, { fontSize: '12px', color: '#0E7A50' });
      name.append(lv);
    }
    const nm = document.createElement('span');
    nm.textContent = `${arg.ores[x].name} + ${arg.ores[y].name.toLowerCase()}`;
    name.append(nm);
    left.append(name);
    const count = document.createElement('span');
    count.textContent = `${n} / ${of}`;
    // A thin progress bar along the bottom of the row.
    const bar = document.createElement('span');
    Object.assign(bar.style, {
      position: 'absolute',
      left: '14px',
      right: '14px',
      bottom: '5px',
      height: '4px',
      borderRadius: '2px',
      background: 'rgba(22,16,46,0.15)',
    });
    const fill = document.createElement('span');
    Object.assign(fill.style, {
      display: 'block',
      height: '100%',
      width: `${(100 * n) / of}%`,
      borderRadius: '2px',
      background: '#1A9E6B',
    });
    bar.append(fill);
    btn.append(left, count, bar);
    b.append(btn);
  }
  const move = document.createElement('button');
  move.className = 'rh-round rh-move';
  move.style.alignSelf = 'center';
  move.innerHTML =
    '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M11 2 V20 M2 11 H20 M11 2 L8 5 M11 2 L14 5 M11 20 L8 17 M11 20 L14 17 M2 11 L5 8 M2 11 L5 14 M20 11 L17 8 M20 11 L17 14"/></svg>';
  b.append(move);
  document.body.append(b);
  // App.positionBubble: above the anchor unless that crosses the top inset, then below; always
  // clamped above the tray.
  const tray = document.querySelector('.rh-tray') as HTMLElement | null;
  const insetTop = 84;
  const insetBottom = Math.max(110, innerHeight - (tray?.offsetTop ?? innerHeight) + 8);
  const p = a.renderer.toScreen(arg.lab);
  const wv = b.offsetWidth,
    h = b.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - wv - 8, p.x - wv / 2));
  // Clear of the count tag above the dome, unlike a machine bubble.
  let y = p.y - h - 52;
  if (y < insetTop) y = p.y + 44;
  y = Math.max(insetTop, Math.min(y, innerHeight - insetBottom - h));
  b.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, name) });
  console.log(`wrote ${path.join(out, name)}`);
}

/** A close crop around a world point, at the page's device pixels (nothing is redrawn larger). */
async function crop(page: Page, name: string, at: { x: number; y: number }) {
  await page.waitForTimeout(300);
  const q = await page.evaluate(
    (p) =>
      (
        window as unknown as {
          __rockhopper: {
            renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
          };
        }
      ).__rockhopper.renderer.toScreen(p),
    { x: at.x, y: at.y }
  );
  const x = Math.max(0, Math.min(390 - 180, q.x - 90));
  await page.screenshot({
    path: path.join(out, name),
    clip: { x, y: Math.max(0, q.y - 105), width: 180, height: 140 },
  });
  console.log(`wrote ${path.join(out, name)}`);
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  const save = serialize(s);
  // tsx names inner functions with a helper the page doesn't have.
  await page.addInitScript('window.__name = (f) => f;');
  await page.addInitScript((t) => {
    if (!sessionStorage.getItem('mocked')) {
      localStorage.clear();
      localStorage.setItem('rockhopper.save.v3', t);
      sessionStorage.setItem('mocked', '1');
    }
  }, save);
  await page.goto(url);
  await page.waitForFunction(
    () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
  );
  await page.waitForTimeout(1500);
  await page.evaluate(install, { ores: oreDefs, zoom: ZOOM });
  await page.waitForTimeout(2500); // the camera eases to the held zoom
  const z = await page.evaluate(
    () =>
      (window as unknown as { __rockhopper: { renderer: { cam: { z: number } } } }).__rockhopper
        .renderer.cam.z
  );
  console.log(`camera zoom ${z.toFixed(3)}`);
  const set = (kind: string, data: unknown) =>
    page.evaluate(
      ([k, d]) => {
        const m = (window as unknown as { __mock: { kind: string; data: unknown } }).__mock;
        m.kind = k as string;
        m.data = d;
      },
      [kind, data] as const
    );
  // Placing mode: the game dims every belt, as it does while a smelter or factory is dragged.
  const placing = (on: boolean) =>
    page.evaluate((v) => {
      const a = (window as unknown as { __rockhopper: { overlay: { placing: unknown } } })
        .__rockhopper;
      a.overlay.placing = v ? { kind: 'factory', at: null } : null;
    }, on);
  const base = { lab: both, ores: [ICE, GOLD] as [number, number] };

  // 1. Placed on a T2 drill belt: ice held, gold missing; a gold chunk arcs in.
  await set('lab', { ...base, held: ['chunk', false], count: '12 / 60', arc: true });
  await shot(page, 'rockhopper-lab-mock-placed.png');
  await crop(page, 'rockhopper-lab-mock-placed-crop.png', both);

  // 2. Both held (an ice chunk and a gold bar), about to count as a pair.
  await set('lab', { ...base, held: ['chunk', 'bar'], count: '12 / 60' });
  await crop(page, 'rockhopper-lab-mock-pair-crop.png', both);

  // 3. Learned: the reveal line, then the Lab idles.
  await set('lab', {
    ...base,
    held: [false, false],
    count: 'tap to pick',
    reveal: 'Ice + gold learned',
  });
  await crop(page, 'rockhopper-lab-mock-learned-crop.png', both);

  // 4. Its belt was re-targeted away and nothing legal is near: "no belt".
  // Shown where it was left, off the belt (40 u to the side of its old spot).
  const offBelt = { ...both, x: both.x - both.uy * 40, y: both.y + both.ux * 40 };
  await set('lab', { ...base, lab: offBelt, held: [false, false], noBelt: true });
  await crop(page, 'rockhopper-lab-mock-no-belt-crop.png', offBelt);

  // 5. Beside a crossing plate at TT2's minimum clearance.
  if (nearPlate) {
    await set('lab', { ...base, lab: nearPlate, held: ['chunk', false], count: '12 / 60' });
    await shot(page, 'rockhopper-lab-mock-beside-plate.png');
    await crop(page, 'rockhopper-lab-mock-beside-plate-crop.png', nearPlate);
  }

  // 6. Moving it (placing mode, other belts dimmed): over a T1 belt with ice but no gold.
  await placing(true);
  await set('ghost', {
    ...base,
    ghost: iceOnly,
    finger: iceOnly,
    lit: [ICE, GOLD].map((o) => iceOnly.ores.includes(o)),
  });
  await shot(page, 'rockhopper-lab-mock-ghost-one-ore.png');
  await crop(page, 'rockhopper-lab-mock-ghost-one-ore-crop.png', iceOnly);

  // 7. Over the T2 belt: both chips lit.
  await set('ghost', { ...base, ghost: both, finger: both, lit: [true, true] });
  await shot(page, 'rockhopper-lab-mock-ghost-both.png');
  await crop(page, 'rockhopper-lab-mock-ghost-both-crop.png', both);

  // 8. Off any belt: refused, with the game's coral ring, cross and reason.
  const off = { x: 140, y: -330, ux: 1, uy: 0 };
  await set('ghost', { ...base, ghost: off, finger: off, ok: false });
  await shot(page, 'rockhopper-lab-mock-ghost-off-belt.png');
  await crop(page, 'rockhopper-lab-mock-ghost-off-belt-crop.png', off);
  await placing(false);

  // 9. The Lab's bubble: four available recipes (copper + ice is learned), Move. A four-row
  // bubble fits neither above nor below a Lab mid-screen, so opening it first pans the camera
  // until the Lab sits just above the tray, and the bubble opens above it.
  await set('lab', { ...base, held: ['chunk', false], count: '12 / 60' });
  await page.evaluate((lab) => {
    const w = window as unknown as {
      __rockhopper: {
        renderer: {
          toScreen(p: { x: number; y: number }): { x: number; y: number };
          cam: { z: number };
        };
      };
      __mockPan: { y: number };
    };
    const tray = document.querySelector('.rh-tray') as HTMLElement | null;
    const want = (tray?.offsetTop ?? innerHeight - 130) - 50;
    const p = w.__rockhopper.renderer.toScreen(lab);
    w.__mockPan.y -= (want - p.y) / w.__rockhopper.renderer.cam.z;
  }, both);
  await page.waitForTimeout(2000);
  await page.evaluate(bubble, { ores: oreDefs, lab: both });
  await shot(page, 'rockhopper-lab-mock-bubble.png');
  await browser.close();
}

void main();
