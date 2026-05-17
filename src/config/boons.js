// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_heavy_haulers',
    name: 'Heavy Haulers',
    description: 'Belt-buffer run: conveyors carry 2 extra items, but processors are 15% slower.',
    rarity: 'rare',
  },
  {
    id: 'boon_every_fifth',
    name: 'Every Fifth Counts',
    description: 'Delivery-cadence run: every 5th delivery toward a Contract counts double.',
    rarity: 'common',
  },
  {
    id: 'boon_overclock_surge',
    name: 'Overclock Surge',
    description: 'Splitter run: the first splitter output each cycle is one tier higher.',
    rarity: 'rare',
  },
  {
    id: 'boon_lean_lines',
    name: 'Lean Lines',
    description: 'Speed run: +25% conveyor speed, but -1 max inventory per machine.',
    rarity: 'common',
  },
  {
    id: 'boon_bulk_contracts',
    name: 'Bulk Contracts',
    description: 'Volume run: Contracts need 20% fewer units, but give 15% less time.',
    rarity: 'rare',
  },
  {
    id: 'boon_momentum_engine',
    name: 'Momentum Engine',
    description: 'Surge run: while momentum is at combo level, Contracts fill 20% faster.',
    rarity: 'common',
  },
  {
    id: 'boon_junction_jubilee',
    name: 'Junction Jubilee',
    description:
      'Junction run: deliveries routed through splitters, mergers, or underground belts get +1 Contract credit.',
    rarity: 'rare',
  },
  {
    id: 'boon_recipe_lattice',
    name: 'Recipe Lattice',
    description: 'Ratio run: mixed or duplicate-input processors work 25% faster.',
    rarity: 'common',
  },
  {
    id: 'boon_surge_foundry',
    name: 'Surge Foundry',
    description:
      'Burst run: Flow Surge lasts longer and every 3rd surge shipment gets +1 Contract credit.',
    rarity: 'common',
  },
];
