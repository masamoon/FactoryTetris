// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_heavy_haulers',
    name: 'Heavy Haulers',
    description: 'Belt-buffer run: conveyors carry 2 extra items, but Operators are 15% slower.',
    rarity: 'rare',
  },
  {
    id: 'boon_every_fifth',
    name: 'Every Fifth Counts',
    description: 'Delivery-cadence run: every 5th scoring delivery is worth double.',
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
    name: 'Lean Quotas',
    description:
      'Volume run: quota rounds have 20% lower score thresholds, but source supply is tighter.',
    rarity: 'rare',
  },
  {
    id: 'boon_junction_jubilee',
    name: 'Junction Jubilee',
    description:
      'Junction run: deliveries routed through splitters, mergers, or underground belts score 25% more.',
    rarity: 'rare',
  },
  {
    id: 'boon_recipe_lattice',
    name: 'Recipe Lattice',
    description: 'Ratio run: mixed or duplicate-input Operators work 25% faster.',
    rarity: 'common',
  },
  {
    id: 'boon_procurement_engine',
    name: 'Procurement Engine',
    description: 'Budget run: each completed delivery node refunds $3 Budget.',
    rarity: 'common',
  },
  {
    id: 'boon_reinvestment_loop',
    name: 'Reinvestment Loop',
    description: 'Overkill run: excess round score converts into next-round Budget.',
    rarity: 'rare',
  },
  {
    id: 'boon_high_roller',
    name: 'High Roller',
    description: 'Expensive Operators make deliveries score 35% more.',
    rarity: 'rare',
  },
];

export const STARTER_SPARK_POOL = [
  {
    id: 'spark_surge_voucher',
    name: 'Skip Ahead',
    description: 'Start on Round 3 with extra money and shop Scrap already paid out.',
    effect: 'Go to Round 3. Gain $40 and 10 Scrap.',
    rarity: 'volatile',
    fixedOffer: true,
  },
  {
    id: 'spark_hyperlane_key',
    name: 'Faster Factory',
    description: 'The first four rounds run faster and ask for a little more score.',
    effect: 'Rounds 1-4: faster belts, bigger goals, +4 Scrap for clearing every order.',
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
    effect: 'First full clear doubles order rewards and gives +8 Scrap.',
    rarity: 'volatile',
  },
];
