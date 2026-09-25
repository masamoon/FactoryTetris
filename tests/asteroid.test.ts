import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  beltPathError,
  build,
  buildBeltPath,
  cancelQueuedExtension,
  canMine,
  clone,
  createState,
  costFor,
  drillExtensionError,
  dispatchCourier,
  extendDrill,
  FRESH_DRILL_SITE,
  POCKET_RESERVES,
  pocketRemaining,
  THIRD_DRILL_SITE,
  machineAt,
  placementError,
  removeBelt,
  railOwner,
  reservedInput,
  tapMine,
  tileAt,
  undo,
  type State,
  type Session,
  type Resource,
} from '../src/asteroid/simulation';
import { beltPlacements, extendBeltPath } from '../src/asteroid/beltPath';
import { parseSave } from '../src/asteroid/persistence';
import {
  asteroidEarlyDrillReplay,
  asteroidExpansionReplay,
  asteroidReplay,
} from '../tools/asteroid-replay';

const step = (s: State, ticks: number) => {
  for (let i = 0; i < ticks; i++) advance(s);
};
const starter = (): Session => {
  const session = { state: createState(), history: [] };
  for (const y of [5, 6, 7])
    while (tileAt(session.state, { x: 8, y })) advance(session.state, { x: 8, y });
  return session;
};
const weight = (r: Resource) => (r === 'ore' ? 1 : r === 'plate' ? 2 : 4);
function inventoryWeight(s: State) {
  return (
    s.stock.ore +
    s.stock.plate * 2 +
    s.stock.part * 4 +
    s.machines.reduce(
      (n, m) =>
        n +
        [...m.input, ...m.output].reduce((v, r) => v + weight(r), 0) +
        m.loads.reduce((v, l) => v + l.amount, 0) +
        (m.progress && m.kind === 'smelter' ? 2 : m.progress && m.kind === 'assembler' ? 4 : 0),
      0
    ) +
    s.courier.cargo.reduce((n, r) => n + weight(r), 0)
  );
}
test('manual mining removes exposed finite terrain and cannot reach a buried block', () => {
  const s = createState();
  assert.equal(canMine(s, { x: 12, y: 6 }), 'Dig from an exposed face. This block is buried.');
  for (let i = 0; i < 11; i++) advance(s, { x: 8, y: 6 });
  assert.ok(tileAt(s, { x: 8, y: 6 }));
  advance(s, { x: 8, y: 6 });
  assert.equal(tileAt(s, { x: 8, y: 6 }), null);
  assert.equal(s.stock.ore, 2);
  for (let i = 0; i < 100; i++) advance(s, { x: 8, y: 6 });
  assert.equal(s.stock.ore, 2);
});
test('tap spam cannot bypass the extraction cap or add output to a held target', () => {
  const a = createState(),
    b = createState(),
    p = { x: 8, y: 6 };
  for (let i = 0; i < 10; i++) {
    advance(a, p);
    advance(b, p);
    for (let n = 0; n < 50; n++) tapMine(b, p, []);
  }
  assert.deepEqual(a, b);
});
test('starter bootstrap purchases a drill and blocked delivery halts excavation without loss', () => {
  const session = starter(),
    s = session.state;
  assert.equal(s.stock.ore, 6);
  assert.equal(build(session, 'drill', { x: 7, y: 6 }), null);
  const before = inventoryWeight(s),
    terrainBefore = s.terrain.filter(Boolean).length;
  step(s, 600);
  const m = s.machines[0];
  assert.ok(m.output.length <= 8);
  assert.ok(m.head <= m.end);
  assert.ok(m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) <= 8);
  const stopped = clone(s);
  step(s, 200);
  assert.deepEqual(s.terrain, stopped.terrain);
  assert.deepEqual(s.machines, stopped.machines);
  const removed = terrainBefore - s.terrain.filter(Boolean).length;
  assert.ok(removed > 0);
  assert.equal(inventoryWeight(s) - before, m.made);
  assert.equal(s.delivered.ore, 0);
});
test('rail payload has travel time and reserves output capacity', () => {
  const session = starter();
  build(session, 'drill', { x: 7, y: 6 });
  const m = session.state.machines[0];
  while (!m.loads.length) advance(session.state);
  assert.equal(m.output.length, 0);
  assert.ok(m.loads[0].remaining > 0);
  const remaining = m.loads[0].remaining,
    amount = m.loads[0].amount;
  step(session.state, remaining);
  assert.equal(m.output.length, amount);
  assert.ok(placementError(session.state, 'belt', { x: 8, y: 6 })?.includes('corridor'));
});
test('external cargo advances at most one cell in a transfer tick', () => {
  const session = starter();
  for (let x = 2; x <= 4; x++) build(session, 'belt', { x, y: 6 });
  const s = session.state;
  s.tick = 0;
  machineAt(s, { x: 4, y: 6 })!.output.push('ore');
  step(s, 3);
  assert.deepEqual(machineAt(s, { x: 3, y: 6 })!.output, ['ore']);
  assert.deepEqual(machineAt(s, { x: 2, y: 6 })!.output, []);
  assert.equal(s.delivered.ore, 0);
});
test('service-drone input is repeatable, conserved, saveable and does not evict build undo', () => {
  const session: Session = { state: createState(), history: [] };
  session.state.stock.ore = 20;
  const beforeBuild = clone(session.state);
  assert.equal(build(session, 'smelter', { x: 7, y: 6 }), null);
  const smelter = machineAt(session.state, { x: 7, y: 6 })!,
    historyLength = session.history.length;
  smelter.output = Array(4).fill('plate') as Resource[];
  const beforeWeight = inventoryWeight(session.state);
  assert.equal(dispatchCourier(session, smelter.id), null);
  assert.equal(session.state.stock.ore, 10);
  assert.deepEqual(session.state.courier.cargo, ['ore', 'ore']);
  assert.deepEqual(smelter.input, []);
  assert.equal(reservedInput(session.state, smelter), 2);
  assert.equal(inventoryWeight(session.state), beforeWeight);
  assert.equal(session.history.length, historyLength);
  step(session.state, session.state.courier.duration);
  assert.deepEqual(smelter.input, ['ore', 'ore']);
  assert.equal(session.state.courier.phase, 'returning');
  step(session.state, session.state.courier.duration);
  assert.equal(session.state.courier.phase, 'idle');

  assert.equal(dispatchCourier(session, smelter.id), null);
  assert.equal(session.state.stock.ore, 8);
  assert.equal(inventoryWeight(session.state), beforeWeight);
  step(session.state, session.state.courier.duration);
  assert.equal(smelter.input.length, 4);
  assert.equal(session.history.length, historyLength);

  smelter.output = [];
  advance(session.state);
  assert.equal(smelter.progress, 1);
  assert.equal(smelter.input.length, 2);
  step(session.state, session.state.courier.duration - 1);
  smelter.output = Array(4).fill('plate') as Resource[];
  const blockedWeight = inventoryWeight(session.state);
  assert.equal(dispatchCourier(session, smelter.id), null);
  assert.equal(smelter.input.length, 2);
  assert.equal(reservedInput(session.state, smelter), 2);
  assert.equal(inventoryWeight(session.state), blockedWeight);
  assert.equal(session.history.length, historyLength);
  assert.deepEqual(parseSave(JSON.stringify(session)), session);
  assert.ok(undo(session));
  assert.deepEqual(session.state, beforeBuild);
});
test('service drone completes the next pair and rejects insufficient, full or invalid targets atomically', () => {
  const session: Session = { state: createState(), history: [] };
  session.state.stock.plate = 8;
  assert.equal(build(session, 'assembler', { x: 7, y: 6 }), null);
  const assembler = machineAt(session.state, { x: 7, y: 6 })!;
  assembler.input.push('plate');
  assembler.output = Array(4).fill('part') as Resource[];
  session.state.stock.plate = 1;
  const historyLength = session.history.length;
  assert.equal(dispatchCourier(session, assembler.id), null);
  assert.deepEqual(assembler.input, ['plate']);
  assert.deepEqual(session.state.courier.cargo, ['plate']);
  step(session.state, session.state.courier.duration);
  assert.deepEqual(assembler.input, ['plate', 'plate']);
  assert.equal(session.state.stock.plate, 0);
  assert.equal(session.history.length, historyLength);

  const base: Session = { state: createState(), history: [] };
  base.state.stock.ore = 10;
  build(base, 'smelter', { x: 7, y: 6 });
  const id = base.state.machines[0].id;
  for (const mutate of [
    (s: Session) => (s.state.stock.ore = 1),
    (s: Session) => (s.state.machines[0].input = ['ore', 'ore', 'ore', 'ore']),
  ]) {
    const invalid = clone(base);
    mutate(invalid);
    const before = clone(invalid);
    assert.ok(dispatchCourier(invalid, id));
    assert.deepEqual(invalid, before);
  }
  const drillSession = starter();
  build(drillSession, 'drill', { x: 7, y: 6 });
  const beforeDrill = clone(drillSession);
  assert.match(dispatchCourier(drillSession, drillSession.state.machines[0].id)!, /Only/);
  assert.deepEqual(drillSession, beforeDrill);
});
test('courier reservations prevent belts from overflowing a processor input', () => {
  const session: Session = { state: createState(), history: [] };
  session.state.stock.ore = 20;
  assert.equal(build(session, 'smelter', { x: 4, y: 6 }), null);
  assert.equal(build(session, 'belt', { x: 5, y: 6 }), null);
  const smelter = machineAt(session.state, { x: 4, y: 6 })!,
    belt = machineAt(session.state, { x: 5, y: 6 })!;
  smelter.input.push('ore', 'ore');
  smelter.output = Array(4).fill('plate') as Resource[];
  belt.output.push('ore');
  assert.equal(dispatchCourier(session, smelter.id), null);
  assert.equal(reservedInput(session.state, smelter), 2);
  step(session.state, 3);
  assert.deepEqual(belt.output, ['ore']);
  assert.deepEqual(smelter.input, ['ore', 'ore']);
  step(session.state, session.state.courier.duration - 3);
  assert.equal(smelter.input.length, 4);
  assert.equal(belt.output.length, 1);
});
test('a delivered courier batch starts real processor work and produces its output', () => {
  const session: Session = { state: createState(), history: [] };
  session.state.stock.plate = 8;
  assert.equal(build(session, 'assembler', { x: 7, y: 6 }), null);
  const assembler = machineAt(session.state, { x: 7, y: 6 })!;
  assert.equal(dispatchCourier(session, assembler.id), null);
  const arrival = session.state.courier.duration;
  step(session.state, arrival);
  assert.equal(assembler.progress, 1);
  assert.deepEqual(assembler.input, []);
  step(session.state, 30);
  assert.deepEqual(assembler.output, ['part']);
  assert.equal(assembler.made, 1);
});
test('dragged belt paths interpolate, backtrack and point from gesture start to destination', () => {
  let path = extendBeltPath([{ x: 6, y: 6 }], { x: 2, y: 6 });
  assert.deepEqual(
    path,
    [6, 5, 4, 3, 2].map((x) => ({ x, y: 6 }))
  );
  assert.deepEqual(
    beltPlacements(path, 0).map((p) => p.direction),
    [3, 3, 3, 3, 3]
  );
  path = extendBeltPath(path, { x: 4, y: 6 });
  assert.deepEqual(
    path,
    [6, 5, 4].map((x) => ({ x, y: 6 }))
  );
  path = extendBeltPath(path, { x: 3, y: 6 });
  path = extendBeltPath(path, { x: 3, y: 8 });
  assert.deepEqual(path.slice(-3), [
    { x: 3, y: 6 },
    { x: 3, y: 7 },
    { x: 3, y: 8 },
  ]);
  assert.deepEqual(
    beltPlacements(path, 0).map((p) => p.direction),
    [3, 3, 3, 2, 2, 2]
  );
});
test('a dragged conveyor route is one atomic build and one undo step', () => {
  const session: Session = { state: createState(), history: [] },
    before = clone(session),
    path = beltPlacements(
      [6, 5, 4, 3, 2].map((x) => ({ x, y: 6 })),
      3
    );
  assert.equal(buildBeltPath(session, path), null);
  assert.equal(session.state.machines.length, 5);
  assert.equal(session.history.length, 1);
  assert.ok(session.state.machines.every((m) => m.kind === 'belt' && m.direction === 3));
  assert.ok(undo(session));
  assert.deepEqual(session, before);
});
test('dragged conveyor validation rejects the whole route and never silently redirects belts', () => {
  const session: Session = { state: createState(), history: [] };
  build(session, 'belt', { x: 4, y: 6 }, 0);
  const beforeRedirect = clone(session),
    redirect = beltPlacements(
      [5, 4, 3].map((x) => ({ x, y: 6 })),
      3
    );
  assert.match(beltPathError(session.state, redirect)!, /cannot redirect/);
  assert.match(buildBeltPath(session, redirect)!, /cannot redirect/);
  assert.deepEqual(session, beforeRedirect);

  const blocked = beltPlacements(
    [3, 2, 1].map((x) => ({ x, y: 6 })),
    3
  );
  assert.match(buildBeltPath(session, blocked)!, /dock/);
  assert.deepEqual(session, beforeRedirect);

  machineAt(session.state, { x: 4, y: 6 })!.direction = 3;
  machineAt(session.state, { x: 4, y: 6 })!.output.push('ore');
  const beforeCargo = clone(session);
  assert.match(buildBeltPath(session, redirect)!, /cargo/);
  assert.deepEqual(session, beforeCargo);
});
test('a dragged route made only of matching conveyors is a history-free no-op', () => {
  const session: Session = { state: createState(), history: [] },
    route = beltPlacements(
      [5, 4, 3].map((x) => ({ x, y: 6 })),
      3
    );
  assert.equal(buildBeltPath(session, route), null);
  const built = clone(session);
  assert.equal(buildBeltPath(session, route), null);
  assert.deepEqual(session, built);
});
test('complete real trajectory yields plates and parts without injected stock', () => {
  const { session } = asteroidReplay();
  assert.ok(session.state.delivered.ore >= 8);
  assert.ok(session.state.delivered.plate >= 6);
  assert.ok(session.state.delivered.part >= 1);
  assert.ok(session.state.machines.some((m) => m.kind === 'assembler'));
  // Initial terrain extraction minus build costs, weighted by ore content.
  const initial = createState();
  const extracted = initial.terrain.reduce(
    (n, t, i) => n + (t && !session.state.terrain[i] ? (t.kind === 'ore' ? 4 : 2) : 0),
    0
  );
  const deepOre = Object.keys(POCKET_RESERVES).reduce(
    (n, key) => n + POCKET_RESERVES[key] - session.state.pockets[key],
    0
  );
  assert.equal(inventoryWeight(session.state) + 6 + 8 + 6 * 2, extracted + deepOre);
});
test('both reviewed expansion branches execute through the real reducer and remain saveable', () => {
  const extended = asteroidExpansionReplay('extend'),
    fresh = asteroidExpansionReplay('fresh-drill');
  assert.equal(extended.session.state.machines.find((m) => m.kind === 'drill')!.extensions, 1);
  assert.equal(fresh.session.state.machines.filter((m) => m.kind === 'drill').length, 2);
  assert.ok(fresh.session.state.delivered.ore > 10);
  assert.deepEqual(parseSave(JSON.stringify(extended.session)), extended.session);
  assert.deepEqual(parseSave(JSON.stringify(fresh.session)), fresh.session);
});
test('early ore-funded drill ships a real load through its own route', () => {
  const result = asteroidEarlyDrillReplay();
  assert.equal(result.secondBuiltTick, 81);
  assert.equal(result.secondShipmentTick, 138);
  assert.equal(result.session.state.stock.part, 0);
  assert.equal(result.session.state.machines.filter((m) => m.kind === 'drill').length, 2);
  assert.deepEqual(parseSave(JSON.stringify(result.session)), result.session);
});
test('ore-funded second drill and queued extension preserve the pocket and paid corridor', () => {
  const { session: opening } = asteroidReplay(),
    first = opening.state.machines.find((m) => m.kind === 'drill')!;
  while (first.head <= first.end || first.loads.length) advance(opening.state);
  assert.deepEqual(opening.state.stock, { ore: 2, plate: 0, part: 1 });
  assert.deepEqual(costFor(opening.state, 'drill'), { ore: 2 });

  const extension = clone(opening),
    extendedDrill = extension.state.machines.find((m) => m.kind === 'drill')!,
    oldEnd = extendedDrill.end;
  assert.equal(drillExtensionError(extension.state, extendedDrill), null);
  assert.equal(extendDrill(extension, extendedDrill.id), null);
  assert.deepEqual(extension.state.stock, { ore: 2, plate: 0, part: 0 });
  assert.equal(extendedDrill.end, oldEnd);
  assert.equal(extendedDrill.extension?.queued, true);
  assert.equal(railOwner(extension.state, { x: oldEnd + 8, y: extendedDrill.y }), extendedDrill);
  assert.deepEqual(parseSave(JSON.stringify(extension)), extension);
  const originalPocket = pocketRemaining(extension.state, extendedDrill);
  step(extension.state, extendedDrill.extension!.duration);
  assert.equal(extendedDrill.end, oldEnd);
  assert.ok(pocketRemaining(extension.state, extendedDrill) <= originalPocket);
  let safety = 3000;
  while (!extendedDrill.extensions && safety--) advance(extension.state);
  assert.ok(extendedDrill.extensions);
  assert.equal(pocketRemaining(extension.state, extendedDrill), 72);
  const extensionStartStock = extension.state.stock.ore;
  while (tileAt(extension.state, { x: oldEnd + 1, y: extendedDrill.y })) advance(extension.state);
  assert.equal(extendedDrill.loads[0].duration, Math.ceil((oldEnd + 1 - extendedDrill.x) * 2.5));
  assert.ok(extendedDrill.loads[0].duration > 20);
  assert.equal(extension.state.stock.ore, extensionStartStock);

  const fresh = clone(opening);
  assert.equal(build(fresh, 'drill', FRESH_DRILL_SITE), null);
  assert.deepEqual(fresh.state.stock, { ore: 0, plate: 0, part: 1 });
  assert.equal(fresh.state.machines.filter((m) => m.kind === 'drill').length, 2);
  assert.deepEqual(costFor(fresh.state, 'drill'), { ore: 8 });
  const richFace = fresh.state.machines.find(
    (m) => m.kind === 'drill' && m.x === FRESH_DRILL_SITE.x && m.y === FRESH_DRILL_SITE.y
  )!;
  let yieldAhead = 0;
  for (let x = richFace.x + 1; x <= richFace.end; x++) {
    const tile = tileAt(fresh.state, { x, y: richFace.y });
    if (tile) yieldAhead += tile.kind === 'ore' ? 4 : 2;
  }
  assert.equal(yieldAhead, 32);
});
test('extension validation is atomic and undo restores its consumed part and later production', () => {
  const { session } = asteroidReplay(),
    drill = session.state.machines.find((m) => m.kind === 'drill')!;
  while (drill.head <= drill.end || drill.loads.length) advance(session.state);
  const before = clone(session);
  assert.equal(extendDrill(session, drill.id), null);
  let safety = 3000;
  while (!drill.extensions && safety--) advance(session.state);
  assert.ok(drill.extensions);
  assert.ok(undo(session));
  assert.deepEqual(session.state, before.state);

  const beforeDrill = before.state.machines.find((m) => m.id === drill.id)!;
  for (let x = beforeDrill.end + 1; x <= beforeDrill.end + 8; x++)
    before.state.terrain[beforeDrill.y * 36 + x] = null;
  const empty = clone(before);
  assert.equal(
    drillExtensionError(before.state, before.state.machines.find((m) => m.id === drill.id)!),
    'No unexcavated terrain remains in the next eight cells.'
  );
  assert.ok(extendDrill(before, drill.id));
  assert.deepEqual(before, empty);
});
test('queued kit cancellation refunds once, releases the corridor and survives save and undo', () => {
  const { session } = asteroidReplay(),
    drill = session.state.machines.find((m) => m.kind === 'drill')!;
  while (drill.head <= drill.end) advance(session.state);
  const before = clone(session);
  assert.equal(extendDrill(session, drill.id), null);
  assert.equal(drill.extension?.queued, true);
  const reserved = { x: drill.end + 1, y: drill.y };
  assert.equal(railOwner(session.state, reserved), drill);
  assert.equal(cancelQueuedExtension(session, drill.id), null);
  assert.equal(drill.extension, undefined);
  assert.equal(railOwner(session.state, reserved), undefined);
  assert.equal(session.state.stock.part, before.state.stock.part);
  assert.ok(cancelQueuedExtension(session, drill.id));
  assert.deepEqual(parseSave(JSON.stringify(session)), session);
  assert.equal(build(session, 'belt', { x: 2, y: 5 }), null);
  assert.ok(undo(session));
  assert.equal(session.state.machines.find((m) => m.id === drill.id)!.extension, undefined);
  assert.equal(session.state.stock.part, before.state.stock.part);
  assert.ok(undo(session));
  assert.deepEqual(session.state, before.state);
});
test('undoing a later build can restore a queued kit without duplicating its refund', () => {
  const { session } = asteroidReplay(),
    drill = session.state.machines.find((m) => m.kind === 'drill')!;
  while (drill.head <= drill.end) advance(session.state);
  const originalParts = session.state.stock.part;
  assert.equal(extendDrill(session, drill.id), null);
  assert.equal(build(session, 'belt', { x: 2, y: 5 }), null);
  assert.ok(undo(session));
  const restored = session.state.machines.find((m) => m.id === drill.id)!;
  assert.equal(restored.extension?.queued, true);
  assert.equal(session.state.stock.part, originalParts - 1);
  assert.equal(cancelQueuedExtension(session, drill.id), null);
  assert.equal(session.state.stock.part, originalParts);
  assert.equal(railOwner(session.state, { x: drill.end + 1, y: drill.y }), undefined);
  assert.deepEqual(parseSave(JSON.stringify(session)), session);
});
test('third ore-funded base is reachable and pocket reserves are saved independently of drills', () => {
  const { session } = asteroidReplay();
  assert.equal(build(session, 'belt', { x: 1, y: 5 }, 2), null);
  for (let x = 2; x <= 7; x++) assert.equal(build(session, 'belt', { x, y: 5 }), null);
  assert.equal(build(session, 'drill', FRESH_DRILL_SITE), null);
  let safety = 1000;
  while (session.state.stock.ore < 8 && safety--) advance(session.state);
  assert.ok(safety > 0);
  assert.equal(build(session, 'belt', { x: 1, y: 7 }, 0), null);
  for (let x = 2; x <= 7; x++) assert.equal(build(session, 'belt', { x, y: 7 }), null);
  assert.equal(build(session, 'drill', THIRD_DRILL_SITE), null);
  assert.equal(session.state.machines.filter((m) => m.kind === 'drill').length, 3);
  assert.ok(build(session, 'drill', { x: 8, y: 4 }));
  const third = session.state.machines.find(
    (m) => m.kind === 'drill' && m.y === THIRD_DRILL_SITE.y
  )!;
  const reserve = session.state.pockets['16,7'];
  safety = 1500;
  while (session.state.pockets['16,7'] === reserve && safety--) advance(session.state);
  assert.ok(safety > 0);
  assert.equal(third.head, third.end + 1);
  assert.equal(session.state.pockets['16,7'], reserve - 4);
  assert.deepEqual(parseSave(JSON.stringify(session)), session);
});
test('empty-belt edits and invalid purchases are atomic; undo rewinds subsequent production', () => {
  const session = starter();
  build(session, 'belt', { x: 3, y: 6 });
  machineAt(session.state, { x: 3, y: 6 })!.output.push('ore');
  const before = clone(session);
  assert.ok(removeBelt(session, { x: 3, y: 6 }));
  assert.ok(build(session, 'smelter', { x: 3, y: 6 }));
  assert.deepEqual(session, before);
  const reference = clone(session.state);
  build(session, 'drill', { x: 7, y: 6 });
  step(session.state, 100);
  assert.ok(undo(session));
  assert.deepEqual(session.state, reference);
});
test('save validation restores exact history and rejects malformed inventories or state', () => {
  const { session } = asteroidReplay();
  assert.deepEqual(parseSave(JSON.stringify(session)), session);
  for (const raw of [
    'bad',
    '{}',
    JSON.stringify({
      ...session,
      state: { ...session.state, stock: { ore: -1, plate: 0, part: 0 } },
    }),
  ])
    assert.equal(parseSave(raw), null);
  const bad = clone(session);
  bad.state.machines[0].output = Array(99).fill('ore') as Resource[];
  assert.equal(parseSave(JSON.stringify(bad)), null);
});
test('save validation preserves courier travel and migrates older asteroid saves', () => {
  const session: Session = { state: createState(), history: [] };
  session.state.stock.ore = 12;
  assert.equal(build(session, 'smelter', { x: 7, y: 6 }), null);
  assert.equal(dispatchCourier(session, session.state.machines[0].id), null);
  step(session.state, 4);
  assert.deepEqual(parseSave(JSON.stringify(session)), session);

  const corrupt = clone(session);
  corrupt.state.courier.duration++;
  assert.equal(parseSave(JSON.stringify(corrupt)), null);
  const forgedPocket = clone(session);
  forgedPocket.state.pockets['15,6'] = 100;
  assert.equal(parseSave(JSON.stringify(forgedPocket)), null);
  const missingPocket = clone(session) as unknown as {
    state: Omit<State, 'pockets'> & { pockets?: State['pockets'] };
    history: State[];
  };
  delete missingPocket.state.pockets;
  assert.equal(parseSave(JSON.stringify(missingPocket)), null);

  type LegacyState = Omit<State, 'version' | 'courier' | 'pockets'> & {
    version: 1;
    courier?: State['courier'];
    pockets?: State['pockets'];
  };
  const legacy = clone(session) as unknown as { state: LegacyState; history: LegacyState[] };
  legacy.state.version = 1;
  delete legacy.state.courier;
  delete legacy.state.pockets;
  for (const state of legacy.history) {
    state.version = 1;
    delete state.courier;
    delete state.pockets;
  }
  const migrated = parseSave(JSON.stringify(legacy));
  assert.equal(migrated?.state.courier.phase, 'idle');
  assert.equal(migrated?.state.version, 2);
  assert.deepEqual(migrated?.state.pockets, POCKET_RESERVES);
  assert.ok(migrated?.history.every((state) => state.courier.phase === 'idle'));
});

