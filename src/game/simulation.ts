import {
  CAPACITY,
  DEFINITIONS,
  HEIGHT,
  TOOLS,
  WIDTH,
  transform,
  definition,
  geometry,
} from './content';
import type {
  Command,
  Direction,
  Edge,
  Endpoint,
  FoldPreview,
  Machine,
  Point,
  Port,
  Resource,
  Result,
  RunState,
  Session,
  SimEvent,
  Tool,
} from './types';

export const DELTAS: Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const compatible = (a: Port['resource'], b: Port['resource']) =>
  a === 'any' || b === 'any' || a === b;
const clone = <T>(value: T): T => structuredClone(value);
export const inputEndpoint = (m: Machine, index: number): Endpoint =>
  m.folded ? m.folded.inputs[index].endpoint : { id: m.id, port: index };
export const outputEndpoint = (m: Machine): number => (m.folded ? m.folded.output : m.id);
export function leaves(machines: Machine[]): Machine[] {
  return machines
    .flatMap((m) => (m.folded ? leaves(m.folded.machines) : [m]))
    .sort((a, b) => a.id - b.id);
}
export function externalEdges(machines: Machine[]): { from: Machine; to: Machine; port: number }[] {
  const edges: { from: Machine; to: Machine; port: number }[] = [];
  for (const from of machines) {
    const out = geometry(from).output,
      delta = DELTAS[out.direction];
    for (const to of machines)
      if (to.id !== from.id) {
        for (const input of geometry(to).inputs) {
          if (
            input.x === out.x + delta.x &&
            input.y === out.y + delta.y &&
            input.direction === (out.direction + 2) % 4 &&
            compatible(out.resource, input.resource)
          )
            edges.push({ from, to, port: input.index });
        }
      }
  }
  return edges.sort((a, b) => a.from.id - b.from.id || a.to.id - b.to.id || a.port - b.port);
}
export function graphEdges(machines: Machine[]): Edge[] {
  return [
    ...externalEdges(machines).map((e) => ({
      from: outputEndpoint(e.from),
      to: inputEndpoint(e.to, e.port),
    })),
    ...machines.flatMap((m) => (m.folded ? nestedEdges(m) : [])),
  ].sort((a, b) => a.from - b.from || a.to.id - b.to.id || a.to.port - b.to.port);
}
function nestedEdges(m: Machine): Edge[] {
  return m.folded ? [...m.folded.edges, ...m.folded.machines.flatMap(nestedEdges)] : [];
}
export function ownerOf(state: RunState, leafId: number): Machine | undefined {
  return state.machines.find(
    (m) => m.id === leafId || (m.folded && leaves(m.folded.machines).some((l) => l.id === leafId))
  );
}
export function terminal(state: RunState, machine: Machine): Machine {
  return leaves(state.machines).find((m) => m.id === outputEndpoint(machine))!;
}
export function checkPlacement(
  state: RunState,
  candidate: Machine,
  ignored: number[] = []
): string | null {
  if (
    ![candidate.x, candidate.y, candidate.rotation].every(Number.isInteger) ||
    candidate.rotation < 0 ||
    candidate.rotation > 3
  )
    return 'Choose a square on the board.';
  const cells = geometry(candidate).cells;
  if (cells.some((p) => p.x < 0 || p.x >= WIDTH || p.y < 0 || p.y >= HEIGHT))
    return 'Keep the whole piece inside the board.';
  const occupied = [
    ...state.blockers,
    ...state.sources,
    ...state.machines.filter((m) => !ignored.includes(m.id)).flatMap((m) => geometry(m).cells),
  ];
  if (cells.some((p) => occupied.some((q) => p.x === q.x && p.y === q.y)))
    return 'That space is already occupied.';
  return null;
}
export function makeMachine(
  state: RunState,
  x: number,
  y: number,
  rotation: number,
  kind: Tool = 'punch'
): Machine {
  return {
    id: state.nextId,
    kind,
    x,
    y,
    rotation,
    inputs: DEFINITIONS[kind].inputs.map(() => []),
    output: [],
    remaining: 0,
    processing: null,
    emitted: 0,
  };
}
export function previewFold(state: RunState, id: number): FoldPreview {
  const empty: FoldPreview = {
    ids: [],
    saved: 0,
    graph: { machines: [], edges: [], inputs: [], output: 0, resource: 'any' },
  };
  const selected = state.machines.find((m) => m.id === id);
  if (!selected) return { ...empty, error: 'Select the end of a production line.' };
  if (terminal(state, selected).emitted < 3)
    return {
      ...empty,
      error: `Ship or transfer ${3 - terminal(state, selected).emitted} more products from this machine to fold it.`,
    };
  const edges = externalEdges(state.machines),
    ids = new Set<number>(),
    visiting = new Set<number>();
  let cycle = false;
  const visit = (mid: number) => {
    if (visiting.has(mid)) {
      cycle = true;
      return;
    }
    if (ids.has(mid)) return;
    visiting.add(mid);
    for (const e of edges.filter((e) => e.to.id === mid)) visit(e.from.id);
    visiting.delete(mid);
    ids.add(mid);
  };
  visit(id);
  if (cycle) return { ...empty, error: 'A circular line cannot be folded.' };
  const members = state.machines.filter((m) => ids.has(m.id)).sort((a, b) => a.id - b.id);
  if (edges.some((e) => ids.has(e.from.id) && e.from.id !== id && !ids.has(e.to.id)))
    return {
      ...empty,
      error: 'An intermediate machine feeds another line. Keep that connection accessible.',
    };
  const inputs = members.flatMap((m) =>
    geometry(m)
      .inputs.filter(
        (p) => !edges.some((e) => e.to.id === m.id && e.port === p.index && ids.has(e.from.id))
      )
      .map((p) => ({ endpoint: inputEndpoint(m, p.index), resource: p.resource }))
  );
  if (inputs.length === 0 || inputs.length > 2)
    return { ...empty, error: 'A folded factory needs one or two material inputs.' };
  const saved = members.reduce((sum, m) => sum + geometry(m).cells.length, 0) - 1;
  if (saved < 1) return { ...empty, error: 'This factory is already as small as it gets.' };
  const graph = {
    machines: clone(members),
    edges: edges
      .filter((e) => ids.has(e.from.id) && ids.has(e.to.id))
      .map((e) => ({ from: outputEndpoint(e.from), to: inputEndpoint(e.to, e.port) })),
    inputs,
    output: outputEndpoint(selected),
    resource: definition(selected).output.resource,
  };
  return { ids: [...ids], saved, graph: clone(graph) };
}
export function foldedMachine(
  state: RunState,
  preview: FoldPreview,
  x: number,
  y: number,
  rotation: number
): Machine {
  return {
    id: state.nextId,
    kind: 'module',
    x,
    y,
    rotation,
    inputs: [],
    output: [],
    remaining: 0,
    processing: null,
    emitted: 0,
    folded: clone(preview.graph),
  };
}
export function connectionPreview(
  state: RunState,
  candidate: Machine,
  ignored: number[] = []
): { connected: number; total: number } {
  const machines = [...state.machines.filter((m) => !ignored.includes(m.id)), candidate];
  const edges = externalEdges(machines);
  let connected = 0;
  const g = geometry(candidate);
  for (const input of g.inputs) {
    if (
      edges.some((e) => e.to.id === candidate.id && e.port === input.index) ||
      state.sources.some((s) => {
        const d = DELTAS[s.direction];
        return (
          s.x + d.x === input.x &&
          s.y + d.y === input.y &&
          input.direction === (s.direction + 2) % 4 &&
          compatible(s.resource, input.resource)
        );
      })
    )
      connected++;
  }
  return { connected, total: g.inputs.length };
}

