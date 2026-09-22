import type {
  Definition,
  Kind,
  Resource,
  RunState,
  Point,
  Port,
  Machine,
  Source,
  Order,
  Tool,
} from './types';
const cells = (...pairs: number[][]): Point[] => pairs.map(([x, y]) => ({ x, y }));
const port = (x: number, y: number, direction: Port['direction'], index = 0): Port => ({
  x,
  y,
  direction,
  resource: 'any',
  index,
});
export const WIDTH = 8,
  HEIGHT = 9,
  CAPACITY = 2;
export const TOOLS: Tool[] = ['punch', 'cutter', 'straight', 'elbow'];
export const PRODUCTS: Record<Resource, { name: string; color: string; symbol: string }> = {
  blank: { name: 'Blank', color: '#f3dab0', symbol: '□' },
  punched: { name: 'Punched', color: '#a8d6d7', symbol: '▣' },
  clipped: { name: 'Clipped', color: '#edb079', symbol: '◩' },
  combined: { name: 'Both', color: '#c5b4e7', symbol: '◩' },
};
export const DEFINITIONS: Record<Kind, Definition> = {
  punch: {
    name: 'Punch',
    cells: cells([0, 0], [0, 1], [0, 2], [1, 2]),
    inputs: [port(0, 0, 3)],
    output: port(1, 2, 1),
    color: 0x79b8ba,
    duration: 2,
    description: 'Makes a round hole. Keeps any clipped corner.',
  },
  cutter: {
    name: 'Cutter',
    cells: cells([0, 0], [1, 0], [2, 0], [1, 1]),
    inputs: [port(0, 0, 3)],
    output: port(2, 0, 1),
    color: 0xe9a76e,
    duration: 2,
    description: 'Clips one corner. Keeps any existing hole.',
  },
  straight: {
    name: 'Straight',
    cells: cells([0, 0], [1, 0]),
    inputs: [port(0, 0, 3)],
    output: port(1, 0, 1),
    color: 0x89a6ae,
    duration: 1,
    description: 'Carries a tile unchanged.',
  },
  elbow: {
    name: 'Elbow',
    cells: cells([0, 0], [0, 1], [1, 1]),
    inputs: [port(0, 0, 0)],
    output: port(1, 1, 1),
    color: 0x89a6ae,
    duration: 1,
    description: 'Turns the route. The tile stays unchanged.',
  },
  module: {
    name: 'Folded factory',
    cells: cells([0, 0]),
    inputs: [],
    output: port(0, 0, 1),
    color: 0xf3d995,
    duration: 0,
    description: 'Original machines, tucked into one square.',
  },
};
export function transform(kind: Kind, r: Resource): Resource {
  if (kind === 'punch') return r === 'clipped' || r === 'combined' ? 'combined' : 'punched';
  if (kind === 'cutter') return r === 'punched' || r === 'combined' ? 'combined' : 'clipped';
  return r;
}
export interface Level {
  name: string;
  lesson: string;
  brief: string;
  actions: number;
  setup?: { kind: Tool; x: number; y: number; rotation: number }[];
  sources: Source[];
  blockers: Point[];
  orders: Omit<Order, 'delivered'>[];
}
const source = (
  id: number,
  x: number,
  y: number,
  direction: Source['direction'],
  resource: Resource = 'blank'
): Source => ({
  id,
  x,
  y,
  direction,
  resource,
});
const blocked = (test: (x: number, y: number) => boolean): Point[] =>
  Array.from({ length: 72 }, (_, i) => ({ x: i % 8, y: Math.floor(i / 8) })).filter((p) =>
    test(p.x, p.y)
  );
