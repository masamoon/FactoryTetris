import { UPGRADE_TYPES } from './upgrades.js';

export const BUILD_IDENTITIES = [
  {
    id: 'velocity',
    name: 'Velocity Engine',
    shortName: 'Velocity',
    color: 0x70d6ff,
    description: 'A flow build: fast belts, fast operators, and streak scoring.',
    upgradeTypes: [
      UPGRADE_TYPES.CONVEYOR_SPEED,
      UPGRADE_TYPES.OPERATOR_EFFICIENCY,
      UPGRADE_TYPES.SHIFT_HANDOFF,
    ],
    boonIds: ['boon_lean_lines', 'boon_every_fifth', 'boon_chromatic_alignment'],
    traitIds: ['overclocked', 'twin', 'conductor'],
  },
  {
    id: 'capital',
    name: 'Capital Flywheel',
    shortName: 'Capital',
    color: 0xffd166,
    description: 'An economy build: saved cash becomes more cash later.',
    upgradeTypes: [
      UPGRADE_TYPES.BUDGET,
      UPGRADE_TYPES.PROCUREMENT_REBATE,
      UPGRADE_TYPES.CLOSING_FLOAT,
    ],
    boonIds: ['boon_procurement_engine', 'boon_reinvestment_loop'],
    traitIds: ['beacon'],
  },
  {
    id: 'junction',
    name: 'Junction Web',
    shortName: 'Junction',
    color: 0x88ffcc,
    description: 'A routing build: splitters, mergers, and tunnels keep lines moving.',
    upgradeTypes: [
      UPGRADE_TYPES.INVENTORY_CAPACITY,
      UPGRADE_TYPES.SUPPLY_BOUNTY,
      UPGRADE_TYPES.STAGING_RACKS,
      UPGRADE_TYPES.SHIFT_HANDOFF,
      UPGRADE_TYPES.SORTING_JIG,
    ],
    boonIds: ['boon_heavy_haulers'],
    traitIds: ['conductor', 'beacon'],
  },
  {
    id: 'precision',
    name: 'Precision Lattice',
    shortName: 'Precision',
    color: 0xb56cff,
    description: 'A recipe build: stronger operators and exact outputs pay off.',
    upgradeTypes: [
      UPGRADE_TYPES.OPERATOR_EFFICIENCY,
      UPGRADE_TYPES.INVENTORY_CAPACITY,
      UPGRADE_TYPES.COLOR_CALIBRATION,
      UPGRADE_TYPES.WILDCARD_LICENSING,
      UPGRADE_TYPES.MATCHED_DIES,
      UPGRADE_TYPES.SHADE_GAUGE,
      UPGRADE_TYPES.SORTING_JIG,
      UPGRADE_TYPES.INDEX_MARKS,
    ],
    boonIds: ['boon_recipe_lattice', 'boon_suit_streak', 'boon_prism_market'],
    traitIds: ['twin', 'overclocked'],
  },
];

const BUILD_IDENTITIES_BY_ID = new Map(BUILD_IDENTITIES.map((identity) => [identity.id, identity]));

export function getBuildIdentityById(id) {
  return BUILD_IDENTITIES_BY_ID.get(id) || null;
}

export function getBuildIdentityLevel(score = 0) {
  if (score >= 6) return 3;
  if (score >= 4) return 2;
  if (score >= 2) return 1;
  return 0;
}
