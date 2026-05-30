// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_heavy_haulers',
    name: 'Heavy Haulers',
    description: 'Conveyors carry +2 items each, but all Operators process 15% slower.',
    rarity: 'rare',
  },
  {
    id: 'boon_every_fifth',
    name: 'Every Fifth Counts',
    description: 'Every 5th paying delivery is worth double.',
    rarity: 'common',
  },
  {
    id: 'boon_lean_lines',
    name: 'Lean Lines',
    description: 'Conveyors move 25% faster, but every machine has -1 max inventory.',
    rarity: 'common',
  },
  {
    id: 'boon_bulk_contracts',
    name: 'Lean Quotas',
    description: 'Round quotas are 20% lower, but each source starts with 18% less supply.',
    rarity: 'rare',
  },
  {
    id: 'boon_recipe_lattice',
    name: 'Recipe Lattice',
    description: 'Operators with multi-item recipes or duplicate inputs process 25% faster.',
    rarity: 'common',
  },
  {
    id: 'boon_procurement_engine',
    name: 'Procurement Engine',
    description: 'Each completed delivery node refunds $3 cash.',
    rarity: 'common',
  },
  {
    id: 'boon_reinvestment_loop',
    name: 'Reinvestment Loop',
    description: 'Revenue earned past the round quota pays extra cash.',
    rarity: 'rare',
  },
  {
    id: 'boon_suit_streak',
    name: 'Suit Streak',
    description: 'Exact-color deliveries earn 25% more revenue, but Wild items do not trigger it.',
    rarity: 'common',
  },
  {
    id: 'boon_prism_market',
    name: 'Prism Market',
    description: 'Shop Operators gain +18% chance to output Wild items, up to the 75% cap.',
    rarity: 'rare',
  },
  {
    id: 'boon_chromatic_alignment',
    name: 'Chromatic Alignment',
    description: 'Operators outputting a demanded color process 20% faster; Wild does not count.',
    rarity: 'common',
  },
];

export const STARTER_SPARK_POOL = [
  {
    id: 'spark_surge_voucher',
    name: 'Skip Ahead',
    description: 'Start on Round 3 with extra cash already paid out.',
    effect: 'Go to Round 3. Gain $140.',
    rarity: 'volatile',
    fixedOffer: true,
  },
  {
    id: 'spark_hyperlane_key',
    name: 'Faster Factory',
    description: 'The first four rounds run faster and ask for a little more revenue.',
    effect: 'Rounds 1-4: faster belts and bigger goals.',
    rarity: 'rare',
  },
  {
    id: 'spark_prototype_crate',
    name: 'Free Prototype',
    description: 'Start with one stronger Operator already available to place.',
    effect: 'Adds a strong Operator to your deck and puts it in your first hand.',
    rarity: 'rare',
  },
  {
    id: 'spark_jackpot_primer',
    name: 'First Clear Bonus',
    description: 'Your first round where every order is completed pays much more.',
    effect: 'First full clear doubles order revenue.',
    rarity: 'volatile',
  },
];
