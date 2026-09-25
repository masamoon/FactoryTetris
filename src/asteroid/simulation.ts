export const WORLD_W = 36;
export const WORLD_H = 12;
export const STEP_MS = 100;
export const MAX_UNDO = 40;
export const SAVE_BUDGET = 2_000_000;
export const DOCK = { x: 1, y: 6 };
export const FRESH_DRILL_SITE = { x: 8, y: 5 };
export const THIRD_DRILL_SITE = { x: 8, y: 7 };
export const DRILL_EXTENSION_COST: Partial<Record<Resource, number>> = { part: 1 };
export const MAX_DRILLS = 3;
export const MAX_EXTENSIONS = 1;
export const POCKET_RESERVES: Record<string, number> = {
  '15,6': 96,
  '16,5': 48,
  '16,7': 120,
  '23,6': 72,
};
export type Resource = 'ore' | 'plate' | 'part';
export type Tool = 'drill' | 'belt' | 'smelter' | 'assembler';
export type Direction = 0 | 1 | 2 | 3;
export interface Point {
  x: number;
  y: number;
}
export interface Tile {
  kind: 'rock' | 'ore';
  work: number;
}
export interface Load {
  amount: number;
  from: number;
  remaining: number;
  duration: number;
}
export interface DrillExtension {
  targetEnd: number;
  remaining: number;
  duration: number;
  queued?: boolean;
}
export interface Courier {
  phase: 'idle' | 'outbound' | 'returning';
  targetId: number | null;
  resource: Resource | null;
  cargo: Resource[];
  route: Point[];
  progress: number;
  duration: number;
}
export interface Machine extends Point {
  id: number;
  kind: Tool;
  direction: Direction;
  input: Resource[];
  output: Resource[];
  progress: number;
  head: number;
  end: number;
  loads: Load[];
  made: number;
  extensions?: number;
  extension?: DrillExtension;
}
export interface State {
  version: 2;
  tick: number;
  terrain: (Tile | null)[];
  pockets: Record<string, number>;
  machines: Machine[];
  stock: Record<Resource, number>;
  delivered: Record<Resource, number>;
  mined: number;
  handMined: number;
  nextId: number;
  lastTap: number;
  courier: Courier;
}
export interface Session {
  state: State;
  history: State[];
}
export interface Event {
  type:
    | 'mine'
    | 'extract'
    | 'flow'
    | 'ship'
    | 'work'
    | 'build'
    | 'extend'
    | 'courier-load'
    | 'courier-deliver';
  from: Point;
  to?: Point;
  resource?: Resource;
  amount?: number;
}
export interface BeltPlacement extends Point {
  direction: Direction;
}
export const DELTAS: Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
export const COST: Record<Tool, Partial<Record<Resource, number>>> = {
  drill: { ore: 6 },
  belt: {},
  smelter: { ore: 8 },
  assembler: { plate: 6 },
};
export const NEXT_DRILL_COST: Partial<Record<Resource, number>> = { ore: 2 };
export const THIRD_DRILL_COST: Partial<Record<Resource, number>> = { ore: 8 };
export const NAMES: Record<Tool, string> = {
  drill: 'Shaft drill',
  belt: 'Conveyor',
  smelter: 'Smelter',
  assembler: 'Assembler',
};
export const idleCourier = (): Courier => ({
  phase: 'idle',
  targetId: null,
  resource: null,
  cargo: [],
  route: [],
  progress: 0,
  duration: 0,
});
export const clone = <T>(value: T): T => structuredClone(value);
export const inside = (p: Point) =>
  Number.isInteger(p.x) &&
  Number.isInteger(p.y) &&
  p.x >= 0 &&
  p.y >= 0 &&
  p.x < WORLD_W &&
  p.y < WORLD_H;
