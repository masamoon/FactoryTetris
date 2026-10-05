import {
  BELT_TIER_MAX,
  DOCK_ANGLES,
  DRILL_MAX_LEVEL,
  FACTORY_MAX_LEVEL,
  FACTORY_PAIRS,
  FACTORY_READY,
  FACTORY_STOCK,
  LONE_BAR_VALUE,
  type Ore,
  SLOTS,
  SMELTER_MAX_LEVEL,
  SMELTER_QUEUE,
} from './config';
import {
  drillSpotWhy,
  freshState,
  grantResearch,
  LEGACY_SOCKETS,
  legacySocketAngle,
  normAngle,
  relayout,
  smelterSpotOk,
  MAX_POSTS,
  type Bar,
  type Point,
  type Rock,
  type State,
  type Research,
  type RaisedPiece,
} from './sim';

/**
 * Each experiment that changes the save format saves under its own key and never writes or
 * deletes the older keys, so rolling the build back finds the older save untouched. The
 * logistics experiment moved v1 to v2; the factories experiment moves v2 to v3.
 * `?restore=pre-factories` deletes v3, so v2 is migrated again; `?restore=pre-logistics` deletes
 * v3 and migrates v1, leaving v2 alone.
 */
export const SAVE_KEY = 'rockhopper.save.v3';
export const PREV_SAVE_KEY = 'rockhopper.save.v2';
export const LEGACY_SAVE_KEY = 'rockhopper.save.v1';
export const SETTINGS_KEY = 'rockhopper.settings.v1';

interface SavedRock extends Omit<Rock, 'cells' | 'work' | 'layers' | 'layersLeft' | 'bands'> {
  cells: string;
  work: [number, number][];
  /** Slow-burn rocks: each cell's layers left, comma-separated. */
  layers?: string;
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
          ...(slot.rock.layers
            ? {
                depth: slot.rock.depth,
                layersTotal: slot.rock.layersTotal,
                layers: slot.rock.layers.join(','),
              }
            : {}),
        } satisfies SavedRock)
      : null,
  }));
  // The laser follows a live finger; it is never saved, so a reload cannot keep it firing.
  const machines = s.machines.map((m) => (m.kind === 'drill' ? { ...m, stalled: undefined } : m));
  return JSON.stringify({
    ...s,
    slots,
    machines,
    laser: null,
    events: undefined,
    crossingsNotice: undefined,
  });
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const isOre = (v: unknown): v is Ore =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

/** An alloy's pair is canonical (the higher ore in `alloy`) and its value a whole credit. */
function alloyOk(ore: Ore, c: { alloy?: unknown; v?: unknown }): boolean {
  if (c.alloy === undefined && c.v === undefined) return true;
  return (
    isOre(c.alloy) && (c.alloy as number) > ore && Number.isInteger(c.v) && (c.v as number) >= 0
  );
}

const barOk = (b: Bar) => !!b && isOre(b.ore) && isNum(b.mult) && b.mult >= 1 && alloyOk(b.ore, b);

