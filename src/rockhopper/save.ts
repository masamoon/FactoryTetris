import {
  BELT_TIER_MAX,
  DRILL_MAX_LEVEL,
  LONE_BAR_VALUE,
  type Ore,
  SLOTS,
  SMELTER_MAX_LEVEL,
  SMELTER_QUEUE,
} from './config';
import { freshState, type Rock, type State } from './sim';

/**
 * The logistics experiment saves under its own key and never writes or deletes the v1 key, so
 * rolling the build back finds the untouched pre-logistics save. `?restore=pre-logistics`
 * deletes this key, and the v1 save is migrated again.
 */
export const SAVE_KEY = 'rockhopper.save.v2';
export const LEGACY_SAVE_KEY = 'rockhopper.save.v1';
export const SETTINGS_KEY = 'rockhopper.settings.v1';

interface SavedRock extends Omit<Rock, 'cells' | 'work'> {
  cells: string;
  work: [number, number][];
}

export function serialize(s: State): string {
  const slots = s.slots.map((slot) => ({
    ...slot,
    rock: slot.rock
      ? ({
          r: slot.rock.r,
          w: slot.rock.w,
          total: slot.rock.total,
          remaining: slot.rock.remaining,
          cells: slot.rock.cells.join(''),
          work: slot.rock.work.map((w, i) => [i, w] as [number, number]).filter(([, w]) => w > 0),
        } satisfies SavedRock)
      : null,
  }));
  // The laser follows a live finger; it is never saved, so a reload cannot keep it firing.
  const machines = s.machines.map((m) => (m.kind === 'drill' ? { ...m, stalled: undefined } : m));
  return JSON.stringify({ ...s, slots, machines, laser: null, events: undefined });
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const isOre = (v: unknown): v is Ore =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

/** Parse a save; any structural problem returns null so the caller can start fresh. */
export function deserialize(text: string): State | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (
      (raw.version !== 1 && raw.version !== 2) ||
      !Array.isArray(raw.slots) ||
      raw.slots.length !== SLOTS.length
    )
      return null;
    // v1 saves predate belt tiers, value multipliers and bar pairing: migrate in place.
    const legacy = raw.version === 1;
    if (!isNum(raw.credits) || !isNum(raw.tick) || !isNum(raw.seed) || !Array.isArray(raw.machines))
      return null;
    const base = freshState(raw.seed);
    const slots = (raw.slots as Record<string, unknown>[]).map((slot, i) => {
      const r = slot.rock as SavedRock | null;
      let rock: Rock | null = null;
      if (r) {
        const w = 2 * SLOTS[i].r + 3;
        if (r.w !== w || typeof r.cells !== 'string' || r.cells.length !== w * w)
          throw new Error('rock');
        const cells = [...r.cells].map(Number);
        if (cells.some((c) => !(c >= 0 && c <= 5))) throw new Error('cell');
        const work = new Array<number>(w * w).fill(0);
        for (const [k, v] of r.work) if (k >= 0 && k < work.length && isNum(v)) work[k] = v;
        rock = {
          r: SLOTS[i].r,
          w,
          cells,
          work,
          total: r.total,
          remaining: cells.filter((c) => c > 0).length,
        };
      }
      return {
        unlocked: !!slot.unlocked,
        gen: isNum(slot.gen) ? slot.gen : 0,
        rock,
        arriveAt: isNum(slot.arriveAt) ? slot.arriveAt : 0,
        crumble: isNum(slot.crumble) ? slot.crumble : 0,
      };
    });
    const state: State = {
      ...base,
      ...(raw as unknown as State),
      version: 2,
      slots,
      events: [],
    };
    if (!state.slots[0].unlocked) return null;
    state.laser = null;
    const ids = new Set<number>();
    for (const m of state.machines) {
      if (!isNum(m.id) || ids.has(m.id) || (m.kind !== 'drill' && m.kind !== 'smelter'))
        return null;
      if (!isNum(m.level) || m.level < 1) return null;
      const old = m as unknown as Record<string, unknown>;
      if (legacy) {
        // A v1 belt carried bundles of stackSize(level): keep that capacity, as unbought tiers.
        m.tier = 1 + Math.floor((Math.min(m.level, 8) - 1) / 2);
        m.tierBought = 0;
        m.rr = isNum(old.rr) ? (old.rr as number) : 0;
      }
      if (!isNum(m.tier) || m.tier < 1) return null;
      m.tier = Math.min(Math.round(m.tier), BELT_TIER_MAX);
      m.tierBought = isNum(m.tierBought) ? Math.max(0, Math.min(m.tierBought, m.tier - 1)) : 0;
      m.rr = isNum(m.rr) ? Math.max(0, Math.floor(m.rr)) : 0;
      m.fullT = isNum(m.fullT) ? m.fullT : 0;
      m.full = !!m.full;
      if (m.kind === 'drill') {
        const def = SLOTS[m.slot];
        if (!def || !Number.isInteger(m.socket) || m.socket < 0 || m.socket >= def.sockets)
          return null;
        if (!Array.isArray(m.buffer) || !m.buffer.every(isOre)) return null;
        m.level = Math.min(m.level, DRILL_MAX_LEVEL);
      } else {
        if (!isNum(m.x) || !isNum(m.y) || !Array.isArray(m.queue)) return null;
        m.level = Math.min(m.level, SMELTER_MAX_LEVEL);
        if (!m.queue.every(isOre)) return null;
        if (legacy) {
          // v1 bars were one chunk each at ×3; they keep that value and are never re-paired.
          const ready = old.ready as unknown;
          const bars: unknown[] = Array.isArray(ready) ? ready : isNum(ready) ? [ready] : [];
          if (!bars.every(isOre)) return null;
          m.ready = (bars as Ore[]).map((ore) => ({ ore, mult: LONE_BAR_VALUE }));
          const job = old.job as { ore?: unknown } | null;
          if (job && isOre(job.ore)) m.queue.unshift(job.ore);
          m.job = null;
        }
        if (
          !Array.isArray(m.ready) ||
          !m.ready.every((b) => b && isOre(b.ore) && isNum(b.mult) && b.mult >= 1)
        )
          return null;
        if (m.queue.length > SMELTER_QUEUE) return null;
        if (m.job && (!isOre(m.job.ore) || !isNum(m.job.left))) return null;
        if (m.job) m.job.pair = !!m.job.pair;
        m.idle = isNum(m.idle) ? m.idle : 0;
        m.jamT = isNum(m.jamT) ? m.jamT : 0;
        m.jam = !!m.jam;
      }
      for (const it of m.out?.items ?? []) {
        const item = it as unknown as { ore?: Ore; ores?: Ore[]; bar?: boolean; mult?: number };
        if (!Array.isArray(item.ores)) {
          // v1 saves before stacked belts held one item per slot.
          if (!isNum(item.ore)) return null;
          item.ores = [item.ore];
          delete item.ore;
        }
        if (legacy || !isNum(item.mult)) item.mult = item.bar ? LONE_BAR_VALUE : 1;
        delete item.bar;
        if (
          !it.ores.length ||
          it.ores.length > BELT_TIER_MAX ||
          !it.ores.every(isOre) ||
          !isNum(it.pos) ||
          !(it.mult >= 1)
        )
          return null;
      }
      if (m.out) {
        const t = m.out.to as { kind?: unknown; index?: unknown; id?: unknown };
        const ok =
          t.kind === 'dock'
            ? Number.isInteger(t.index)
            : (t.kind === 'smelter' || t.kind === 'drill') && isNum(t.id);
        if (!ok) return null;
      }
      ids.add(m.id);
    }
    return state;
  } catch {
    return null;
  }
}

export interface Settings {
  muted: boolean;
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
    return { muted: !!raw.muted };
  } catch {
    return { muted: false };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* Settings are a convenience. */
  }
}