export const tileAt = (s: State, p: Point) => (inside(p) ? s.terrain[p.y * WORLD_W + p.x] : null);
export const machineAt = (s: State, p: Point) => s.machines.find((m) => m.x === p.x && m.y === p.y);
export const isDock = (p: Point) => p.x === DOCK.x && p.y === DOCK.y;
export const tileYield = (tile: Tile) => (tile.kind === 'ore' ? 4 : 2);
export const hardness = (tile: Tile) => (tile.kind === 'ore' ? 24 : 12);
export function createState(): State {
  const terrain: (Tile | null)[] = [];
  for (let y = 0; y < WORLD_H; y++)
    for (let x = 0; x < WORLD_W; x++) {
      const edge = y === 0 ? 15 : y === 1 ? 11 : y === 2 ? 9 : y === 11 ? 10 : 8;
      const solid = x >= edge && x < WORLD_W - (y < 2 ? 3 : 0);
      const rich =
        (y === 6 && x >= 10 && x <= 22) ||
        (y === 5 && x >= 9 && x <= 16) ||
        ((x * 7 + y * 11) % 17 < 5 && x > 9);
      terrain.push(solid ? { kind: rich ? 'ore' : 'rock', work: 0 } : null);
    }
  return {
    version: 2,
    tick: 0,
    terrain,
    pockets: { ...POCKET_RESERVES },
    machines: [],
    stock: { ore: 0, plate: 0, part: 0 },
    delivered: { ore: 0, plate: 0, part: 0 },
    mined: 0,
    handMined: 0,
    nextId: 1,
    lastTap: -10,
    courier: idleCourier(),
  };
}
export const drillRailEnd = (m: Machine) => m.extension?.targetEnd ?? m.end;
export const pocketKey = (p: Point) => `${p.x},${p.y}`;
export const pocketRemaining = (s: State, m: Machine) =>
  s.pockets[pocketKey({ x: m.end, y: m.y })] || 0;
