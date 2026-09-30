/**
 * Belt crossings: where two straight belts touch, they share a fixed-length plate and take turns.
 * Pure geometry, no game state: the simulation feeds it belt segments and arbitrates the plates.
 */
import { CROSS_HALF, CROSS_SHARED_CLEAR, CROSS_TOUCH } from './config';

interface P {
  x: number;
  y: number;
}

export interface Segment {
  /** The owning machine's id: every belt is owned by exactly one machine. */
  id: number;
  a: P;
  b: P;
  /** Centres of the machines at each end (the target is a dock centre for docks). */
  from: P;
  to: P;
  /** Machine ids at each end; a dock end is -1 - index, so it never matches a machine. */
  src: number;
  dst: number;
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

/** The part of A (as [from, till]) farther than the clearance from a machine at its end. */
function awayFrom(A: Segment, La: number, m: P): [number, number] {
  const atStart = Math.hypot(A.a.x - m.x, A.a.y - m.y) < Math.hypot(A.b.x - m.x, A.b.y - m.y);
  const d0 = Math.hypot((atStart ? A.a : A.b).x - m.x, (atStart ? A.a : A.b).y - m.y);
  const cut = Math.max(0, CROSS_SHARED_CLEAR - d0);
  return atStart ? [cut, La] : [0, La - cut];
}

function side(id: number, c: number, L: number): PlateSide {
  return { id, at: c, lo: Math.max(0, c - CROSS_HALF), hi: Math.min(L, c + CROSS_HALF) };
}

/**
 * Every plate between belts that touch (centre lines within the drawn belt width). A plate has
 * the same length at any angle: it sits where the lines cross, or at the middle of the stretch
 * where near-parallel belts overlap. Belts that share a machine only count away from it.
 */
export function findPlates(segs: Segment[]): Plate[] {
  const out: Plate[] = [];
  const Ls = segs.map(len);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const A = segs[i],
        B = segs[j];
      const La = Ls[i],
        Lb = Ls[j];
      let [from, till] = [0, La];
      const shared =
        A.src === B.src || A.src === B.dst
          ? A.from
          : A.dst === B.src || A.dst === B.dst
            ? A.to
            : null;
      if (shared) [from, till] = awayFrom(A, La, shared);
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
        const [bf, bt] = awayFrom(B, Lb, shared);
        if (cb < bf || cb > bt) continue;
      }
      const p = at(A, ca, La);
      const dot =
        ((A.b.x - A.a.x) * (B.b.x - B.a.x) + (A.b.y - A.a.y) * (B.b.y - B.a.y)) / (La * Lb);
      out.push({
        key: `${Math.min(A.id, B.id)}:${Math.max(A.id, B.id)}`,
        x: p.x,
        y: p.y,
        angle: Math.acos(Math.min(1, Math.abs(dot))),
        sides: [side(A.id, ca, La), side(B.id, cb, Lb)],
      });
    }
  }
  return out;
}
