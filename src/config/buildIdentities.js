export const BUILD_IDENTITIES = [
  {
    id: 'manifold',
    name: 'Manifold Bus',
    shortName: 'Manifold',
    color: 0x70d6ff,
    description: 'Operators expose extra exits and replace dedicated splitters.',
    upgradeTypes: [],
    boonIds: ['boon_open_manifolds'],
    traitIds: ['overclocked', 'twin', 'conductor'],
  },
  {
    id: 'hatches',
    name: 'Service Route',
    shortName: 'Hatches',
    color: 0xffd166,
    description: 'Central blockers open into new routing gates on every board.',
    upgradeTypes: [],
    boonIds: ['boon_service_hatches'],
    traitIds: ['beacon'],
  },
  {
    id: 'power',
    name: 'Power Spine',
    shortName: 'Power',
    color: 0x88ffcc,
    description: 'A central chain of powered cells defines the factory backbone.',
    upgradeTypes: [],
    boonIds: ['boon_power_spine'],
    traitIds: ['conductor', 'beacon'],
  },
  {
    id: 'quality',
    name: 'Quality Exchange',
    shortName: 'Quality',
    color: 0xb56cff,
    description: 'Taxed pockets become level-boosting placement opportunities.',
    upgradeTypes: [],
    boonIds: ['boon_floor_exchange'],
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
