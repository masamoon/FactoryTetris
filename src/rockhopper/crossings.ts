/**
 * Belt crossings: where two straight belts touch, they share a fixed-length plate and take turns.
 * Pure geometry, no game state: the simulation feeds it belt segments and arbitrates the plates.
 */
import { CROSS_HALF, CROSS_SHARED_CLEAR, CROSS_SHARED_MAX, CROSS_TOUCH } from './config';

interface P {
  x: number;
  y: number;
}

export interface Segment {
  /** The owning machine's id: every belt is owned by exactly one machine. */
  id: number;
  /** Which straight piece of a bent belt this is (0 for a straight belt). */
  piece?: number;
  /** Distance along the belt at which this piece starts. */
  off?: number;
  a: P;
  b: P;
  /** Centres of the machines at each end (the target is a dock centre for docks). */
  from: P;
  to: P;
  /**
   * Machine ids at each end; a dock end is -1 - index and a bend post a unique value below
   * -1000, so neither ever matches a machine.
   */
  src: number;
  dst: number;
  /** Lab lifts (docs/ROCKHOPPER_LAB_PROJECTS.md): 1 for a raised piece; plates form within a level. */
  level?: number;
}

/** One side of a plate: the stretch of a belt it covers. */
export interface PlateSide {
  id: number;
  /** Plate centre and ends, measured along the belt from its start. */
  at: number;
  lo: number;
  hi: number;
}

export interface Plate {
  key: string;
  x: number;
  y: number;
  /** Angle between the belts in radians (0–π/2), for drawing. */
  angle: number;
  sides: [PlateSide, PlateSide];
}

const len = (s: Segment) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);

const at = (s: Segment, t: number, L: number): P => ({
  x: s.a.x + ((s.b.x - s.a.x) * t) / L,
  y: s.a.y + ((s.b.y - s.a.y) * t) / L,
});

/** Distance along `s` of the point on it nearest to `p`, clamped to the segment. */
function project(s: Segment, p: P, L: number) {
  const dx = s.b.x - s.a.x,
    dy = s.b.y - s.a.y;
  return Math.max(0, Math.min(L, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / L));
}