export const LEVELS: Level[] = [
  {
    name: 'First Delivery',
    lesson: 'Connect & produce',
    brief:
      'Connect a Punch to the blank supply. Pale OUT arrows feed dark IN arrows. Place a tool, or Run, to advance production.',
    actions: 5,
    sources: [source(-1, -1, 2, 1)],
    blockers: [],
    orders: [{ resource: 'punched', quantity: 3 }],
  },
  {
    name: 'Loading Bay',
    lesson: 'Give belts a job',
    brief:
      'The supply enters a narrow bay. Carry blanks into the workshop before connecting a Punch.',
    actions: 7,
    sources: [source(-1, 3, -1, 2)],
    blockers: blocked((x, y) => y < 2 && x !== 3),
    orders: [{ resource: 'punched', quantity: 4 }],
  },
  {
    name: 'Either Way Round',
    lesson: 'Choose the operation order',
    brief:
      'Both tools are needed. Punch then cut, or cut then punch: the finished tile is identical. Which arrangement fits?',
    actions: 8,
    sources: [source(-1, -1, 1, 1)],
    blockers: blocked((x, y) => y === 0 || (x >= 5 && y < 6) || (y >= 6 && x >= 3)),
    orders: [{ resource: 'combined', quantity: 4 }],
  },
  {
    name: 'Two Products',
    lesson: 'Batch, then extend',
    brief:
      'Ship punched tiles as well as tiles with both changes. Adding a Cutter diverts punched tiles from delivery. A fold can make room.',
    actions: 9,
    sources: [source(-1, -1, 2, 1)],
    blockers: blocked((x, y) => x >= 4 || y < 2 || y > 5),
    orders: [
      { resource: 'punched', quantity: 3 },
      { resource: 'combined', quantity: 3 },
    ],
  },
  {
    name: 'Tight Workshop',
    lesson: 'Complete a mixed order',
    brief:
      'Two supplies. Three products. Prepare another line while the first runs. Surplus waits when its quota is full; folding preserves it.',
    actions: 13,
    sources: [source(-1, -1, 1, 1), source(-2, 8, 6, 3)],
    blockers: blocked(
      (x, y) =>
        y === 0 || y === 8 || (x === 4 && y !== 3 && y !== 6) || (y === 4 && x !== 1 && x !== 6)
    ),
    orders: [
      { resource: 'punched', quantity: 4 },
      { resource: 'clipped', quantity: 4 },
      { resource: 'combined', quantity: 4 },
    ],
  },
  {
    name: 'Corner Delivery',
    lesson: 'Turn the route',
    actions: 8,
    brief:
      'Blanks arrive in the top-left corner. Turn them into the workshop, then clip their corners.',
    sources: [source(-1, 0, -1, 2)],
    blockers: blocked(
      (x, y) => !(x === 0 && y === 0) && !(y === 1 && x <= 1) && !(x >= 2 && y >= 1)
    ),
    orders: [{ resource: 'clipped', quantity: 4 }],
  },
  {
    name: 'Keep Some Clipped',
    lesson: 'Check what arrives',
    actions: 9,
    brief:
      'These tiles arrive clipped already. Ship some unchanged through a belt, then add holes for the Both order. A tool keeps earlier changes.',
    sources: [source(-1, -1, 2, 1, 'clipped')],
    blockers: [],
    orders: [
      { resource: 'clipped', quantity: 3 },
      { resource: 'combined', quantity: 3 },
    ],
  },
  {
    name: 'Repair Shop',
    lesson: 'Reconnect an existing line',
    actions: 9,
    brief:
      'The empty tools belong to you. Their line misses the supply by one square. Tap a tool and Move it; moving preserves any tiles inside.',
    sources: [source(-1, -1, 2, 1)],
    blockers: [],
    setup: [
      { kind: 'punch', x: 1, y: 2, rotation: 0 },
      { kind: 'cutter', x: 3, y: 4, rotation: 0 },
    ],
    orders: [{ resource: 'combined', quantity: 5 }],
  },
  {
    name: 'Split Deliveries',
    lesson: 'Choose which supply to change',
    actions: 12,
    brief:
      'Clipped tiles arrive on the left; punched tiles on the right. Belts can ship them unchanged. Decide which line will make Both after its first batch.',
    sources: [source(-1, -1, 1, 1, 'clipped'), source(-2, 8, 6, 3, 'punched')],
    blockers: blocked((x, y) => y === 4),
    orders: [
      { resource: 'clipped', quantity: 4 },
      { resource: 'punched', quantity: 4 },
      { resource: 'combined', quantity: 4 },
    ],
  },
  {
    name: 'One Dock, Three Orders',
    lesson: 'Change what the dock makes',
    actions: 14,
    brief:
      'One blank supply must serve three products. Complete a batch, then change the line. Folding a whole chain can clear the dock; stored tiles stay inside.',
    sources: [source(-1, -1, 2, 1)],
    blockers: [],
    orders: [
      { resource: 'punched', quantity: 3 },
      { resource: 'clipped', quantity: 3 },
      { resource: 'combined', quantity: 4 },
    ],
  },
];
export function definition(machine: Pick<Machine, 'kind' | 'folded'>): Definition {
  if (!machine.folded) return DEFINITIONS[machine.kind];
  return {
    ...DEFINITIONS.module,
    inputs: machine.folded.inputs.map((input, index) => port(0, 0, index === 0 ? 3 : 0, index)),
    output: port(0, 0, 1),
  };
}
export function geometry(machine: Pick<Machine, 'kind' | 'folded' | 'rotation' | 'x' | 'y'>) {
  const def = definition(machine);
  const w = Math.max(...def.cells.map((p) => p.x)) + 1;
  const h = Math.max(...def.cells.map((p) => p.y)) + 1;
  const turn = (p: Point): Point => {
    let { x, y } = p;
    let width = w,
      height = h;
    for (let r = 0; r < ((machine.rotation % 4) + 4) % 4; r++) {
      [x, y] = [height - 1 - y, x];
      [width, height] = [height, width];
    }
    return { x: x + machine.x, y: y + machine.y };
  };
  const rotatePort = (p: Port): Port => ({
    ...p,
    ...turn(p),
    direction: ((p.direction + machine.rotation) % 4) as Port['direction'],
  });
  return {
    cells: def.cells.map(turn),
    inputs: def.inputs.map(rotatePort),
    output: rotatePort(def.output),
  };
}

export function createRun(level = 0): RunState {
  if (!Number.isInteger(level) || !LEVELS[level]) throw new Error('Unknown level');
  const def = LEVELS[level];
  return {
    version: 2,
    level,
    mirrored: false,
    machines: (def.setup || []).map((m, i) => ({
      ...m,
      id: i + 1,
      inputs: DEFINITIONS[m.kind].inputs.map(() => []),
      output: [],
      processing: null,
      remaining: 0,
      emitted: 0,
    })),
    sources: structuredClone(def.sources),
    blockers: structuredClone(def.blockers),
    orders: def.orders.map((o) => ({ ...o, delivered: 0 })),
    actions: def.actions,
    tick: 0,
    status: 'playing',
    nextId: (def.setup?.length || 0) + 1,
    spaceRecovered: 0,
    folds: 0,
  };
}
