/** Rockhopper tuning. World units: one asteroid cell is `CELL` units; y grows downward. */

export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;
export const CELL = 10;

export type Ore = 1 | 2 | 3 | 4 | 5;
export const ROCK: Ore = 1;
export const COPPER: Ore = 2;
export const ICE: Ore = 3;
export const GOLD: Ore = 4;
export const CRYSTAL: Ore = 5;

export interface OreDef {
  name: string;
  value: number;
  hardness: number;
  color: string;
  dark: string;
}

export const ORES: Record<Ore, OreDef> = {
  1: { name: 'Rock', value: 1, hardness: 0.5, color: '#9C92C8', dark: '#6F66A0' },
  2: { name: 'Copper', value: 3, hardness: 1, color: '#FF8B3D', dark: '#C85E1C' },
  3: { name: 'Ice', value: 5, hardness: 1.2, color: '#5EE6FF', dark: '#23A9C9' },
  4: { name: 'Gold', value: 12, hardness: 2.5, color: '#FFD23F', dark: '#C99A12' },
  5: { name: 'Crystal', value: 30, hardness: 4, color: '#FF5BD8', dark: '#C42FA3' },
};

/** A bar is two chunks of one ore, worth this many chunks (so ×3 per chunk). */
export const BAR_VALUE = 6;
/** A lone chunk smelted because the queue held no pair: ×3, like the legacy bar. */
export const LONE_BAR_VALUE = 3;

export interface SlotDef {
  tier: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  /** Asteroid radius in cells. */
  r: number;
  /** Ore that appears twice as often in this slot's rocks. */
  signature: Ore;
  /** Credits to unlock; 0 = unlocked in a fresh save. */
  price: number;
}

export const SLOTS: readonly SlotDef[] = [
  { tier: 1, x: 0, y: -270, r: 6, signature: COPPER, price: 0 },
  { tier: 1, x: -170, y: -270, r: 6, signature: COPPER, price: 700 },
  { tier: 1, x: 170, y: -270, r: 6, signature: ICE, price: 3000 },
  { tier: 2, x: -150, y: -490, r: 8, signature: ICE, price: 15000 },
  { tier: 2, x: 150, y: -490, r: 8, signature: GOLD, price: 40000 },
  { tier: 3, x: -170, y: -750, r: 10, signature: GOLD, price: 160000 },
  { tier: 3, x: 170, y: -750, r: 10, signature: CRYSTAL, price: 360000 },
  { tier: 4, x: 0, y: -1010, r: 11, signature: CRYSTAL, price: 1800000 },
];

/** Share of cells that are ore (not rock) and which ores a tier can contain. */
export const TIER_ORE: Record<number, { share: number; ores: Ore[] }> = {
  1: { share: 0.26, ores: [COPPER, COPPER, COPPER, ICE] },
  2: { share: 0.34, ores: [COPPER, ICE, GOLD] },
  3: { share: 0.42, ores: [ICE, GOLD, CRYSTAL] },
  4: { share: 0.5, ores: [GOLD, CRYSTAL, CRYSTAL] },
};

/** Drills sit on a rim this far outside the asteroid radius, at any angle. */
export const RIM_GAP = 18;
/** Closest two drill centres may be, on one rock or across neighbours: a rim's length sets how many fit. */
export const DRILL_SPACING = 36;
export const HUB_RADIUS = 40;
export const DOCK_RADIUS = 49;
/** Screen-space dock angles in degrees, in unlock order: all on the upper arc, facing the field. */
export const DOCK_ANGLES = [-90, -113, -67, -136, -44, -159, -21, -180, 0];
export const DOCKS_START = 3;
export const DOCKS_MAX = 9;

/** Belts all move at one readable speed; capacity comes from bundle size (the belt's tier). */
export const BELT_SPEED = 110;
/** Belt dash pattern (units): the period stays well above per-frame travel at 25 fps. */
export const BELT_DASH: [number, number] = [4, 14];
/** Most chunks one bundle can hold on a belt of this tier: tiers 1–4. */
export const BELT_TIER_MAX = 4;
/**
 * Chunks per second a belt of this tier can carry. A belt loads a bundle once the last one has
 * moved a full spacing, which on the 30 Hz tick is every ceil(spacing / step) ticks: 7.5/s.
 */
export const beltCapacity = (tier: number) =>
  (TICK_HZ / Math.ceil(BELT_SPACING / (BELT_SPEED / TICK_HZ))) * tier;
/** Price of the next tier step, by how many tier steps are bought and owned (never by length). */
export const widenCost = (bought: number) => Math.round(90 * Math.pow(1.7, bought));
/** Input belts a drill (junction) can take. */
export const DRILL_INPUTS = 2;
export const BELT_SPACING = 13;
/** Belts whose centre lines come this close touch: the drawn tier-1 belt is this wide. */
export const CROSS_TOUCH = 10;
/**
 * Half the length of a crossing plate along each belt, the same at any angle. A plate a bundle
 * spacing long means two saturated belts that take turns each keep about half their bundles.
 */
