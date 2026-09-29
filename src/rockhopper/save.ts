import { DRILL_MAX_LEVEL, SLOTS, SMELTER_MAX_LEVEL } from './config';
import { freshState, type Rock, type State } from './sim';

export const SAVE_KEY = 'rockhopper.save.v1';
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
  return JSON.stringify({ ...s, slots, laser: null, events: undefined });
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Parse a save; any structural problem returns null so the caller can start fresh. */
export function deserialize(text: string): State | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (raw.version !== 1 || !Array.isArray(raw.slots) || raw.slots.length !== SLOTS.length)
      return null;
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
      if (m.kind === 'drill') {
        const def = SLOTS[m.slot];
        if (!def || !Number.isInteger(m.socket) || m.socket < 0 || m.socket >= def.sockets)
          return null;
        if (!Array.isArray(m.buffer)) return null;
        m.level = Math.min(m.level, DRILL_MAX_LEVEL);
      } else {
        if (!isNum(m.x) || !isNum(m.y) || !Array.isArray(m.queue)) return null;
        m.level = Math.min(m.level, SMELTER_MAX_LEVEL);
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