/** Parse a save; any structural problem returns null so the caller can start fresh. */
export function deserialize(text: string): State | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    if (
      (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) ||
      !Array.isArray(raw.slots) ||
      raw.slots.length !== SLOTS.length
    )
      return null;
    // v1 saves predate belt tiers, value multipliers and bar pairing: migrate in place.
    const legacy = raw.version === 1;
    if (!isNum(raw.credits) || !isNum(raw.tick) || !isNum(raw.seed) || !Array.isArray(raw.machines))
      return null;
    const base = freshState(raw.seed, raw.sector === true);
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
        if (r.layers !== undefined) {
          // A slow-burn rock: every live cell keeps 1..depth layers, every empty one none.
          const depth = r.depth;
          const layers = r.layers.split(',').map(Number);
          if (
            !Number.isInteger(depth) ||
            (depth as number) < 2 ||
            layers.length !== w * w ||
            layers.some((l, k) =>
              cells[k] ? !(Number.isInteger(l) && l >= 1 && l <= depth!) : l !== 0
            )
          )
            throw new Error('layers');
          const left = layers.reduce((a, b) => a + b, 0);
          rock.depth = depth;
          rock.layers = layers;
          rock.layersLeft = left;
          rock.layersTotal = isNum(r.layersTotal) ? Math.max(r.layersTotal, left) : left;
          rock.bands = 0;
        }
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
      version: 3,
      slots,
      events: [],
      // Saves from before the crossings experiment turn it on, and the game says so once.
      crossings: typeof raw.crossings === 'boolean' ? raw.crossings : true,
      crossingsNotice: typeof raw.crossings !== 'boolean' ? true : undefined,
      // Saves from before the drill-prices experiment load with it on.
      rockPrices: typeof raw.rockPrices === 'boolean' ? raw.rockPrices : true,
      // Saves from before the fixed-costs experiment load with it on.
      fixedCosts: typeof raw.fixedCosts === 'boolean' ? raw.fixedCosts : true,
      // The factories experiment is off by default while it is a prototype.
      factories: typeof raw.factories === 'boolean' ? raw.factories : false,
      // The joins experiment is off by default while it is a prototype.
      joins: raw.joins === true ? true : undefined,
      // The ore picks experiment is off by default while it is a prototype.
      orePicks: raw.orePicks === true ? true : undefined,
      // Saves from before sectors were played on the classic field.
      sector: raw.sector === true,
      // Saves from before slow-burn rocks play classic rocks.
      slowRocks: raw.slowRocks === true ? true : undefined,
    };
    if (!state.slots[0].unlocked) return null;
    state.laser = null;
    // Research (Lab lifts): a malformed field resets research to off and empty, never the save.
    state.research = parseResearch(raw.research);
    if (!state.research) delete state.research;
    else grantResearch(state);
    // Dock sites must be distinct, one per dock: anything else puts the docks back in the
    // classic order rather than refusing the save (links still name docks by index).
    const sites = raw.dockSites;
    if (
      !Array.isArray(sites) ||
      sites.length !== state.docks ||
      new Set(sites).size !== sites.length ||
      sites.some((k) => !Number.isInteger(k) || k < 0 || k >= DOCK_ANGLES.length)
    )
      delete state.dockSites;
    const ids = new Set<number>();
    for (const m of state.machines) {
      if (
        !isNum(m.id) ||
        ids.has(m.id) ||
        (m.kind !== 'drill' && m.kind !== 'smelter' && m.kind !== 'factory' && m.kind !== 'join')
      )
        return null;
      if (m.kind === 'factory' && raw.version !== 3) return null;
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
      m.fullT = isNum(m.fullT) ? Math.max(0, Math.min(1, m.fullT)) : 0;
      m.full = !!m.full;
      m.cd = isNum(m.cd) ? Math.max(0, Math.floor(m.cd)) : 0;
      m.wait = isNum(m.wait) ? Math.max(0, Math.floor(m.wait)) : 0;
      m.heldAgo = isNum(m.heldAgo) ? Math.max(0, Math.floor(m.heldAgo)) : 30;
      m.crossT = isNum(m.crossT) ? Math.max(0, Math.min(1, m.crossT)) : 0;
      m.cross = !!m.cross;
      if (m.kind === 'drill') {
        const def = SLOTS[m.slot];
        if (!def) return null;
        if (!isNum(m.angle)) {
          // Saves from before free placement name one of the rock's fixed sockets. A drill with
          // neither is re-seated on its rim below rather than losing the save.
          const k = old.socket;
          m.angle =
            Number.isInteger(k) && (k as number) >= 0 && (k as number) < LEGACY_SOCKETS[m.slot]
              ? legacySocketAngle(m.slot, k as number)
              : NaN;
        }
        delete old.socket;
        if (isNum(m.angle)) m.angle = normAngle(m.angle);
        if (!Array.isArray(m.buffer) || !m.buffer.every(isOre)) return null;
        m.level = Math.min(m.level, DRILL_MAX_LEVEL);
        // An ore pick is copper to crystal; anything else loads as no pick, not a refused save.
        if (m.pick !== undefined && !(isOre(m.pick) && m.pick !== 1)) delete m.pick;
      } else if (m.kind === 'join') {
        if (!isNum(m.x) || !isNum(m.y)) return null;
        m.level = 1;
      } else if (m.kind === 'factory') {
        if (!isNum(m.x) || !isNum(m.y)) return null;
        m.level = Math.min(m.level, FACTORY_MAX_LEVEL);
        if (
          !Array.isArray(m.stock) ||
          m.stock.length > FACTORY_STOCK ||
          !m.stock.every((b) => barOk(b) && isNum(b.t))
        )
          return null;
        if (
          !Array.isArray(m.pairs) ||
          m.pairs.length > FACTORY_PAIRS ||
          !m.pairs.every((p) => Array.isArray(p) && p.length === 2 && p.every(barOk))
        )
          return null;
        if (!Array.isArray(m.ready) || m.ready.length > FACTORY_READY + 1 || !m.ready.every(barOk))
          return null;
        if (
          m.job &&
          (!Array.isArray(m.job.pair) ||
            m.job.pair.length !== 2 ||
            !m.job.pair.every(barOk) ||
            !isNum(m.job.left))
        )
          return null;
        m.job = m.job ?? null;
        m.rawT = isNum(m.rawT) ? Math.max(0, Math.min(1, m.rawT)) : 0;
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
        if (!Array.isArray(m.ready) || !m.ready.every(barOk)) return null;
        if (m.queue.length > SMELTER_QUEUE) return null;
        if (m.job && (!isOre(m.job.ore) || !isNum(m.job.left))) return null;
        if (m.job) m.job.pair = !!m.job.pair;
        m.idle = isNum(m.idle) ? m.idle : 0;
        m.jamT = isNum(m.jamT) ? Math.max(0, Math.min(1, m.jamT)) : 0;
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
        if (!isNum(it.w) || it.w < 1) delete it.w;
        else it.w = Math.floor(it.w);
        if (
          !it.ores.length ||
          it.ores.length > BELT_TIER_MAX ||
          !it.ores.every(isOre) ||
          !isNum(it.pos) ||
          !(it.mult >= 1) ||
          !it.ores.every((o) => alloyOk(o, it))
        )
          return null;
      }
      if (m.out) {
        const t = m.out.to as { kind?: unknown; index?: unknown; id?: unknown };
        const ok =
          t.kind === 'dock'
            ? Number.isInteger(t.index)
            : (t.kind === 'smelter' ||
                t.kind === 'drill' ||
                t.kind === 'factory' ||
                t.kind === 'join') &&
              isNum(t.id);
        if (!ok) return null;
        // Bend posts are optional: a malformed list straightens the belt rather than losing the save.
        const via = (m.out as { via?: unknown }).via;
        if (via !== undefined) {
          const good =
            Array.isArray(via) &&
            via.length > 0 &&
            via.length <= MAX_POSTS &&
            via.every(
              (p) =>
                p &&
                isNum((p as Point).x) &&
                isNum((p as Point).y) &&
                Math.abs((p as Point).x) < 400 &&
                (p as Point).y > -1300 &&
                (p as Point).y < 200
            );
          if (good) m.out.via = (via as Point[]).map((p) => ({ x: p.x, y: p.y }));
          else delete m.out.via;
        }
      }
      ids.add(m.id);
    }
    // A drill with no angle, or overlapping another machine, moves to the nearest free rim spot.
    let moved = false;
    for (const m of state.machines) {
      if (m.kind !== 'drill') continue;
      const from = isNum(m.angle) ? m.angle : Math.PI / 2;
      const why = drillSpotWhy(state, m.slot, from, m.id, false);
      if (isNum(m.angle) && (!why || why === 'locked')) continue;
      if (why === 'locked') {
        m.angle = from;
        continue;
      }
      let spot: number | null = null;
      for (let k = 1; k <= 144 && spot === null; k++) {
        const a = normAngle(from + (k % 2 ? 1 : -1) * Math.floor(k / 2) * (Math.PI / 72));
        if (!drillSpotWhy(state, m.slot, a, m.id, false)) spot = a;
      }
      if (spot === null) return null;
      m.angle = spot;
      m.cell = -1;
      moved = true;
    }
    if (moved && !legacy) relayout(state);
    if (legacy) {
      // The logistics build moved the tiers up: a smelter from an old save may now sit inside
      // a rock. Move it to the nearest legal spot, then fit every belt again.
      for (const m of state.machines) {
        if (m.kind !== 'smelter' || smelterSpotOk(state, m, m.id, null, false)) continue;
        const spot = nearestLegal(state, m.x, m.y, m.id);
        if (spot) {
          m.x = spot.x;
          m.y = spot.y;
        }
      }
      relayout(state);
    }
    return state;
  } catch {
    return null;
  }
}

