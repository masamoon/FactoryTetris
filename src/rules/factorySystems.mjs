const CARDINAL_OFFSETS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

const GRADE_VALUE = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

function normalizeShape(shape) {
  if (!Array.isArray(shape) || shape.length === 0) return [[1]];
  return shape.map((row) => (Array.isArray(row) ? row.map((cell) => (cell ? 1 : 0)) : []));
}

function getOccupiedCells(shape) {
  const cells = [];
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < (shape[y]?.length || 0); x += 1) {
      if (shape[y][x] === 1) cells.push({ x, y });
    }
  }
  return cells;
}

function sameCell(a, b) {
  return Boolean(a && b && a.x === b.x && a.y === b.y);
}

export function deriveShapeTopology(rawShape, inputPos = null) {
  const shape = normalizeShape(rawShape);
  const occupiedCells = getOccupiedCells(shape);
  const occupied = new Set(occupiedCells.map((cell) => `${cell.x},${cell.y}`));
  const endpoints = [];
  const boundaryPorts = [];

  for (const cell of occupiedCells) {
    const neighborCount = CARDINAL_OFFSETS.reduce(
      (count, offset) => count + Number(occupied.has(`${cell.x + offset.x},${cell.y + offset.y}`)),
      0
    );
    const exposedSides = CARDINAL_OFFSETS.filter(
      (offset) => !occupied.has(`${cell.x + offset.x},${cell.y + offset.y}`)
    ).length;
    if (neighborCount <= 1) endpoints.push({ ...cell });
    if (exposedSides > 0) boundaryPorts.push({ ...cell });
  }

  const width = Math.max(1, ...shape.map((row) => row.length));
  const height = shape.length;
  let voidCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (shape[y]?.[x] !== 1) voidCount += 1;
    }
  }

  let kind = 'conduit';
  let label = 'Conduit';
  let description = 'Fixed input and output tips make this a directional production link.';
  let bufferBonus = 0;

  if (endpoints.length >= 3) {
    kind = 'manifold';
    label = 'Manifold';
    description = 'Every free arm is an adaptive output, so one Operator can feed branches.';
  } else if (endpoints.length === 0) {
    kind = 'reservoir';
    label = 'Reservoir';
    description = 'The closed body stores three extra inputs and outputs.';
    bufferBonus = 3;
  } else if (voidCount > 0 && occupiedCells.length >= 5) {
    kind = 'socket';
    label = 'Socket';
    description = 'The open cavity can nest a one-cell route and stores one extra item.';
    bufferBonus = 1;
  }

  const outputPorts =
    kind === 'manifold' ? endpoints.filter((cell) => !sameCell(cell, inputPos)) : [];

  return {
    kind,
    label,
    description,
    bufferBonus,
    endpoints,
    boundaryPorts,
    outputPorts,
    occupiedCellCount: occupiedCells.length,
    voidCount,
  };
}

export function getFunctionalOutputPorts({
  shape,
  inputPos,
  configuredOutputPos,
  openManifolds = false,
} = {}) {
  const topology = deriveShapeTopology(shape, inputPos);
  const candidates = openManifolds
    ? topology.boundaryPorts.filter((cell) => !sameCell(cell, inputPos))
    : topology.kind === 'manifold'
      ? topology.outputPorts
      : [];
  const ports = [];
  const addPort = (cell) => {
    if (!cell || sameCell(cell, inputPos) || ports.some((port) => sameCell(port, cell))) return;
    ports.push({ x: cell.x, y: cell.y });
  };

  addPort(configuredOutputPos);
  candidates.forEach(addPort);
  return ports.length > 0 ? ports : configuredOutputPos ? [{ ...configuredOutputPos }] : [];
}

function getMetricMedal(value, par, { integerSteps = false } = {}) {
  const safeValue = Math.max(0, Number(value) || 0);
  const safePar = Math.max(0, Number(par) || 0);
  const silverLimit = integerSteps ? safePar + 1 : Math.ceil(safePar * 1.2);
  const bronzeLimit = integerSteps ? safePar + 3 : Math.ceil(safePar * 1.5);

  if (safeValue <= safePar) return { medal: 'gold', value: safeValue, par: safePar };
  if (safeValue <= silverLimit) return { medal: 'silver', value: safeValue, par: safePar };
  if (safeValue <= bronzeLimit) return { medal: 'bronze', value: safeValue, par: safePar };
  return { medal: 'none', value: safeValue, par: safePar };
}

export function evaluateFactoryBatch({ cost = 0, waste = 0, cycles = 0, benchmarks = {} } = {}) {
  const dimensions = {
    cost: getMetricMedal(cost, benchmarks.cost ?? 1),
    waste: getMetricMedal(waste, benchmarks.waste ?? 0, { integerSteps: true }),
    cycles: getMetricMedal(cycles, benchmarks.cycles ?? 1),
  };
  const score = Object.values(dimensions).reduce(
    (total, dimension) => total + GRADE_VALUE[dimension.medal],
    0
  );
  const rank = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 4 ? 'B' : 'C';
  return { rank, score, dimensions };
}

export function getBatchCycleState({ elapsedMs = 0, cycleMs = 1000, cycleLimit = 1 } = {}) {
  const safeCycleMs = Math.max(1, Number(cycleMs) || 1000);
  const safeLimit = Math.max(1, Math.floor(cycleLimit || 1));
  const used = Math.min(safeLimit, Math.floor(Math.max(0, elapsedMs || 0) / safeCycleMs));
  return {
    used,
    remaining: Math.max(0, safeLimit - used),
    limit: safeLimit,
    complete: used >= safeLimit,
  };
}