export function railOwner(s: State, p: Point) {
  return s.machines.find(
    (m) => m.kind === 'drill' && p.y === m.y && p.x > m.x && p.x <= drillRailEnd(m)
  );
}
// Open space connected to the left boundary. Buried cavities are not remote mine targets.
export function accessible(s: State): Set<number> {
  const seen = new Set<number>();
  const queue: Point[] = [];
  for (let y = 0; y < WORLD_H; y++) queue.push({ x: 0, y });
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      key = p.y * WORLD_W + p.x;
    if (!inside(p) || seen.has(key) || tileAt(s, p)) continue;
    seen.add(key);
    for (const d of DELTAS) queue.push({ x: p.x + d.x, y: p.y + d.y });
  }
  return seen;
}
export function canMine(s: State, p: Point): string | null {
  if (!inside(p) || !tileAt(s, p)) return 'Choose an exposed rock or ore block.';
  if (railOwner(s, p)) return 'This corridor belongs to a drill. Let it work.';
  const air = accessible(s);
  return DELTAS.some(
    (d) => air.has((p.y + d.y) * WORLD_W + p.x + d.x) && inside({ x: p.x + d.x, y: p.y + d.y })
  )
    ? null
    : 'Dig from an exposed face. This block is buried.';
}
function excavate(s: State, p: Point, manual: boolean, events: Event[]) {
  const tile = tileAt(s, p);
  if (!tile) return 0;
  const amount = tileYield(tile);
  s.terrain[p.y * WORLD_W + p.x] = null;
  s.mined++;
  if (manual) {
    s.stock.ore += amount;
    s.handMined += amount;
  }
  events.push({
    type: 'mine',
    from: { ...p },
    to: manual ? DOCK : undefined,
    resource: 'ore',
    amount,
  });
  return amount;
}
export function tapMine(s: State, p: Point, events: Event[]): string | null {
  const error = canMine(s, p);
  if (error) return error;
  if (s.tick - s.lastTap < 1) return null;
  s.lastTap = s.tick;
  const tile = tileAt(s, p)!;
  tile.work++;
  if (tile.work >= hardness(tile)) excavate(s, p, true, events);
  return null;
}
export function costFor(s: State, tool: Tool) {
  if (tool !== 'drill') return COST[tool];
  const drills = s.machines.filter((m) => m.kind === 'drill').length;
  return drills === 0 ? COST.drill : drills === 1 ? NEXT_DRILL_COST : THIRD_DRILL_COST;
}
export function costLabel(tool: Tool, s?: State) {
  return (
    Object.entries(s ? costFor(s, tool) : COST[tool])
      .map(([r, n]) => `${n} ${r === 'plate' ? 'plates' : r}`)
      .join(' · ') || 'Free'
  );
}
export function placementError(s: State, kind: Tool, p: Point): string | null {
  if (!inside(p)) return 'Choose a square inside the asteroid sector.';
  if (tileAt(s, p)) return 'Excavate this block before building.';
  if (isDock(p)) return 'The collection dock needs this square.';
  if (railOwner(s, p)) return 'Keep the drill corridor clear.';
  const existing = machineAt(s, p);
  if (existing && (existing.kind !== 'belt' || existing.output.length))
    return existing.kind === 'belt'
      ? 'This conveyor contains cargo. Let it drain before replacing it.'
      : 'A machine already occupies this square.';
  if (!accessible(s).has(p.y * WORLD_W + p.x)) return 'Open a route to this space first.';
  if (kind === 'drill' && s.machines.filter((m) => m.kind === 'drill').length >= MAX_DRILLS)
    return 'This sector supports three drill bases.';
  const cost = costFor(s, kind);
  for (const r of ['ore', 'plate', 'part'] as Resource[])
    if (s.stock[r] < (cost[r] || 0)) return `Need ${costLabel(kind, s)} in collection storage.`;
  if (kind === 'drill') {
    if (p.x + 1 >= WORLD_W) return 'A drill needs rock to its right.';
    const end = Math.min(p.x + 8, WORLD_W - 1);
    let rock = false;
    for (let x = p.x + 1; x <= end; x++) {
      const at = { x, y: p.y };
      if (machineAt(s, at) || railOwner(s, at) || isDock(at))
        return 'The planned shaft crosses another machine or drill rail.';
      if (tileAt(s, at)) rock = true;
    }
    if (!rock) return 'No rock within eight squares to the right.';
  }
  return null;
}
export function trimHistory(session: Session) {
  session.history = session.history.slice(-MAX_UNDO);
  let serialized = JSON.stringify(session);
  while (session.history.length && serialized.length > SAVE_BUDGET) {
    session.history.shift();
    serialized = JSON.stringify(session);
  }
  return serialized;
}
function checkpoint(session: Session) {
  session.history.push(clone(session.state));
  trimHistory(session);
}
export function build(
  session: Session,
  kind: Tool,
  p: Point,
  direction: Direction = 3
): string | null {
  const s = session.state,
    error = placementError(s, kind, p);
  if (error) return error;
  const existing = machineAt(s, p);
  if (kind === 'belt' && existing?.kind === 'belt' && existing.direction === direction) return null;
  checkpoint(session);
  s.machines = s.machines.filter((m) => m.x !== p.x || m.y !== p.y);
  const cost = costFor(s, kind);
  for (const r of ['ore', 'plate', 'part'] as Resource[]) s.stock[r] -= cost[r] || 0;
  s.machines.push({
    id: s.nextId++,
    kind,
    ...p,
    direction: kind === 'belt' ? direction : 3,
    input: [],
    output: [],
    progress: 0,
    head: p.x + 1,
    end: Math.min(WORLD_W - 1, p.x + 8),
    loads: [],
    made: 0,
    extensions: 0,
  });
  return null;
}
export function beltDragPlacementError(s: State, placement: BeltPlacement): string | null {
  const error = placementError(s, 'belt', placement);
  if (error) return error;
  const existing = machineAt(s, placement);
  if (existing?.kind === 'belt' && existing.direction !== placement.direction)
    return 'Drag cannot redirect an existing conveyor. Tap it to rotate it.';
  return null;
}
export function beltPathError(s: State, placements: BeltPlacement[]): string | null {
  if (!placements.length) return 'Draw across at least one square.';
  const seen = new Set<number>();
  for (const placement of placements) {
    if (!DELTAS[placement.direction]) return 'A conveyor direction is invalid.';
    const key = placement.y * WORLD_W + placement.x;
    if (seen.has(key)) return 'A dragged route cannot cross itself.';
    seen.add(key);
    const error = beltDragPlacementError(s, placement);
    if (error) return error;
  }
  return null;
}
export function buildBeltPath(session: Session, placements: BeltPlacement[]): string | null {
  const error = beltPathError(session.state, placements);
  if (error) return error;
  const changed = placements.filter((p) => !machineAt(session.state, p));
  if (!changed.length) return null;
  checkpoint(session);
  for (const p of changed)
    session.state.machines.push({
      id: session.state.nextId++,
      kind: 'belt',
      ...p,
      input: [],
      output: [],
      progress: 0,
      head: p.x + 1,
      end: Math.min(WORLD_W - 1, p.x + 8),
      loads: [],
      made: 0,
      extensions: 0,
    });
  return null;
}
export function drillExtensionError(s: State, drill: Machine): string | null {
  if (drill.kind !== 'drill') return 'Choose a shaft drill.';
  if (drill.extension) return 'An extension kit is already committed to this head.';
  if (
    s.machines.some(
      (m) => m.kind === 'drill' && ((m.extensions || 0) > 0 || m.extension !== undefined)
    )
  )
    return 'This prototype supports one shaft extension.';
  if (drill.head <= drill.end) return 'Finish this shaft before extending it.';
  const targetEnd = drill.end + 8;
  if (targetEnd >= WORLD_W)
    return 'A full eight-cell extension does not fit before the sector edge.';
  let rock = false;
  for (let x = drill.end + 1; x <= targetEnd; x++) {
    const p = { x, y: drill.y };
    if (machineAt(s, p) || railOwner(s, p) || isDock(p))
      return 'The extension corridor crosses a machine or another drill rail.';
    if (tileAt(s, p)) rock = true;
  }
  if (!rock) return 'No unexcavated terrain remains in the next eight cells.';
  if (s.stock.part < (DRILL_EXTENSION_COST.part || 0))
    return 'Need 1 part in collection storage for an extension kit.';
  return null;
}
export function extendDrill(session: Session, id: number): string | null {
  const drill = session.state.machines.find((m) => m.id === id);
  if (!drill) return 'Choose a shaft drill.';
  const error = drillExtensionError(session.state, drill);
  if (error) return error;
  checkpoint(session);
  session.state.stock.part -= DRILL_EXTENSION_COST.part || 0;
  const duration = Math.max(1, Math.ceil((drill.end - drill.x) * 2.5));
  drill.extension = {
    targetEnd: drill.end + 8,
    remaining: duration,
    duration,
    queued: pocketRemaining(session.state, drill) > 0 || drill.loads.length > 0,
  };
  return null;
}
export function cancelQueuedExtension(session: Session, id: number): string | null {
  const drill = session.state.machines.find((m) => m.id === id);
  if (!drill?.extension?.queued) return 'Only a queued extension can be cancelled.';
  delete drill.extension;
  session.state.stock.part += DRILL_EXTENSION_COST.part || 0;
  return null;
}
export function removeBelt(session: Session, p: Point): string | null {
  const m = machineAt(session.state, p);
  if (!m || m.kind !== 'belt')
    return 'Only empty conveyors can be removed. Use Undo for construction.';
  if (m.output.length) return 'Conveyor contains cargo. Let it drain first.';
  checkpoint(session);
  session.state.machines = session.state.machines.filter((n) => n.id !== m.id);
  return null;
}
export const processorInput = (m: Machine): Resource | null =>
  m.kind === 'smelter' ? 'ore' : m.kind === 'assembler' ? 'plate' : null;
