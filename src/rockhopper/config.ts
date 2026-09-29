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

export const BAR_MULTIPLIER = 3;

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
  sockets: number;
}

export const SLOTS: readonly SlotDef[] = [
  { tier: 1, x: 0, y: -230, r: 6, signature: COPPER, price: 0, sockets: 3 },
  { tier: 1, x: -170, y: -230, r: 6, signature: COPPER, price: 150, sockets: 3 },
  { tier: 1, x: 170, y: -230, r: 6, signature: ICE, price: 700, sockets: 3 },
  { tier: 2, x: -150, y: -460, r: 8, signature: ICE, price: 6000, sockets: 4 },
  { tier: 2, x: 150, y: -460, r: 8, signature: GOLD, price: 15000, sockets: 4 },
  { tier: 3, x: -170, y: -720, r: 10, signature: GOLD, price: 70000, sockets: 5 },
  { tier: 3, x: 170, y: -720, r: 10, signature: CRYSTAL, price: 180000, sockets: 5 },
  { tier: 4, x: 0, y: -990, r: 11, signature: CRYSTAL, price: 1500000, sockets: 6 },
];

/** Share of cells that are ore (not rock) and which ores a tier can contain. */
export const TIER_ORE: Record<number, { share: number; ores: Ore[] }> = {
  1: { share: 0.26, ores: [COPPER, COPPER, COPPER, ICE] },
  2: { share: 0.34, ores: [COPPER, ICE, GOLD] },
  3: { share: 0.42, ores: [ICE, GOLD, CRYSTAL] },
  4: { share: 0.5, ores: [GOLD, CRYSTAL, CRYSTAL] },
};

/** Drills sit this far outside the asteroid radius. */
export const SOCKET_GAP = 18;
export const HUB_RADIUS = 40;
export const DOCK_RADIUS = 49;
/** Screen-space dock angles in degrees, in unlock order: all on the upper arc, facing the field. */
export const DOCK_ANGLES = [-90, -113, -67, -136, -44, -159, -21, -180, 0];
export const DOCKS_START = 3;
export const DOCKS_MAX = 9;

export const BELT_SPEED = 95; // units per second
export const BELT_SPACING = 13;
export const DRILL_BUFFER = 4;
export const SMELTER_QUEUE = 4;
export const SMELTER_RADIUS = 22;
export const DRILL_RADIUS = 16;

/** Work per second: hardness 1 rock breaks in 1 / rate seconds. */
export const LASER_POWER = [2, 3.5, 5.5, 8, 11, 15];
export const LASER_COST = [30, 160, 800, 3500, 15000];
export const drillRate = (level: number) => 2 * Math.pow(1.45, level - 1);
export const DRILL_MAX_LEVEL = 10;
export const drillUpgradeCost = (level: number) => Math.round(24 * Math.pow(2.1, level - 1));
export const smelterTime = (level: number) => 0.5 / Math.pow(1.4, level - 1);
export const SMELTER_MAX_LEVEL = 8;
export const smelterUpgradeCost = (level: number) => Math.round(90 * Math.pow(2.2, level - 1));
export const smelterInputs = (level: number) => (level >= 3 ? 4 : 3);

export const drillPrice = (owned: number) => Math.round(14 * Math.pow(1.55, owned));
export const smelterPrice = (owned: number) => Math.round(120 * Math.pow(2, owned));
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