test('repeated edits stay saveable; identical empty conveyors do not grow undo', () => {
  const session = starter();
  build(session, 'belt', { x: 3, y: 6 });
  const initial = clone(session);
  for (let i = 0; i < 100; i++) build(session, 'belt', { x: 3, y: 6 });
  assert.deepEqual(session, initial);
  for (let i = 0; i < 1000; i++) build(session, 'belt', { x: 3, y: 6 }, (i % 4) as 0 | 1 | 2 | 3);
  assert.equal(session.history.length, 40);
  const raw = JSON.stringify(session);
  assert.ok(raw.length <= 2_000_000);
  assert.deepEqual(parseSave(raw), session);
});
test('save validation rejects impossible cargo, overlapping rails, and backwards time', () => {
  const { session } = asteroidReplay();
  for (const mutate of [
    (s: State) => {
      s.machines.find((m) => m.kind === 'belt')!.input.push('part');
    },
    (s: State) => {
      s.machines.find((m) => m.kind === 'smelter')!.output.push('ore');
    },
    (s: State) => {
      s.machines.find((m) => m.kind === 'belt')!.x = 8;
    },
    (s: State) => {
      s.lastTap = s.tick + 1;
    },
    (s: State) => {
      s.machines.find((m) => m.kind === 'drill')!.head = 30;
    },
    (s: State) => {
      const drill = s.machines.find((m) => m.kind === 'drill')!;
      drill.extension = { targetEnd: drill.end + 7, duration: 20, remaining: 10 };
    },
  ]) {
    const corrupt = clone(session);
    mutate(corrupt.state);
    assert.equal(parseSave(JSON.stringify(corrupt)), null);
  }
});
