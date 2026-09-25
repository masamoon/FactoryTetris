import {
  advance,
  build,
  createState,
  extendDrill,
  FRESH_DRILL_SITE,
  machineAt,
  tileAt,
  type Point,
  type Session,
  type Tool,
  type Direction,
} from '../src/asteroid/simulation';

export type ReplayAction =
  | { type: 'mine'; p: Point }
  | { type: 'build'; kind: Tool; p: Point; direction?: Direction }
  | { type: 'extend'; id: number }
  | { type: 'wait'; ticks: number };
export function asteroidReplay() {
  const session: Session = { state: createState(), history: [] },
    actions: ReplayAction[] = [];
  const mine = (p: Point) => {
    let safety = 100;
    while (tileAt(session.state, p) && safety--) advance(session.state, p);
    if (tileAt(session.state, p)) throw new Error('Mining did not expose the block');
    actions.push({ type: 'mine', p });
  };
  const place = (kind: Tool, x: number, y: number) => {
    const p = { x, y },
      error = build(session, kind, p);
    if (error) throw new Error(`${kind} (${x},${y}): ${error}`);
    actions.push({ type: 'build', kind, p });
  };
  const wait = (test: () => boolean) => {
    let ticks = 0;
    while (!test() && ticks < 2000) {
      advance(session.state);
      ticks++;
    }
    if (!test())
      throw new Error(
        `Factory stalled: ${JSON.stringify(session.state.stock)} / ${JSON.stringify(session.state.machines)}`
      );
    actions.push({ type: 'wait', ticks });
  };
  mine({ x: 8, y: 5 });
  mine({ x: 8, y: 6 });
  mine({ x: 8, y: 7 });
  for (let x = 2; x <= 6; x++) place('belt', x, 6);
  place('drill', 7, 6);
  wait(
    () =>
      session.state.stock.ore >= 8 && machineAt(session.state, { x: 4, y: 6 })!.output.length === 0
  );
  place('smelter', 4, 6);
  wait(
    () =>
      session.state.stock.plate >= 6 &&
      machineAt(session.state, { x: 3, y: 6 })!.output.length === 0
  );
  place('assembler', 3, 6);
  wait(() => session.state.delivered.part >= 1);
  return { session, actions };
}
export type ExpansionChoice = 'extend' | 'fresh-drill';
export function asteroidExpansionReplay(choice: ExpansionChoice) {
  const { session, actions } = asteroidReplay();
  const wait = (test: () => boolean) => {
    let ticks = 0;
    while (!test() && ticks < 2000) {
      advance(session.state);
      ticks++;
    }
    if (!test()) throw new Error(`Expansion stalled: ${choice}`);
    actions.push({ type: 'wait', ticks });
  };
  const primary = session.state.machines.find((m) => m.kind === 'drill')!;
  wait(() => primary.head > primary.end && primary.loads.length === 0);
  if (choice === 'extend') {
    const made = primary.made,
      error = extendDrill(session, primary.id);
    if (error) throw new Error(`extend: ${error}`);
    actions.push({ type: 'extend', id: primary.id });
    wait(() => (primary.extensions || 0) === 1 && primary.made > made);
  } else {
    const place = (kind: Tool, p: Point, direction: Direction = 3) => {
      const error = build(session, kind, p, direction);
      if (error) throw new Error(`${kind} (${p.x},${p.y}): ${error}`);
      actions.push({ type: 'build', kind, p, direction });
    };
    place('belt', { x: 1, y: 5 }, 2);
    for (let x = 2; x <= 7; x++) place('belt', { x, y: 5 });
    place('drill', FRESH_DRILL_SITE);
    const delivered = session.state.delivered.ore;
    wait(() => session.state.delivered.ore > delivered);
  }
  return { session, actions, choice };
}
export function asteroidEarlyDrillReplay() {
  const session: Session = { state: createState(), history: [] };
  for (const y of [5, 6, 7])
    while (tileAt(session.state, { x: 8, y })) advance(session.state, { x: 8, y });
  for (let x = 2; x <= 6; x++) {
    const error = build(session, 'belt', { x, y: 6 });
    if (error) throw new Error(error);
  }
  const firstError = build(session, 'drill', { x: 7, y: 6 });
  if (firstError) throw new Error(firstError);
  while (session.state.stock.ore < 2) advance(session.state);
  const secondBuiltTick = session.state.tick;
  const secondError = build(session, 'drill', FRESH_DRILL_SITE);
  if (secondError) throw new Error(secondError);
  const route = [
    { x: 1, y: 5, direction: 2 as Direction },
    ...Array.from({ length: 6 }, (_, i) => ({ x: i + 2, y: 5, direction: 3 as Direction })),
  ];
  for (const { x, y, direction } of route) {
    const error = build(session, 'belt', { x, y }, direction);
    if (error) throw new Error(error);
  }
  let secondShipmentTick = 0;
  for (let i = 0; i < 500 && !secondShipmentTick; i++) {
    const events = advance(session.state);
    if (events.some((e) => e.type === 'ship' && e.from.x === 1 && e.from.y === 5))
      secondShipmentTick = session.state.tick;
  }
  if (!secondShipmentTick) throw new Error('The second drill did not ship ore');
  return { session, secondBuiltTick, secondShipmentTick };
}
if (process.argv[1]?.endsWith('asteroid-replay.ts')) {
  const opening = asteroidReplay(),
    early = asteroidEarlyDrillReplay(),
    branches = (['extend', 'fresh-drill'] as ExpansionChoice[]).map((choice) => {
      const result = asteroidExpansionReplay(choice);
      return {
        choice,
        ticks: result.session.state.tick,
        simulationSeconds: result.session.state.tick / 10,
        stock: result.session.state.stock,
        delivered: result.session.state.delivered,
        drills: result.session.state.machines.filter((m) => m.kind === 'drill').length,
        actions: result.actions.slice(opening.actions.length),
      };
    });
  console.log(
    JSON.stringify(
      {
        result: 'Ore → plate → part delivered',
        ticks: opening.session.state.tick,
        simulationSeconds: opening.session.state.tick / 10,
        stock: opening.session.state.stock,
        delivered: opening.session.state.delivered,
        mined: opening.session.state.mined,
        actions: opening.actions,
        expansionBranches: branches,
        earlyDrill: {
          builtTick: early.secondBuiltTick,
          firstShipmentTick: early.secondShipmentTick,
          drills: early.session.state.machines.filter((m) => m.kind === 'drill').length,
        },
      },
      null,
      2
    )
  );
}