// Advance state in place only inside the command reducer. All leaves, even those
// inside nested modules, participate in the SAME phases and stable ordering.
export function advanceTick(state: RunState, events: SimEvent[] = []): void {
  if (state.status !== 'playing') return;
  state.tick++;
  const all = leaves(state.machines),
    byId = new Map(all.map((m) => [m.id, m]));
  const edges = graphEdges(state.machines);
  const outputOwners = new Map(state.machines.map((m) => [outputEndpoint(m), m]));
  // Reserve transfers from the start-of-tick buffers, then apply together.
  const transfers: { from: Machine; to: Machine; port: number; resource: Resource }[] = [];
  const reserved = new Map<string, number>();
  for (const from of all) {
    const resource = from.output[0];
    if (!resource) continue;
    const outgoing = edges.filter((e) => e.from === from.id);
    for (const edge of outgoing) {
      const to = byId.get(edge.to.id)!;
      const key = `${to.id}:${edge.to.port}`;
      const resourceType = DEFINITIONS[to.kind].inputs[edge.to.port].resource;
      if (!compatible(resource, resourceType)) continue;
      const reservedCount = reserved.get(key) || 0;
      if (to.inputs[edge.to.port].length + reservedCount < CAPACITY) {
        transfers.push({ from, to, port: edge.to.port, resource });
        reserved.set(key, reservedCount + 1);
        break;
      }
    }
    // Only exact requested products ship. Completed quotas never consume surplus.
    const order = state.orders.find((o) => o.resource === resource && o.delivered < o.quantity);
    if (!outgoing.length && outputOwners.has(from.id) && order) {
      from.output.shift();
      from.emitted++;
      order.delivered++;
      events.push({ type: 'ship', id: from.id, resource, tick: state.tick });
      if (order.delivered === order.quantity) events.push({ type: 'milestone', tick: state.tick });
      if (state.orders.every((o) => o.delivered === o.quantity)) state.status = 'won';
    }
  }

  for (const t of transfers) {
    t.from.output.shift();
    t.to.inputs[t.port].push(t.resource);
    t.from.emitted++;
    events.push({
      type: 'flow',
      id: t.from.id,
      to: t.to.id,
      resource: t.resource,
      tick: state.tick,
    });
  }
  // Supplies emit one unit per tick into connected ports; stopped supply remains
  // in the ground rather than creating and throwing away an item.
  for (const source of [...state.sources].sort((a, b) => a.id - b.id)) {
    const d = DELTAS[source.direction];
    for (const m of [...state.machines].sort((a, b) => a.id - b.id))
      for (const p of geometry(m).inputs) {
        if (
          p.x !== source.x + d.x ||
          p.y !== source.y + d.y ||
          p.direction !== (source.direction + 2) % 4 ||
          !compatible(source.resource, p.resource)
        )
          continue;
        const ep = inputEndpoint(m, p.index),
          leaf = byId.get(ep.id)!;
        if (leaf.inputs[ep.port].length < CAPACITY) {
          leaf.inputs[ep.port].push(source.resource);
          events.push({
            type: 'flow',
            id: source.id,
            to: leaf.id,
            resource: source.resource,
            tick: state.tick,
          });
        }
      }
  }
  for (const machine of all) {
    if (machine.processing) {
      if (machine.remaining > 0) machine.remaining--;
      if (machine.remaining === 0 && machine.output.length < CAPACITY) {
        machine.output.push(machine.processing);
        events.push({
          type: 'work',
          id: machine.id,
          resource: machine.processing,
          tick: state.tick,
        });
        machine.processing = null;
      }
    }
    if (
      !machine.processing &&
      machine.output.length < CAPACITY &&
      machine.inputs.every((input) => input.length > 0)
    ) {
      const def = DEFINITIONS[machine.kind];
      const consumed = machine.inputs.map((input) => input.shift()!);
      machine.processing = transform(machine.kind, consumed[0]);
      machine.remaining = def.duration;
    }
  }
}
export function applyCommand(session: Session, command: Command): Result {
  const fail = (error: string): Result => ({ session, events: [], error });
  if (command.type === 'undo')
    return session.undo
      ? { session: { state: clone(session.undo), undo: null }, events: [] }
      : fail('Nothing to undo yet.');
  if (session.state.status !== 'playing')
    return fail('This shift has ended. Start another factory.');
  const state = clone(session.state),
    events: SimEvent[] = [];
  if (command.type === 'place') {
    if (!TOOLS.includes(command.kind)) return fail('Choose a tool.');
    const m = makeMachine(state, command.x, command.y, command.rotation, command.kind),
      error = checkPlacement(state, m);
    if (error) return fail(error);
    state.machines.push(m);
    state.nextId++;
    events.push({ type: 'place', id: m.id });
  } else if (command.type === 'move' || command.type === 'recycle') {
    const m = state.machines.find((m) => m.id === command.id);
    if (!m) return fail('Select a machine first.');
    if (command.type === 'move') {
      const candidate = { ...m, x: command.x, y: command.y, rotation: command.rotation };
      const error = checkPlacement(state, candidate, [m.id]);
      if (error) return fail(error);
      Object.assign(m, candidate);
      events.push({ type: 'place', id: m.id });
    } else state.machines = state.machines.filter((m) => m.id !== command.id);
  } else if (command.type === 'fold') {
    const preview = previewFold(state, command.id);
    if (preview.error) return fail(preview.error);
    const module = foldedMachine(state, preview, command.x, command.y, command.rotation),
      error = checkPlacement(state, module, preview.ids);
    if (error) return fail(error);
    const center = geometry(state.machines.find((m) => m.id === command.id)!).output;
    state.machines = state.machines.filter((m) => !preview.ids.includes(m.id));
    state.machines.push(module);
    state.nextId++;
    state.folds++;
    state.spaceRecovered += preview.saved;
    events.push({ type: 'fold', id: module.id, amount: preview.saved, fromPoint: center });
    return { session: { state, undo: clone(session.state) }, events };
  }
  state.actions--;
  for (let i = 0; i < 4; i++) advanceTick(state, events);
  if (state.status === 'playing' && state.actions === 0) state.status = 'lost';
  return { session: { state, undo: clone(session.state) }, events };
}

