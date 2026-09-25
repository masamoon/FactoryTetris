import {
  createState,
  courierTravelDuration,
  drillRailEnd,
  idleCourier,
  MAX_DRILLS,
  MAX_EXTENSIONS,
  POCKET_RESERVES,
  WORLD_W,
  WORLD_H,
  trimHistory,
  type Session,
  type State,
  type Resource,
  type Courier,
} from './simulation';
export const SAVE_KEY = 'gridforge.asteroid.v1';
const resources: Resource[] = ['ore', 'plate', 'part'];
const integer = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
function validState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State;
  const version = (s as { version: unknown }).version;
  if (
    (version !== 1 && version !== 2) ||
    !integer(s.tick) ||
    !integer(s.mined) ||
    !integer(s.handMined) ||
    !integer(s.nextId) ||
    !Number.isSafeInteger(s.lastTap) ||
    s.lastTap < -10 ||
    s.lastTap > s.tick
  )
    return false;
  if (
    !s.stock ||
    !s.delivered ||
    !resources.every((r) => integer(s.stock[r]) && integer(s.delivered[r]))
  )
    return false;
  if (
    !Array.isArray(s.terrain) ||
    s.terrain.length !== WORLD_W * WORLD_H ||
    !s.terrain.every(
      (t) =>
        t === null ||
        (t &&
          (t.kind === 'rock' || t.kind === 'ore') &&
          integer(t.work) &&
          t.work < (t.kind === 'ore' ? 24 : 18))
    )
  )
    return false;
  const pockets = (s as State & { pockets?: Record<string, number> }).pockets;
  if (
    (version === 2 && pockets === undefined) ||
    (pockets !== undefined &&
      (!pockets ||
        typeof pockets !== 'object' ||
        Array.isArray(pockets) ||
        Object.keys(pockets).length !== Object.keys(POCKET_RESERVES).length ||
        !Object.entries(POCKET_RESERVES).every(
          ([key, initial]) =>
            integer(pockets[key]) && pockets[key] <= initial && pockets[key] % 4 === 0
        )))
  )
    return false;
  if (!Array.isArray(s.machines) || s.machines.length > WORLD_W * WORLD_H) return false;
  const cells = new Set<string>(),
    ids = new Set<number>();
  for (const m of s.machines) {
    if (
      !m ||
      !['drill', 'belt', 'smelter', 'assembler'].includes(m.kind) ||
      !integer(m.id) ||
      ids.has(m.id) ||
      m.id >= s.nextId ||
      !integer(m.x) ||
      !integer(m.y) ||
      m.x >= WORLD_W ||
      m.y >= WORLD_H ||
      s.terrain[m.y * WORLD_W + m.x] ||
      (m.x === 1 && m.y === 6)
    )
      return false;
    const key = `${m.x},${m.y}`;
    if (cells.has(key)) return false;
    cells.add(key);
    ids.add(m.id);
    if (
      !integer(m.direction) ||
      m.direction > 3 ||
      !integer(m.progress) ||
      m.progress > 31 ||
      !integer(m.made) ||
      !integer(m.head) ||
      !integer(m.end) ||
      m.end >= WORLD_W ||
      m.head > WORLD_W
    )
      return false;
    if (
      (m.extensions !== undefined && (!integer(m.extensions) || m.extensions > MAX_EXTENSIONS)) ||
      (m.extension !== undefined && (!m.extension || typeof m.extension !== 'object'))
    )
      return false;
    if (
      !Array.isArray(m.input) ||
      !Array.isArray(m.output) ||
      m.input.length > 4 ||
      m.output.length > (m.kind === 'drill' ? 8 : 4) ||
      ![...m.input, ...m.output].every((r) => resources.includes(r))
    )
      return false;
    if (
      !Array.isArray(m.loads) ||
      m.loads.length > 4 ||
      !m.loads.every(
        (l) =>
          integer(l.amount) &&
          l.amount <= 4 &&
          integer(l.from) &&
          l.from < WORLD_W &&
          integer(l.remaining) &&
          integer(l.duration) &&
          l.duration <= 40 &&
          l.remaining <= l.duration
      )
    )
      return false;
    if (m.kind === 'drill') {
      const extensions = m.extensions || 0,
        expectedEnd = extensions ? m.x + 16 : Math.min(WORLD_W - 1, m.x + 8);
      if (
        m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) > 8 ||
        m.end !== expectedEnd ||
        m.end >= WORLD_W ||
        m.head < m.x + 1
      )
        return false;
      if (m.extension) {
        const e = m.extension;
        if (
          extensions ||
          m.head !== m.end + 1 ||
          !integer(e.targetEnd) ||
          e.targetEnd !== m.end + 8 ||
          e.targetEnd >= WORLD_W ||
          !integer(e.duration) ||
          e.duration !== Math.ceil((m.end - m.x) * 2.5) ||
          !integer(e.remaining) ||
          e.remaining < 1 ||
          e.remaining > e.duration
        )
          return false;
        if (
          (e.queued !== undefined && typeof e.queued !== 'boolean') ||
          (e.queued && e.remaining !== e.duration) ||
          (!e.queued && (m.loads.length || (pockets && pockets[`${m.end},${m.y}`] > 0)))
        )
          return false;
        let rock = false;
        for (let x = m.end + 1; x <= e.targetEnd; x++)
          if (s.terrain[m.y * WORLD_W + x]) rock = true;
        if (!rock) return false;
      }
    } else if ((m.extensions || 0) !== 0 || m.extension) return false;
    if (m.kind !== 'belt' && m.direction !== 3) return false;
    if (m.kind === 'belt' && (m.input.length || m.progress || m.loads.length || m.made))
      return false;
    if (m.kind === 'drill') {
      if (
        m.input.length ||
        m.output.some((r) => r !== 'ore') ||
        m.head > m.end + 1 ||
        m.progress >= 30
      )
        return false;
      if (
        m.loads.some(
          (l) =>
            ![2, 4].includes(l.amount) ||
            l.from <= m.x ||
            l.from >= m.head ||
            l.from > m.end ||
            l.duration !== Math.ceil((l.from - m.x) * 2.5) ||
            l.remaining < 1
        )
      )
        return false;
      for (let x = m.x + 1; x < m.head; x++) if (s.terrain[m.y * WORLD_W + x]) return false;
    } else if (m.loads.length) return false;
    if (m.kind === 'smelter' || m.kind === 'assembler') {
      if (
        m.input.some((r) => r !== (m.kind === 'smelter' ? 'ore' : 'plate')) ||
        m.output.some((r) => r !== (m.kind === 'smelter' ? 'plate' : 'part')) ||
        m.progress > (m.kind === 'smelter' ? 20 : 30)
      )
        return false;
    }
  }
  const courier = (s as State & { courier?: Courier }).courier;
  if (courier) {
    if (
      !['idle', 'outbound', 'returning'].includes(courier.phase) ||
      !Array.isArray(courier.cargo) ||
      !Array.isArray(courier.route) ||
      !integer(courier.progress) ||
      !integer(courier.duration)
    )
      return false;
    if (courier.phase === 'idle') {
      if (
        courier.targetId !== null ||
        courier.resource !== null ||
        courier.cargo.length ||
        courier.route.length ||
        courier.progress ||
        courier.duration
      )
        return false;
    } else {
      const target = s.machines.find((m) => m.id === courier.targetId),
        expected =
          target &&
          (target.kind === 'smelter' ? 'ore' : target.kind === 'assembler' ? 'plate' : null);
      if (
        !target ||
        !expected ||
        courier.resource !== expected ||
        courier.route.length < 2 ||
        courier.duration !== courierTravelDuration(courier.route) ||
        courier.progress >= courier.duration ||
        courier.route[0].x !== 1 ||
        courier.route[0].y !== 6 ||
        courier.route.at(-1)?.x !== target.x ||
        courier.route.at(-1)?.y !== target.y ||
        !courier.route.every(
          (p, i) =>
            integer(p.x) &&
            integer(p.y) &&
            p.x < WORLD_W &&
            p.y < WORLD_H &&
            !s.terrain[p.y * WORLD_W + p.x] &&
            (!i ||
              Math.abs(p.x - courier.route[i - 1].x) + Math.abs(p.y - courier.route[i - 1].y) === 1)
        )
      )
        return false;
      if (
        courier.phase === 'outbound' &&
        (courier.cargo.length < 1 ||
          courier.cargo.length > 2 ||
          courier.cargo.some((r) => r !== expected) ||
          target.input.length + courier.cargo.length > 4)
      )
        return false;
      if (courier.phase === 'returning' && courier.cargo.length) return false;
    }
  }
  const rails = new Set<string>();
  if (s.machines.filter((m) => m.kind === 'drill').length > MAX_DRILLS) return false;
  if (
    s.machines.filter(
      (m) => m.kind === 'drill' && ((m.extensions || 0) > 0 || m.extension !== undefined)
    ).length > 1
  )
    return false;
  for (const m of s.machines.filter((m) => m.kind === 'drill')) {
    for (let x = m.x + 1; x <= drillRailEnd(m); x++) {
      const key = `${x},${m.y}`;
      if (cells.has(key) || rails.has(key) || (x === 1 && m.y === 6)) return false;
      rails.add(key);
    }
  }
  return true;
}
export function parseSave(raw: string | null): Session | null {
  if (!raw || raw.length > 8_000_000) return null;
  try {
    const data = JSON.parse(raw) as Session;
    if (
      validState(data.state) &&
      Array.isArray(data.history) &&
      data.history.length < 2000 &&
      data.history.every(validState)
    ) {
      for (const state of [data.state, ...data.history]) {
        if (!(state as State & { courier?: Courier }).courier) state.courier = idleCourier();
        if (!(state as State & { pockets?: State['pockets'] }).pockets) {
          state.pockets = { ...POCKET_RESERVES };
          for (const drill of state.machines.filter((m) => m.kind === 'drill'))
            if ((drill.extensions || 0) > 0 || (drill.extension && !drill.extension.queued)) {
              const key = `${drill.x + 8},${drill.y}`;
              if (key in state.pockets) state.pockets[key] = 0;
            }
        }
        state.version = 2;
      }
      trimHistory(data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
export function freshSession(): Session {
  return { state: createState(), history: [] };
}