function distTo(s: Segment, p: P, L: number) {
  const q = at(s, project(s, p, L), L);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/** Where the centre lines properly cross, as distances along each, or null. */
function intersect(A: Segment, B: Segment, La: number, Lb: number): [number, number] | null {
  const rx = A.b.x - A.a.x,
    ry = A.b.y - A.a.y,
    qx = B.b.x - B.a.x,
    qy = B.b.y - B.a.y;
  const den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-9 * La * Lb) return null;
  const wx = B.a.x - A.a.x,
    wy = B.a.y - A.a.y;
  const t = (wx * qy - wy * qx) / den,
    u = (wx * ry - wy * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [t * La, u * Lb];
}

/**
 * The stretch [lo, hi] of A that lies within `touch` of B, restricted to [from, till]. The
 * distance along a segment to another segment is convex, so the stretch is one interval.
 */
function touching(A: Segment, B: Segment, La: number, Lb: number, from: number, till: number) {
  if (till - from < 1e-6) return null;
  const f = (t: number) => distTo(B, at(A, t, La), Lb);
  let lo = from,
    hi = till;
  for (let k = 0; k < 60; k++) {
    const m1 = lo + (hi - lo) / 3,
      m2 = hi - (hi - lo) / 3;
    if (f(m1) <= f(m2)) hi = m2;
    else lo = m1;
  }
  const best = (lo + hi) / 2;
  if (f(best) >= CROSS_TOUCH) return null;
  const edge = (inside: number, outside: number) => {
    if (f(outside) < CROSS_TOUCH) return outside;
    for (let k = 0; k < 40; k++) {
      const mid = (inside + outside) / 2;
      if (f(mid) < CROSS_TOUCH) inside = mid;
      else outside = mid;
    }
    return inside;
  };
  return { lo: edge(best, from), hi: edge(best, till) };
}

/** The far end of A from machine `m` (A starts or ends at it). */
function farEnd(A: Segment, m: P): P {
  return Math.hypot(A.a.x - m.x, A.a.y - m.y) < Math.hypot(A.b.x - m.x, A.b.y - m.y) ? A.b : A.a;
}

/**
 * How far from a shared machine two of its belts are left alone: they converge on it, so they
 * touch near it without crossing. At an angle θ between them a point on one comes within the
 * touching distance of the other at 10 / sin θ u from the machine; this uses the chord
 * 10 / (2 sin(θ/2)) instead, which is at most 0.7 u shorter below 17° (above that the 40 u floor
 * rules), and the +7 u half-plate margin covers it. The clearance grows as they close up, up to a
 * cap: beyond it, near-collinear belts really do run over each other.
 */
function sharedClear(A: Segment, B: Segment, m: P): number {
  const a = farEnd(A, m),
    b = farEnd(B, m);
  const t = Math.abs(Math.atan2(a.y - m.y, a.x - m.x) - Math.atan2(b.y - m.y, b.x - m.x));
  const theta = Math.min(t, 2 * Math.PI - t);
  const s = Math.sin(theta / 2);
  const reach = s > 1e-6 ? CROSS_TOUCH / (2 * s) + CROSS_HALF : Infinity;
  return Math.min(CROSS_SHARED_MAX, Math.max(CROSS_SHARED_CLEAR, reach));
}

/** The part of A (as [from, till]) farther than `clear` from a machine at its end. */
function awayFrom(A: Segment, La: number, m: P, clear: number): [number, number] {
  const atStart = Math.hypot(A.a.x - m.x, A.a.y - m.y) < Math.hypot(A.b.x - m.x, A.b.y - m.y);
  const d0 = Math.hypot((atStart ? A.a : A.b).x - m.x, (atStart ? A.a : A.b).y - m.y);
  const cut = Math.max(0, clear - d0);
  return atStart ? [cut, La] : [0, La - cut];
}

function side(g: Segment, c: number, L: number): PlateSide {
  const off = g.off ?? 0;
  return {
    id: g.id,
    at: off + c,
    lo: off + Math.max(0, c - CROSS_HALF),
    hi: off + Math.min(L, c + CROSS_HALF),
  };
}

/**
 * Every plate between belts that touch (centre lines within the drawn belt width). A plate has
 * the same length at any angle: it sits where the lines cross, or at the middle of the stretch
 * where near-parallel belts overlap. It is cut short where it would run off a belt's end.
 * Belts that share a machine only count away from it (see `sharedClear`).
 */
export function findPlates(segs: Segment[]): Plate[] {
  const out: Plate[] = [];
  const Ls = segs.map(len);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i],
        B = segs[j];
      // Pieces of one bent belt never share a plate with each other.
      if (A.id === B.id) continue;
      // A lifted piece runs a level up: it never shares a plate with a piece on the ground.
      if ((A.level ?? 0) !== (B.level ?? 0)) continue;
      const La = Ls[i],
        Lb = Ls[j];
      let [from, till] = [0, La];
      const shared =
        A.src === B.src || A.src === B.dst
          ? A.from
          : A.dst === B.src || A.dst === B.dst
            ? A.to
            : null;
      const clear = shared ? sharedClear(A, B, shared) : 0;
      if (shared) [from, till] = awayFrom(A, La, shared, clear);
      const touch = touching(A, B, La, Lb, from, till);
      if (!touch) continue;
      const cross = intersect(A, B, La, Lb);
      let ca: number, cb: number;
      if (cross && cross[0] >= touch.lo && cross[0] <= touch.hi) [ca, cb] = cross;
      else {
        ca = (touch.lo + touch.hi) / 2;
        cb = project(B, at(A, ca, La), Lb);
      }
      if (shared) {
        // The plate's stretch on B must also stay clear of the shared machine.
        const [bf, bt] = awayFrom(B, Lb, shared, clear);
        if (cb < bf || cb > bt) continue;
      }
      const p = at(A, ca, La);
      const dot =
        ((A.b.x - A.a.x) * (B.b.x - B.a.x) + (A.b.y - A.a.y) * (B.b.y - B.a.y)) / (La * Lb);
      const [P, Q] = A.id < B.id ? [A, B] : [B, A];
      const tag = (g: Segment) => (g.piece ? `${g.id}.${g.piece}` : `${g.id}`);
      out.push({
        key: `${tag(P)}:${tag(Q)}`,
        x: p.x,
        y: p.y,
        angle: Math.acos(Math.min(1, Math.abs(dot))),
        sides: [side(A, ca, La), side(B, cb, Lb)],
      });
    }
  }
  return out;
}
