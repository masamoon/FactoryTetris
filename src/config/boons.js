// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_heavy_haulers',
    name: 'Heavy Haulers',
    description: 'Conveyors carry 2 items, but processors are 15% slower.',
    rarity: 'rare',
  },
  {
    id: 'boon_every_fifth',
    name: 'Every Fifth Counts',
    description: 'Every 5th delivery toward a Contract counts double.',
    rarity: 'common',
  },
  {
    id: 'boon_overclock_surge',
    name: 'Overclock Surge',
    description: 'The first splitter output each cycle is one tier higher.',
    rarity: 'rare',
  },
  {
    id: 'boon_lean_lines',
    name: 'Lean Lines',
    description: '+25% conveyor speed, but −1 max inventory per machine.',
    rarity: 'common',
  },
  {
    id: 'boon_bulk_contracts',
    name: 'Bulk Contracts',
    description: 'Contracts need 20% fewer units, but give 15% less time.',
    rarity: 'rare',
  },
  {
    id: 'boon_momentum_engine',
    name: 'Momentum Engine',
    description: 'While momentum is at combo level, Contracts fill 20% faster.',
    rarity: 'common',
  },
];