export const CROSS_HALF = 7;
/**
 * Belts that share a machine only form a crossing farther than this from its centre; belts that
 * converge at a narrow angle are left alone farther out, up to CROSS_SHARED_MAX.
 */
export const CROSS_SHARED_CLEAR = 40;
export const CROSS_SHARED_MAX = 120;
export const DRILL_BUFFER = 4;
export const SMELTER_QUEUE = 6;
/** Finished bars (or passing bars) a smelter holds for its output belt. */
export const SMELTER_READY = 4;
export const SMELTER_RADIUS = 22;
export const DRILL_RADIUS = 16;

/** Work per second: hardness 1 rock breaks in 1 / rate seconds. */
export const LASER_POWER = [2, 3.5, 5.5, 8, 11, 15];
export const LASER_COST = [30, 160, 800, 3500, 15000];
export const drillRate = (level: number) => 2 * Math.pow(1.45, level - 1);
export const DRILL_MAX_LEVEL = 7;
export const drillUpgradeCost = (level: number) => Math.round(24 * Math.pow(2.1, level - 1));
/** Seconds per bar (two chunks): a level-1 smelter takes in more than a tier-1 belt carries. */
export const smelterTime = (level: number) => 0.23 / Math.pow(1.4, level - 1);
export const SMELTER_MAX_LEVEL = 8;
export const smelterUpgradeCost = (level: number) => Math.round(90 * Math.pow(2.2, level - 1));
export const smelterInputs = (level: number) => (level >= 5 ? 4 : level >= 3 ? 3 : 2);

/**
 * A drill is priced by the rock it stands on: its tier's base, growing gently with the drills
 * already on that rock. Rim space and finite cells limit drills per rock; the price shouldn't
 * limit them a second time (docs/ROCKHOPPER_DRILL_PRICES.md).
 */
export const DRILL_BASE: Record<1 | 2 | 3 | 4, number> = { 1: 14, 2: 400, 3: 6000, 4: 60000 };
export const DRILL_GROWTH = 1.15;
export const drillPrice = (tier: 1 | 2 | 3 | 4, onRock: number) =>
  Math.round(DRILL_BASE[tier] * Math.pow(DRILL_GROWTH, onRock));
/** The classic price (the menu switch turns it back on): 14, then ×1.55 per drill owned. */
export const classicDrillPrice = (owned: number) => Math.round(14 * Math.pow(1.55, owned));
export const smelterPrice = (owned: number) => Math.round(520 * Math.pow(2, owned));

/**
 * Factories (docs/ROCKHOPPER_SORTER.md, the factories experiment): a factory pairs two paired bars
 * of different ores into one alloy worth ALLOY_MULT times both bars, or PREMIUM_MULT for copper
 * with crystal, the only pair no rock carries together.
 */
export const ALLOY_MULT = 1.25;
export const PREMIUM_MULT = 2.5;
export const FACTORY_MAX_LEVEL = 3;
/** Seconds per alloy: 0.4 s at level 1, 1.35× faster per level. */
export const factoryTime = (level: number) => 0.4 / Math.pow(1.35, level - 1);
export const factoryUpgradeCost = (level: number) => Math.round(600 * Math.pow(2.2, level - 1));
export const factoryInputs = (level: number) => (level >= 3 ? 3 : 2);
export const factoryPrice = (owned: number) => Math.round(2400 * Math.pow(2, owned));
/** Unpaired bars a factory holds, pairs waiting for its worker, and items waiting to leave. */
/** Factories refuse rock (bars and chunks): it waits on the belt instead of passing through. */
export const FACTORY_REFUSE_ROCK = false;
export const FACTORY_STOCK = 6;
export const FACTORY_PAIRS = 3;
export const FACTORY_READY = 4;
export const dockCost = (docks: number) => Math.round(300 * Math.pow(2.6, docks - DOCKS_START));
export const TRACTOR_MAX = 5;
export const tractorCost = (level: number) => Math.round(150 * Math.pow(3, level));
export const arrivalSeconds = (level: number) => 8 * Math.pow(0.8, level);
/** The final part of the arrival during which the rock is visibly towed in. */
export const TOW_SECONDS = 1.4;

/** Crumble when fewer than this share of the original cells remain. */
export const CRUMBLE_AT = 0.2;
export const CRUMBLE_SECONDS = 1.5;

/** Hand-mined and crumble chunks fly straight to the hub. */
export const FLIGHT_SPEED = 700;
export const FLIGHT_MIN = 0.35;
export const FLIGHT_MAX = 1.1;

export const SELL_REFUND = 0.5;
