import { definition, geometry, LEVELS, PRODUCTS } from '../game/content';
import {
  DELTAS,
  externalEdges,
  leaves,
  outputEndpoint,
  previewFold,
  nextProduct,
} from '../game/simulation';
import type { Machine, Resource, RunState } from '../game/types';
export const materialName = (r: Resource | 'any') => (r === 'any' ? 'Any tile' : PRODUCTS[r].name);
export const machineName = (m: Pick<Machine, 'kind' | 'folded'>) => definition(m).name;
export function inputDetails(state: RunState, machine: Machine, ignored: number[] = []) {
  const machines = [
    ...state.machines.filter((m) => m.id !== machine.id && !ignored.includes(m.id)),
    machine,
  ];
  const edges = externalEdges(machines);
  return geometry(machine).inputs.map((input) => {
    const edge = edges.find((e) => e.to.id === machine.id && e.port === input.index);
    const source = state.sources.find((s) => {
      const d = DELTAS[s.direction];
      return (
        s.x + d.x === input.x && s.y + d.y === input.y && input.direction === (s.direction + 2) % 4
      );
    });
    return {
      connected: !!edge || !!source,
      resource: source?.resource ?? null,
      from: edge
        ? machineName(edge.from)
        : source
          ? `${PRODUCTS[source.resource].name} supply`
          : null,
      side: ['top', 'right', 'bottom', 'left'][input.direction],
    };
  });
}
export { nextProduct } from '../game/simulation';
export function incomingProduct(state: RunState, m: Machine): Resource | null {
  const first = m.folded ? leaves([m]).find((n) => n.id === m.folded!.inputs[0].endpoint.id) : m;
  if (first?.inputs[0]?.[0]) return first.inputs[0][0];
  const edge = externalEdges(state.machines).find((e) => e.to.id === m.id);
  if (edge) return nextProduct(state, edge.from);
  return inputDetails(state, m).find((i) => i.resource)?.resource ?? null;
}
export function previewState(state: RunState, m: Machine, ignored: number[] = []): RunState {
  return {
    ...state,
    machines: [...state.machines.filter((n) => n.id !== m.id && !ignored.includes(n.id)), m],
  };
}
export function diversionWarnings(state: RunState, m: Machine, ignored: number[] = []): string[] {
  const next = previewState(state, m, ignored),
    old = externalEdges(state.machines);
  return externalEdges(next.machines).flatMap((e) => {
    if (old.some((o) => o.from.id === e.from.id && o.to.id === e.to.id)) return [];
    const r = nextProduct(next, e.from);
    return r && state.orders.some((o) => o.resource === r && o.delivered < o.quantity)
      ? [`${PRODUCTS[r].name} tiles will feed ${machineName(e.to)} instead of shipping.`]
      : [];
  });
}
export function machineStatus(state: RunState, m: Machine): string {
  const missing = inputDetails(state, m).find((i) => !i.connected);
  if (missing) return `Connect IN on the ${missing.side}.`;
  const terminal = leaves([m]).find((n) => n.id === outputEndpoint(m))!;
  const edge = externalEdges(state.machines).find((e) => e.from.id === m.id);
  if (terminal.output[0]) {
    if (edge) return `Output feeds ${machineName(edge.to)}. If its buffers fill, this line waits.`;
    const r = terminal.output[0];
    if (!state.orders.some((o) => o.resource === r && o.delivered < o.quantity))
      return `${PRODUCTS[r].name} output waiting: no remaining order needs it. Connect another tool, or recycle to clear stored tiles.`;
  }
  return terminal.processing
    ? 'Working. Run advances production.'
    : 'Connected. Place a tool or Run to produce.';
}
export function guidance(state: RunState): string {
  if (state.status === 'won')
    return 'Commission complete. Inspect your factory or choose another commission.';
  if (state.status === 'lost') return 'Out of actions. Undo the last command, or retry this level.';
  if (
    state.level === 3 &&
    state.orders[0].delivered === 3 &&
    state.folds === 0 &&
    state.machines.some((m) => !previewFold(state, m.id).error)
  )
    return 'Punched batch complete. Tap the Punch and Fold it to make room for a Cutter.';
  return LEVELS[state.level].brief;
}
