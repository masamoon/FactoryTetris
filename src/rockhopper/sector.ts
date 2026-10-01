/**
 * Sectors: a seeded field for each new game (the sectors prototype, `docs/ROCKHOPPER_SECTORS.md`).
 * A sector moves the rocks, swaps which ore each slot favours within its tier, and gives each slot
 * an outline form and a vein plan. Tiers, radii, prices and unlock order never change, so pacing
 * stays comparable; what changes is where belts have to go. Pure and deterministic: the same seed
 * always makes the same sector.
 */
import {
  CELL,
  CLASSIC_SLOTS,
  HUB_RADIUS,
  RIM_GAP,
  SLOTS,
  type RockShape,
  type SlotDef,
  type VeinPlan,
} from './config';

function rng(seed: number) {
  let a = (Math.imul(seed | 0, 2654435761) ^ 0x5bd1e995) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where each tier's rocks may sit: a band of heights and a half-width. */
const BANDS: Record<1 | 2 | 3 | 4, { y: [number, number]; x: number }> = {
  1: { y: [-335, -200], x: 215 },
  2: { y: [-600, -430], x: 205 },
  3: { y: [-870, -680], x: 190 },
  4: { y: [-1120, -950], x: 150 },
};
/** Clear space between two rims (room for drills on both and a belt between). */
const RIM_CLEAR = 14;
/** Clear space between a rim and the hub, so docks keep room for belts. */
const HUB_CLEAR = 110;

const rimOf = (d: SlotDef) => d.r * CELL + RIM_GAP;

export function sectorSlots(seed: number): SlotDef[] {
  const R = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(R() * xs.length)];
  const between = (a: number, b: number) => a + (b - a) * R();

  // Signatures swap within a tier. The free first rock stays copper so the opening reads the same.
  const sig = CLASSIC_SLOTS.map((d) => d.signature);
  for (const [a, b] of [
    [1, 2],
    [3, 4],
    [5, 6],
  ])
    if (R() < 0.5) [sig[a], sig[b]] = [sig[b], sig[a]];

  // Sometimes a first-tier rock sits beside the hub, below the docks, so its belts must climb.
  const flank = R() < 0.4 ? pick([1, 2]) : -1;

  // Place every rock, nearest first; a rock with no room throws the whole layout away and starts
  // again (the generator never moves a placed rock), so every sector is one legal draw.
  let spots: { x: number; y: number }[] = [];
  for (let attempt = 0; attempt < 500 && spots.length < CLASSIC_SLOTS.length; attempt++) {
    spots = [];
    for (const [i, def] of CLASSIC_SLOTS.entries()) {
      const rim = rimOf(def);
      const fits = (x: number, y: number) =>
        Math.hypot(x, y) >= rim + HUB_RADIUS + HUB_CLEAR &&
        spots.every(
          (o, k) => Math.hypot(o.x - x, o.y - y) >= rim + rimOf(CLASSIC_SLOTS[k]) + RIM_CLEAR
        );
      let spot: { x: number; y: number } | null = null;
      for (let t = 0; t < 60 && !spot; t++) {
        let x: number, y: number;
        if (i === 0) {
          x = between(-110, 110);
          y = between(-310, -215);
        } else if (i === flank) {
          x = (R() < 0.5 ? -1 : 1) * between(205, 245);
          y = between(-200, -110);
        } else {
          const band = BANDS[def.tier];
          x = between(-band.x, band.x);
          y = between(band.y[0], band.y[1]);
        }
        [x, y] = [Math.round(x), Math.round(y)];
        if (fits(x, y)) spot = { x, y };
      }
      if (!spot) break;
      spots.push(spot);
    }
  }
  // Never seen in testing (tools/rockhopper-sectors.ts checks 2000 seeds), but stay legal.
  if (spots.length < CLASSIC_SLOTS.length) spots = CLASSIC_SLOTS.map((d) => ({ x: d.x, y: d.y }));

  const out: SlotDef[] = [];
  CLASSIC_SLOTS.forEach((def, i) => {
    const { x, y } = spots[i];
    const shape: RockShape = {
      kind:
        i === 0
          ? pick(['round', 'oval'] as const)
          : pick(['round', 'oval', 'peanut', 'bitten'] as const),
      angle: R() * Math.PI * 2,
    };
    const veins: VeinPlan = {
      kind:
        i === 0
          ? pick(['scattered', 'crust', 'side', 'seam'] as const)
          : pick(['scattered', 'core', 'crust', 'side', 'seam', 'pockets'] as const),
      angle: R() * Math.PI * 2,
    };
    if (veins.kind === 'seam') veins.offset = between(-0.35, 0.35);
    if (veins.kind === 'pockets')
      veins.pockets = Array.from({ length: R() < 0.5 ? 2 : 3 }, () => {
        const a = R() * Math.PI * 2,
          d = between(0.25, 0.65);
        return { x: Math.cos(a) * d, y: Math.sin(a) * d };
      });
    out.push({ ...def, x, y, signature: sig[i], shape, veins });
  });
  return out;
}

let active = 'classic';

/**
 * Point `SLOTS` at this game's field: the classic one, or its seed's sector. Cheap when nothing
 * changed, so `step` calls it every tick and a state always simulates on its own layout.
 */
export function useSector(seed: number, sector: boolean) {
  const key = sector ? `sector:${seed}` : 'classic';
  if (key === active) return;
  active = key;
  const defs = sector ? sectorSlots(seed) : CLASSIC_SLOTS;
  const slots = SLOTS as SlotDef[];
  defs.forEach((d, i) => (slots[i] = { ...d }));
}

/** A sector's short name for the menu: its seed, as the player would share it. */
export const sectorName = (seed: number) => `Sector ${seed}`;

/** A fresh seed for a new sector game. */
export const newSectorSeed = () => 1 + Math.floor(Math.random() * 99999);