export const manualInputAmount = (m: Machine) =>
  processorInput(m) && m.input.length < 4 ? (m.input.length % 2 === 0 ? 2 : 1) : 0;
export const reservedInput = (s: State, m: Machine) =>
  s.courier.phase === 'outbound' && s.courier.targetId === m.id ? s.courier.cargo.length : 0;
export function manualInputError(s: State, m: Machine): string | null {
  const resource = processorInput(m);
  if (!resource) return 'Only smelters and assemblers accept manual input.';
  if (m.input.length + reservedInput(s, m) >= 4) return 'Input buffer is full.';
  if (s.courier.phase !== 'idle')
    return s.courier.phase === 'outbound'
      ? 'The service drone is already making a delivery.'
      : 'The service drone is returning to collection.';
  const amount = manualInputAmount(m);
  if (s.stock[resource] < amount)
    return `Need ${amount} ${resource === 'plate' && amount !== 1 ? 'plates' : resource} in collection.`;
  return null;
}
function courierRoute(s: State, target: Point): Point[] | null {
  const start = { ...DOCK },
    startKey = start.y * WORLD_W + start.x,
    targetKey = target.y * WORLD_W + target.x,
    queue = [start],
    previous = new Map<number, number | null>([[startKey, null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      key = p.y * WORLD_W + p.x;
    if (key === targetKey) break;
    for (const d of DELTAS) {
      const next = { x: p.x + d.x, y: p.y + d.y },
        nextKey = next.y * WORLD_W + next.x;
      if (!inside(next) || previous.has(nextKey) || tileAt(s, next)) continue;
      previous.set(nextKey, key);
      queue.push(next);
    }
  }
  if (!previous.has(targetKey)) return null;
  const route: Point[] = [];
  for (let key: number | null = targetKey; key !== null; key = previous.get(key) ?? null)
    route.push({ x: key % WORLD_W, y: Math.floor(key / WORLD_W) });
  return route.reverse();
}
export const courierTravelDuration = (route: Point[]) => Math.max(6, (route.length - 1) * 3);
export function dispatchCourier(session: Session, id: number): string | null {
  const machine = session.state.machines.find((m) => m.id === id);
  if (!machine) return 'Choose a smelter or assembler.';
  const error = manualInputError(session.state, machine),
    resource = processorInput(machine);
  if (error || !resource) return error;
  const amount = manualInputAmount(machine);
  const route = courierRoute(session.state, machine);
  if (!route) return 'The service drone cannot reach this machine without crossing solid rock.';
  session.state.stock[resource] -= amount;
  session.state.courier = {
    phase: 'outbound',
    targetId: machine.id,
    resource,
    cargo: Array(amount).fill(resource) as Resource[],
    route,
    progress: 0,
    duration: courierTravelDuration(route),
  };
  return null;
}
export function undo(session: Session) {
  const previous = session.history.pop();
  if (previous) session.state = previous;
  return !!previous;
}
export function destination(m: Machine): Point {
  const d = DELTAS[m.direction];
  return { x: m.x + d.x, y: m.y + d.y };
}
function accepts(s: State, m: Machine, r: Resource, from: Point) {
  if (m.kind === 'drill') return false;
  if (m.kind === 'belt') return m.output.length < 4;
  return (
    from.x === m.x + 1 &&
    from.y === m.y &&
    r === (m.kind === 'smelter' ? 'ore' : 'plate') &&
    m.input.length + reservedInput(s, m) < 4
  );
}
function advanceCourier(s: State, events: Event[]) {
  const courier = s.courier;
  if (courier.phase === 'idle') return;
  courier.progress++;
  if (courier.progress < courier.duration) return;
  const target = s.machines.find((m) => m.id === courier.targetId);
  if (courier.phase === 'outbound') {
    if (!target || !courier.resource) {
      if (courier.resource) s.stock[courier.resource] += courier.cargo.length;
      s.courier = idleCourier();
      return;
    }
    for (const resource of courier.cargo) target.input.push(resource);
    events.push({
      type: 'courier-deliver',
      from: { x: target.x, y: target.y - 0.7 },
      to: { x: target.x, y: target.y },
      resource: courier.resource,
      amount: courier.cargo.length,
    });
    courier.phase = 'returning';
    courier.cargo = [];
    courier.progress = 0;
    return;
  }
  s.courier = idleCourier();
}
export function advance(s: State, manual: Point | null = null): Event[] {
  const events: Event[] = [];
  s.tick++;
  if (manual && s.tick - s.lastTap >= 1 && !canMine(s, manual)) {
    s.lastTap = s.tick;
    const tile = tileAt(s, manual)!;
    tile.work++;
    if (tile.work >= hardness(tile)) excavate(s, manual, true, events);
  }
  // Courier arrivals resolve before belts, then processors consume completed batches below.
  advanceCourier(s, events);
  // Snapshot eligible cargo before moving anything: no same-tick multi-cell teleporting.
  if (s.tick % 3 === 0) {
    const moves = s.machines
      .filter((m) => m.output.length)
      .map((m) => ({ m, r: m.output[0], to: destination(m) }));
    for (const { m, r, to } of moves) {
      if (isDock(to)) {
        m.output.shift();
        s.stock[r]++;
        s.delivered[r]++;
        events.push({ type: 'ship', from: m, to, resource: r });
      } else {
        const next = machineAt(s, to);
        if (next && accepts(s, next, r, m)) {
          m.output.shift();
          (next.kind === 'belt' ? next.output : next.input).push(r);
          events.push({ type: 'flow', from: { x: m.x, y: m.y }, to, resource: r });
        }
      }
    }
  }
  for (const m of s.machines) {
    if (m.kind === 'drill') {
      for (const load of m.loads) load.remaining--;
      const arrived = m.loads.filter((load) => load.remaining <= 0);
      m.loads = m.loads.filter((load) => load.remaining > 0);
      for (const load of arrived) for (let i = 0; i < load.amount; i++) m.output.push('ore');
      if (m.extension && !m.extension.queued) {
        m.extension.remaining--;
        if (m.extension.remaining <= 0) {
          const oldEnd = m.end;
          m.end = m.extension.targetEnd;
          m.extensions = (m.extensions || 0) + 1;
          delete m.extension;
          m.progress = 0;
          events.push({ type: 'extend', from: { x: oldEnd, y: m.y }, to: { x: m.end, y: m.y } });
        }
        continue;
      }
      if (m.head > m.end) {
        const remaining = pocketRemaining(s, m);
        if (remaining > 0) {
          if (m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + 4 <= 8) {
            m.progress++;
            if (m.progress >= 30) {
              const face = { x: m.end, y: m.y },
                duration = Math.max(1, Math.ceil((m.end - m.x) * 2.5));
              s.pockets[pocketKey(face)] -= 4;
              m.loads.push({ amount: 4, from: m.end, remaining: duration, duration });
              m.made += 4;
              m.progress = 0;
              events.push({ type: 'extract', from: face, resource: 'ore', amount: 4 });
            }
          }
        } else {
          m.progress = 0;
          if (m.extension?.queued && !m.loads.length) m.extension.queued = false;
        }
        continue;
      }
      const p = { x: m.head, y: m.y },
        tile = tileAt(s, p);
      if (!tile) {
        m.head++;
        m.progress = 0;
        continue;
      }
      if (m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + tileYield(tile) > 8)
        continue;
      m.progress++;
      if (m.progress >= (tile.kind === 'ore' ? 30 : 20)) {
        const amount = excavate(s, p, false, events),
          duration = Math.max(1, Math.ceil((m.head - m.x) * 2.5));
        m.loads.push({ amount, from: m.head, remaining: duration, duration });
        m.made += amount;
        m.progress = 0;
        m.head++;
      }
    } else if (m.kind !== 'belt') {
      const duration = m.kind === 'smelter' ? 20 : 30;
      if (m.progress) {
        m.progress++;
        if (m.progress > duration && m.output.length < 4) {
          const r = m.kind === 'smelter' ? 'plate' : 'part';
          m.output.push(r);
          m.made++;
          m.progress = 0;
          events.push({ type: 'work', from: m, resource: r });
        }
      } else if (m.input.length >= 2 && m.output.length < 4) {
        m.input.splice(0, 2);
        m.progress = 1;
      }
    }
  }
  return events;
}
export function status(s: State, m: Machine): string {
  if (m.kind === 'drill') {
    const pocket = pocketRemaining(s, m);
    if (m.extension?.queued)
      return pocket
        ? m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + 4 > 8
          ? `Extension queued · pocket ${pocket} ore · output backed up`
          : `Extension queued · pocket ${pocket} ore remaining`
        : 'Extension queued · returning the last ore';
    if (m.extension)
      return `Tender travelling · ${Math.floor((1 - m.extension.remaining / m.extension.duration) * 100)}%`;
    if (m.head > m.end && pocket)
      return m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + 4 > 8
        ? `Deep pocket ${pocket} ore · output backed up`
        : `Deep pocket extracting · ${pocket} ore left`;
    if (m.head > m.end)
      return m.loads.length
        ? 'Returning the last ore'
        : (m.extensions || 0) > 0
          ? 'Deep pocket empty · open another face'
          : 'Deep pocket empty · extend or build another drill';
    const tile = tileAt(s, { x: m.head, y: m.y });
    if (
      m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + (tile ? tileYield(tile) : 0) >
      8
    )
      return 'Ore backed up · connect or clear the output';
    const sectionStart = m.x + (m.extensions || 0) * 8;
    return `Excavating · ${Math.min(8, m.head - sectionStart)}/8 section squares`;
  }
  if (m.output.length >= 4) return 'Output full · check the route to collection';
  if (m.kind === 'belt') return m.output.length ? 'Carrying cargo' : 'Waiting for cargo';
  if (m.progress)
    return m.kind === 'smelter'
      ? 'Smelting two ore into one plate'
      : 'Assembling two plates into one part';
  if (m.input.length >= 2) return 'Input batch ready · resume to process';
  if (m.input.length === 1) return `Needs one more ${m.kind === 'smelter' ? 'ore' : 'plate'}`;
  return `Needs two ${m.kind === 'smelter' ? 'ore' : 'plates'} from the right`;
}
export function objective(s: State): { title: string; detail: string; step: number } {
  if (s.handMined < 6)
    return {
      title: 'Break ground',
      detail: 'Hold the exposed rock face. Collect 6 ore for your first shaft drill.',
      step: 0,
    };
  if (!s.machines.some((m) => m.kind === 'drill'))
    return {
      title: 'Let a machine take over',
      detail: 'Place a shaft drill in clear space, facing rock on its right.',
      step: 1,
    };
  if (!s.delivered.ore)
    return {
      title: 'Bring the ore home',
      detail: 'Connect the drill’s left output to COLLECTION with conveyors.',
      step: 2,
    };
  if (!s.delivered.plate)
    return {
      title: 'Grow or refine',
      detail:
        'Ore can fund a second drill now. Spend 8 ore on a smelter when ready to make plates.',
      step: 3,
    };
  if (!s.delivered.part)
    return {
      title: 'Build with your own production',
      detail: 'Collect 6 plates for an assembler. Two plates become one part for shaft extension.',
      step: 4,
    };
  const drills = s.machines.filter((m) => m.kind === 'drill'),
    expanded =
      drills.length >= MAX_DRILLS || drills.some((m) => (m.extensions || 0) > 0 || m.extension);
  if (!expanded)
    return {
      title: 'Choose your expansion',
      detail:
        'Route another ore-funded drill, or commit 1 part to extend a cleared shaft after its pocket drains.',
      step: 5,
    };
  return {
    title: 'Your outpost is expanding',
    detail:
      'Watch each finite pocket and its output. Improve the route or processing before the next face runs dry.',
    step: 6,
  };
}
