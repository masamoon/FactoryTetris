// Build-defining run boons. Each boon is a one-off ("procedural") upgrade:
// id is stored in UpgradeManager.activeProceduralUpgrades; effects are read
// at a single site (see per-boon comment). No tiers.
export const BOON_POOL = [
  {
    id: 'boon_open_manifolds',
    name: 'Open Manifolds',
    description: 'Every exposed Operator edge becomes an adaptive output port.',
    effect: 'Operator geometry gains new routing exits instead of a numeric bonus.',
    rarity: 'rare',
  },
  {
    id: 'boon_service_hatches',
    name: 'Service Hatches',
    description: 'Each authored board opens the blocker nearest its center.',
    effect: 'Creates one new permanent routing gate on every future board.',
    rarity: 'common',
  },
  {
    id: 'boon_power_spine',
    name: 'Power Spine',
    description: 'Three open cells near the board center become Power Cells.',
    effect: 'Creates a new high-value placement spine on every future board.',
    rarity: 'common',
  },
  {
    id: 'boon_floor_exchange',
    name: 'Floor Exchange',
    description: 'Taxed Cells become Quality Cells on every future board.',
    effect: 'Rewrites the board economy into output-level routing opportunities.',
    rarity: 'rare',
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