export function rotateDirection(direction: Direction, rotation: number): Direction {
  return ((direction + rotation) % 4) as Direction;
}

// Predict the next visible tile from actual buffered work, then connected inputs.
export function nextProduct(state: RunState, machine: Machine): Resource | null {
  const primitives = leaves(state.machines),
    edges = graphEdges(state.machines);
  const visit = (id: number, seen: Set<number>): Resource | null => {
    if (seen.has(id)) return null;
    seen.add(id);
    const m = primitives.find((n) => n.id === id);
    if (!m) return null;
    if (m.output[0]) return m.output[0];
    if (m.processing) return m.processing;
    let input: Resource | null = m.inputs[0]?.[0] || null;
    const edge = edges.find((e) => e.to.id === id);
    if (!input && edge) input = visit(edge.from, seen);
    if (!input)
      for (const top of state.machines)
        for (const p of geometry(top).inputs) {
          if (inputEndpoint(top, p.index).id !== id) continue;
          const source = state.sources.find((s) => {
            const d = DELTAS[s.direction];
            return s.x + d.x === p.x && s.y + d.y === p.y && p.direction === (s.direction + 2) % 4;
          });
          if (source) input = source.resource;
        }
    return input ? transform(m.kind, input) : null;
  };
  return visit(outputEndpoint(machine), new Set());
}