/** The legal smelter spot nearest to (x, y), on rings of growing radius. */
function nearestLegal(s: State, x: number, y: number, except: number) {
  for (let r = 6; r <= 400; r += 6) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / 6));
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n;
      const p = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
      if (smelterSpotOk(s, p, except, null, false)) return p;
    }
  }
  return null;
}

export interface Settings {
  muted: boolean;
  /** The sectors prototype: new games get a random seed and its generated field (default on). */
  sectors: boolean;
  /** Slow-burn rocks: new games get deep rocks and auto-tow (default on). */
  slowRocks: boolean;
  /** The factories experiment, kept across restarts (default off). */
  factories: boolean;
  /** The joins experiment (links into empty space and onto belts), kept across restarts (default off). */
  joins: boolean;
  /** The ore picks experiment: drills dig their picked ore first, kept across restarts (default off). */
  orePicks: boolean;
  /** The research Lab and lifts (needs factories), kept across restarts (default off). */
  research: boolean;
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>;
    return {
      muted: !!raw.muted,
      sectors: raw.sectors !== false,
      slowRocks: raw.slowRocks !== false,
      factories: raw.factories === true,
      joins: raw.joins === true,
      orePicks: raw.orePicks === true,
      research: raw.research === true,
    };
  } catch {
    return {
      muted: false,
      sectors: true,
      slowRocks: true,
      factories: false,
      joins: false,
      orePicks: false,
      research: false,
    };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* Settings are a convenience. */
  }
}

