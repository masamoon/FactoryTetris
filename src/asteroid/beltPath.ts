import { DELTAS, type Direction, type Point } from './simulation';

export interface BeltPlacement extends Point {
  direction: Direction;
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/**
 * Extend a four-connected route to a sampled pointer cell. Horizontal movement
 * wins ties, and revisiting the route trims its tail so dragging backwards
 * erases instead of creating loops.
 */
export function extendBeltPath(path: Point[], target: Point): Point[] {
  if (!path.length) return [{ ...target }];
  const next = path.map((p) => ({ ...p }));
  let cursor = next[next.length - 1];

  while (!samePoint(cursor, target)) {
    const dx = target.x - cursor.x,
      dy = target.y - cursor.y,
      step = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
    const cell = { x: cursor.x + step.x, y: cursor.y + step.y };
    const revisit = next.findIndex((p) => samePoint(p, cell));
    if (revisit >= 0) next.splice(revisit + 1);
    else next.push(cell);
    cursor = next[next.length - 1];
  }
  return next;
}

export function beltPlacements(path: Point[], fallback: Direction): BeltPlacement[] {
  return path.map((p, i) => {
    const neighbor = path[i + 1] || path[i - 1];
    if (!neighbor) return { ...p, direction: fallback };
    const dx = neighbor.x - p.x,
      dy = neighbor.y - p.y;
    let directionIndex = DELTAS.findIndex((d) => d.x === dx && d.y === dy);
    if (i === path.length - 1) directionIndex = DELTAS.findIndex((d) => d.x === -dx && d.y === -dy);
    const direction: Direction = directionIndex < 0 ? fallback : (directionIndex as Direction);
    return { ...p, direction };
  });
}
