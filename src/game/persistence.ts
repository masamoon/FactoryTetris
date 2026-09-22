import { createRun, DEFINITIONS, LEVELS } from './content';
import { checkPlacement } from './simulation';
import type { Machine, RunState, Session } from './types';

export const SAVE_KEY = 'gridforge.tiles.poc.v2';
export const SETTINGS_KEY = 'gridforge.folded.settings.v1';
export interface Settings {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
  introduced: boolean;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
const resources = new Set(['blank', 'punched', 'clipped', 'combined']);
function validMachine(value: unknown, depth = 0): value is Machine {
  if (!value || typeof value !== 'object' || depth > 30) return false;
  const m = value as Machine;
  if (
    !Number.isInteger(m.id) ||
    !Object.hasOwn(DEFINITIONS, m.kind) ||
    ![m.x, m.y, m.rotation, m.remaining, m.emitted].every(Number.isInteger) ||
    m.rotation < 0 ||
    m.rotation > 3 ||
    m.remaining < 0 ||
    m.emitted < 0
  )
    return false;
  if (
    !Array.isArray(m.inputs) ||
    !m.inputs.every((a) => Array.isArray(a) && a.length <= 2 && a.every((r) => resources.has(r))) ||
    !Array.isArray(m.output) ||
    m.output.length > 2 ||
    !m.output.every((r) => resources.has(r)) ||
    !(m.processing === null || resources.has(m.processing))
  )
    return false;
  if (m.kind !== 'module')
    return !m.folded && m.inputs.length === DEFINITIONS[m.kind].inputs.length;
  const g = m.folded;
  return (
    !!g &&
    Array.isArray(g.machines) &&
    g.machines.length > 0 &&
    g.machines.every((n) => validMachine(n, depth + 1)) &&
    Array.isArray(g.edges) &&
    g.edges.every(
      (e) => Number.isInteger(e.from) && Number.isInteger(e.to?.id) && Number.isInteger(e.to?.port)
    ) &&
    Array.isArray(g.inputs) &&
    g.inputs.length > 0 &&
    g.inputs.length <= 2 &&
    g.inputs.every(
      (i) =>
        !!i.endpoint &&
        Number.isInteger(i.endpoint.id) &&
        Number.isInteger(i.endpoint.port) &&
        (i.resource === 'any' || resources.has(i.resource))
    ) &&
    Number.isInteger(g.output)
  );
}
export function validState(value: unknown): value is RunState {
  if (!value || typeof value !== 'object') return false;
  const s = value as RunState;
  if (
    s.version !== 2 ||
    !Number.isInteger(s.level) ||
    !LEVELS[s.level] ||
    s.mirrored !== false ||
    ![s.actions, s.tick, s.nextId, s.spaceRecovered, s.folds].every(
      (n) => Number.isInteger(n) && n >= 0
    ) ||
    s.actions > LEVELS[s.level].actions ||
    !['playing', 'won', 'lost'].includes(s.status) ||
    !Array.isArray(s.machines) ||
    !s.machines.every((m) => validMachine(m)) ||
    !Array.isArray(s.orders)
  )
    return false;
  const base = createRun(s.level);
  if (
    JSON.stringify(s.sources) !== JSON.stringify(base.sources) ||
    JSON.stringify(s.blockers) !== JSON.stringify(base.blockers) ||
    s.orders.length !== base.orders.length ||
    !s.orders.every(
      (o, i) =>
        o &&
        o.resource === base.orders[i].resource &&
        o.quantity === base.orders[i].quantity &&
        Number.isInteger(o.delivered) &&
        o.delivered >= 0 &&
        o.delivered <= o.quantity
    )
  )
    return false;
  const ids = new Set<number>();
  let valid = true;
  const visit = (machines: Machine[]) => {
    for (const m of machines) {
      if (ids.has(m.id) || m.id < 1 || m.id >= s.nextId) valid = false;
      ids.add(m.id);
      if (m.folded) visit(m.folded.machines);
    }
  };
  visit(s.machines);
  // Resolve every saved internal wire before allowing simulation to resume.
  const leaves = new Map<number, Machine>();
  const gather = (ms: Machine[]) =>
    ms.forEach((m) => (m.folded ? gather(m.folded.machines) : leaves.set(m.id, m)));
  gather(s.machines);
  const endpoint = (id: number, p: number) =>
    !!leaves.get(id) && p >= 0 && p < leaves.get(id)!.inputs.length;
  const check = (ms: Machine[]) =>
    ms.forEach((m) => {
      if (m.folded) {
        const g = m.folded;
        if (
          !leaves.has(g.output) ||
          !g.inputs.every((i) => endpoint(i.endpoint.id, i.endpoint.port)) ||
          !g.edges.every((e) => leaves.has(e.from) && endpoint(e.to.id, e.to.port))
        )
          valid = false;
        check(g.machines);
      }
    });
  check(s.machines);
  if (
    (s.status === 'won' && !s.orders.every((o) => o.delivered === o.quantity)) ||
    (s.status === 'playing' &&
      (s.orders.every((o) => o.delivered === o.quantity) || s.actions === 0)) ||
    (s.status === 'lost' && s.actions !== 0)
  )
    return false;
  if (s.machines.some((m) => checkPlacement(s, m, [m.id]))) return false;
  return valid;
}
export function loadSession(storage: StorageLike): {
  session: Session | null;
  available: boolean;
  invalid: boolean;
} {
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { session: null, available: false, invalid: false };
  }
  if (!raw) return { session: null, available: true, invalid: false };
  try {
    const data: unknown = JSON.parse(raw);
    const s = data as Session;
    if (!s || !validState(s.state) || !(s.undo === null || validState(s.undo)))
      return { session: null, available: true, invalid: true };
    return { session: s, available: true, invalid: false };
  } catch {
    return { session: null, available: true, invalid: true };
  }
}
export function saveSession(storage: StorageLike, session: Session): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
export function loadSettings(storage: StorageLike): Settings {
  const defaults: Settings = {
    volume: 0.55,
    muted: false,
    reducedMotion:
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    introduced: false,
  };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    const old = JSON.parse(storage.getItem('gridforge.settings') || '{}') as {
      audioVolume?: number;
      muted?: boolean;
    };
    const saved = raw
      ? (JSON.parse(raw) as Partial<Settings>)
      : { volume: old.audioVolume, muted: old.muted };
    return {
      ...defaults,
      ...saved,
      volume:
        typeof saved.volume === 'number' && Number.isFinite(saved.volume)
          ? Math.max(0, Math.min(1, saved.volume))
          : defaults.volume,
      muted: typeof saved.muted === 'boolean' ? saved.muted : defaults.muted,
      reducedMotion:
        typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion,
      introduced: saved.introduced === true,
    };
  } catch {
    return defaults;
  }
}