function parseResearch(raw: unknown): Research | undefined {
  if (raw === undefined) return undefined;
  const off: Research = { on: false, lifts: { owned: 0, raised: [] } };
  const r = raw as Record<string, unknown> | null;
  const lifts = r?.lifts as Record<string, unknown> | undefined;
  if (!r || typeof r.on !== 'boolean' || !lifts) return off;
  const owned = lifts.owned;
  const raised = lifts.raised;
  if (!Number.isInteger(owned) || (owned as number) < 0 || !Array.isArray(raised)) return off;
  const pt = (p: unknown) => {
    const q = p as Record<string, unknown> | null;
    return !!q && isNum(q.x) && isNum(q.y);
  };
  const ok = raised.every((x) => {
    const q = x as Record<string, unknown> | null;
    return (
      !!q &&
      Number.isInteger(q.owner) &&
      Number.isInteger(q.piece) &&
      Number.isInteger(q.pieces) &&
      pt(q.a) &&
      pt(q.b)
    );
  });
  if (!ok || raised.length > (owned as number)) return off;
  // The Lab's fields (all optional): each must be well formed, or research resets.
  const lab = r.lab as Record<string, unknown> | undefined;
  if (
    lab !== undefined &&
    (!lab || !Number.isInteger(lab.owner) || !isNum(lab.frac) || !isNum(lab.x) || !isNum(lab.y))
  )
    return off;
  const strs = (v: unknown) =>
    v === undefined || (Array.isArray(v) && v.every((x) => typeof x === 'string'));
  const ores = (v: unknown) => v === undefined || (Array.isArray(v) && v.every(isOre));
  const counts = r.counts as Record<string, unknown> | undefined;
  if (
    !strs(r.learned) ||
    !ores(r.known) ||
    (r.active !== undefined && typeof r.active !== 'string') ||
    (counts !== undefined &&
      (!counts || typeof counts !== 'object' || !Object.values(counts).every(isNum))) ||
    (r.hold !== undefined &&
      (!Array.isArray(r.hold) ||
        !r.hold.every((h: { ore?: unknown; t?: unknown }) => isOre(h?.ore) && isNum(h?.t))))
  )
    return off;
  return {
    ...(lab
      ? {
          lab: {
            owner: lab.owner as number,
            frac: lab.frac as number,
            x: lab.x as number,
            y: lab.y as number,
          },
        }
      : {}),
    ...(typeof r.active === 'string' ? { active: r.active } : {}),
    ...(counts ? { counts: { ...(counts as Record<string, number>) } } : {}),
    ...(r.learned ? { learned: [...(r.learned as string[])] } : {}),
    ...(r.known ? { known: [...(r.known as Ore[])] } : {}),
    ...(r.hold
      ? { hold: (r.hold as { ore: Ore; t: number }[]).map((h) => ({ ore: h.ore, t: h.t })) }
      : {}),
    on: r.on,
    lifts: {
      owned: owned as number,
      raised: (raised as RaisedPiece[]).map((q) => ({
        owner: q.owner,
        piece: q.piece,
        pieces: q.pieces,
        a: { x: q.a.x, y: q.a.y },
        b: { x: q.b.x, y: q.b.y },
      })),
    },
  };
}
