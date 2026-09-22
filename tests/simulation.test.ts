import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, DEFINITIONS, geometry, LEVELS, TOOLS, transform } from '../src/game/content';
import {
  advanceTick,
  applyCommand,
  checkPlacement,
  connectionPreview,
  graphEdges,
  leaves,
  makeMachine,
  previewFold,
} from '../src/game/simulation';
import {
  loadSession,
  saveSession,
  SAVE_KEY,
  validState,
  loadSettings,
} from '../src/game/persistence';
import {
  diversionWarnings,
  machineStatus,
  nextProduct,
  previewState,
  incomingProduct,
  inputDetails,
} from '../src/ui/explain';
import { winningReplay } from '../tools/replay';
import type { Command, Resource, RunState, Session, SimEvent } from '../src/game/types';
const initial = (level = 0): Session => ({ state: createRun(level), undo: null });
const command = (s: Session, c: Command) => {
  const r = applyCommand(s, c);
  assert.equal(r.error, undefined);
  return r.session;
};
const dynamic = (s: RunState) =>
  leaves(s.machines).map((m) => ({
    id: m.id,
    inputs: m.inputs,
    output: m.output,
    processing: m.processing,
    remaining: m.remaining,
    emitted: m.emitted,
  }));
const count = (s: RunState) =>
  leaves(s.machines).reduce(
    (n, m) => n + m.inputs.flat().length + m.output.length + (m.processing ? 1 : 0),
    0
  ) + s.orders.reduce((n, o) => n + o.delivered, 0);
const store = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
};
function foldable() {
  let s = initial(3);
  s = command(s, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  s = command(s, { type: 'run' });
  assert.equal(s.state.orders[0].delivered, 3);
  return s;
}

test('all authored levels and alternative strategies win within their budgets', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const { session } = winningReplay(i);
    assert.equal(session.state.status, 'won');
    assert.ok(session.state.actions >= 0);
    assert.ok(validState(session.state));
  }
  for (const [i, v] of [
    [2, 'reverse'],
    [4, 'rebuild'],
    [4, 'early-fold'],
    [8, 'reverse'],
    [9, 'reverse'],
  ] as const)
    assert.equal(winningReplay(i, v).session.state.status, 'won');
  assert.equal(LEVELS[4].actions - winningReplay(4, 'early-fold').session.state.actions, 6);
});
test('loading bay cannot directly connect any valid punch orientation', () => {
  const s = createRun(1);
  let direct = 0;
  for (let r = 0; r < 4; r++)
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 8; x++) {
        const m = makeMachine(s, x, y, r, 'punch');
        if (!checkPlacement(s, m) && connectionPreview(s, m).connected) direct++;
      }
  assert.equal(direct, 0);
});
test('every rotation preserves footprints, port count and four-turn identity', () => {
  for (const kind of TOOLS)
    for (let r = 0; r < 4; r++) {
      const g = geometry({ kind, x: 0, y: 0, rotation: r });
      assert.equal(
        new Set(g.cells.map((p) => `${p.x},${p.y}`)).size,
        DEFINITIONS[kind].cells.length
      );
      assert.equal(g.inputs[0].direction, (DEFINITIONS[kind].inputs[0].direction + r) % 4);
    }
});
test('visual operations compose in either order, preserve old changes, and never rotate the product', () => {
  for (const r of ['blank', 'punched', 'clipped', 'combined'] as Resource[]) {
    assert.equal(transform('punch', transform('cutter', r)), 'combined');
    assert.equal(transform('cutter', transform('punch', r)), 'combined');
    assert.equal(transform('punch', transform('punch', r)), transform('punch', r));
    assert.equal(transform('straight', r), r);
  }
});
test('invalid placement, overlapping placement and invalid tools are atomic', () => {
  let s = initial();
  assert.equal(
    applyCommand(s, { type: 'place', kind: 'punch', x: -1, y: 2, rotation: 0 }).session,
    s
  );
  s = command(s, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  assert.equal(
    applyCommand(s, { type: 'place', kind: 'cutter', x: 0, y: 2, rotation: 0 }).session,
    s
  );
  assert.ok(
    applyCommand(s, {
      type: 'place',
      kind: 'module',
      x: 4,
      y: 4,
      rotation: 0,
    } as unknown as Command).error
  );
});
test('paid actions spend one and advance four ticks; undo restores complete state', () => {
  const s = initial();
  const placed = command(s, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  assert.equal(placed.state.tick, 4);
  assert.equal(placed.state.actions, s.state.actions - 1);
  const undo = command(placed, { type: 'undo' });
  assert.deepEqual(undo.state, s.state);
  assert.equal(undo.undo, null);
});
test('final paid action can win, and loss can be undone', () => {
  let s = initial();
  s.state.actions = 2;
  s = command(s, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  s = command(s, { type: 'run' });
  assert.equal(s.state.status, 'won');
  assert.equal(s.state.actions, 0);
  let lost = initial();
  lost.state.actions = 1;
  lost = command(lost, { type: 'run' });
  assert.equal(lost.state.status, 'lost');
  assert.equal(command(lost, { type: 'undo' }).state.status, 'playing');
});
test('exact matching: combined tiles cannot satisfy punched-only orders', () => {
  const s = createRun(3);
  const m = makeMachine(s, 0, 2, 0, 'punch');
  m.output = ['combined'];
  s.machines = [m];
  s.nextId = 2;
  s.sources = [];
  advanceTick(s, []);
  assert.equal(s.orders[0].delivered, 0);
  assert.equal(s.orders[1].delivered, 1);
});
test('completed quotas retain surplus and bounded backpressure stops the line', () => {
  const s = foldable().state;
  for (let i = 0; i < 100; i++) advanceTick(s, []);
  const before = structuredClone(s.machines);
  for (let i = 0; i < 20; i++) advanceTick(s, []);
  assert.deepEqual(s.machines, before);
  assert.equal(s.orders[0].delivered, 3);
  assert.match(machineStatus(s, s.machines[0]), /no remaining order/);
  for (const m of leaves(s.machines)) {
    assert.ok(m.inputs.every((a) => a.length <= 2));
    assert.ok(m.output.length <= 2);
  }
});
test('every spawned tile is accounted for in buffers, processing or shipments', () => {
  const s = createRun(2);
  s.machines = [makeMachine(s, 0, 1, 0, 'punch')];
  s.nextId = 2;
  s.machines.push(makeMachine(s, 2, 3, 0, 'cutter'));
  s.nextId = 3;
  let spawned = 0;
  for (let i = 0; i < 80; i++) {
    const events: SimEvent[] = [];
    advanceTick(s, events);
    spawned += events.filter((e) => e.type === 'flow' && e.id! < 0).length;
    assert.equal(count(s), spawned);
  }
});
test('routing is independent of machine-array order', () => {
  let s = initial(2);
  s = command(s, { type: 'place', kind: 'punch', x: 0, y: 1, rotation: 0 });
  s = command(s, { type: 'place', kind: 'cutter', x: 2, y: 3, rotation: 0 });
  const a = structuredClone(s.state),
    b = structuredClone(s.state);
  b.machines.reverse();
  for (let i = 0; i < 20; i++) {
    advanceTick(a, []);
    advanceTick(b, []);
  }
  assert.deepEqual(dynamic(a), dynamic(b));
  assert.deepEqual(a.orders, b.orders);
});
test('connecting downstream warns and diverts output away from an unfinished exact order', () => {
  let s = initial(0);
  s.state.orders[0].quantity = 100;
  s = command(s, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  const c = makeMachine(s.state, 2, 4, 0, 'cutter');
  assert.match(
    diversionWarnings(s.state, c).join(''),
    /Punched tiles will feed Cutter instead of shipping/
  );
  const before = s.state.orders[0].delivered;
  s = command(s, { type: 'place', kind: 'cutter', x: 2, y: 4, rotation: 0 });
  for (let i = 0; i < 10; i++) advanceTick(s.state, []);
  assert.equal(s.state.orders[0].delivered, before);
});
test('preview predicts the actual changed tile rather than assuming a blank', () => {
  let s = initial(2);
  s = command(s, { type: 'place', kind: 'cutter', x: 0, y: 1, rotation: 0 });
  const p = makeMachine(s.state, 3, 1, 0, 'punch');
  assert.equal(nextProduct(previewState(s.state, p), p), 'combined');
});
test('fold previews are pure, invalid destinations consume nothing, and undo restores graph', () => {
  const s = foldable(),
    before = structuredClone(s),
    f = previewFold(s.state, 1);
  assert.equal(f.error, undefined);
  f.graph.machines[0].inputs[0].push('blank');
  assert.deepEqual(s, before);
  assert.ok(applyCommand(s, { type: 'fold', id: 1, x: 7, y: 0, rotation: 0 }).error);
  const folded = command(s, { type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
  assert.equal(folded.state.actions, s.state.actions);
  assert.equal(folded.state.tick, s.state.tick);
  assert.deepEqual(dynamic(folded.state), dynamic(s.state));
  assert.deepEqual(command(folded, { type: 'undo' }).state, s.state);
  assert.ok(previewFold(folded.state, 2).error);
});
test('folded and unfolded graphs preserve partial processing, timing and blocked outputs', () => {
  for (const blocked of [false, true]) {
    const s = foldable();
    if (!blocked) s.state.orders[0].quantity = 100;
    const folded = command(s, { type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
    for (let i = 0; i < 40; i++) {
      advanceTick(s.state, []);
      advanceTick(folded.state, []);
      assert.deepEqual(dynamic(s.state), dynamic(folded.state));
      assert.deepEqual(s.state.orders, folded.state.orders);
    }
  }
});
test('nested modules preserve internal edges and live simulation', () => {
  let s = foldable();
  s.state.orders[1].quantity = 100;
  s = command(s, { type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
  s = command(s, { type: 'place', kind: 'cutter', x: 1, y: 2, rotation: 0 });
  while (previewFold(s.state, 3).error) s = command(s, { type: 'run' });
  const folded = command(s, { type: 'fold', id: 3, x: 0, y: 2, rotation: 0 });
  assert.equal(folded.state.machines.length, 1);
  assert.ok(folded.state.machines[0].folded!.machines.some((m) => m.folded));
  assert.deepEqual(graphEdges(s.state.machines), graphEdges(folded.state.machines));
  for (let i = 0; i < 40; i++) {
    advanceTick(s.state, []);
    advanceTick(folded.state, []);
    assert.deepEqual(dynamic(s.state), dynamic(folded.state));
  }
});
test('move retains contents; recycling explicitly removes them', () => {
  const s = foldable();
  const before = dynamic(s.state)[0];
  const moved = command(s, { type: 'move', id: 1, x: 1, y: 2, rotation: 0 });
  assert.equal(moved.state.machines[0].id, before.id);
  assert.ok(count(moved.state) >= count(s.state));
  const recycled = command(s, { type: 'recycle', id: 1 });
  assert.equal(recycled.state.machines.length, 0);
  assert.equal(recycled.state.actions, s.state.actions - 1);
});
test('every replay command, undo and completion round-trip exact save state', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    let s = initial(i);
    const storage = store();
    for (const c of winningReplay(i).commands) {
      s = command(s, c);
      assert.ok(saveSession(storage, s));
      assert.deepEqual(loadSession(storage).session, s);
      if (s.undo) {
        const undo = command(s, { type: 'undo' });
        assert.ok(saveSession(storage, undo));
        assert.deepEqual(loadSession(storage).session, undo);
      }
    }
  }
});
test('malformed and incompatible saves are rejected; unavailable storage is playable', () => {
  const storage = store();
  for (const value of ['{', JSON.stringify({ state: { version: 1 }, undo: null })]) {
    storage.setItem(SAVE_KEY, value);
    assert.equal(loadSession(storage).invalid, true);
  }
  const s = initial();
  s.state.orders[0].quantity = 999;
  assert.equal(validState(s.state), false);
  const broken = () => {
    throw new Error('blocked');
  };
  assert.equal(loadSession({ getItem: broken, setItem: broken }).available, false);
  assert.equal(saveSession({ getItem: broken, setItem: broken }, initial()), false);
});
test('invalid folded endpoints and overfilled buffers cannot resume', () => {
  const s = command(foldable(), { type: 'fold', id: 1, x: 0, y: 2, rotation: 0 });
  s.state.machines[0].folded!.inputs[0].endpoint.id = 999;
  assert.equal(validState(s.state), false);
  const other = foldable();
  other.state.machines[0].output = ['blank', 'blank', 'blank'];
  assert.equal(validState(other.state), false);
});
test('compatible audio preferences survive the new save namespace', () => {
  const storage = store();
  storage.setItem('gridforge.folded.settings.v1', JSON.stringify({ volume: 0.25, muted: true }));
  assert.equal(loadSettings(storage).volume, 0.25);
  assert.equal(loadSettings(storage).muted, true);
});

test('corner entry requires a turn before any cutter can connect', () => {
  const s = createRun(5);
  for (const kind of ['punch', 'cutter'] as const)
    for (let r = 0; r < 4; r++)
      for (let y = 0; y < 9; y++)
        for (let x = 0; x < 8; x++) {
          const m = makeMachine(s, x, y, r, kind);
          assert.ok(checkPlacement(s, m) || !connectionPreview(s, m).connected);
        }
  const first = winningReplay(5).commands[0];
  assert.equal(first.type === 'place' && first.kind, 'elbow');
});

test('processed supplies are named and predicted accurately before production', () => {
  const s = createRun(6);
  const punch = makeMachine(s, 0, 2, 0, 'punch');
  const preview = previewState(s, punch);
  assert.equal(incomingProduct(preview, punch), 'clipped');
  assert.equal(inputDetails(preview, punch)[0].from, 'Clipped supply');
  assert.equal(nextProduct(preview, punch), 'combined');
  const right = createRun(8);
  const cutter = makeMachine(right, 5, 5, 2, 'cutter');
  assert.equal(incomingProduct(previewState(right, cutter), cutter), 'punched');
  assert.equal(nextProduct(previewState(right, cutter), cutter), 'combined');
});

test('authored initial machines are legal, empty, editable and exactly saved', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    const s = initial(level);
    assert.ok(validState(s.state));
    assert.equal(s.state.tick, 0);
    for (const m of s.state.machines) {
      assert.equal(checkPlacement(s.state, m, [m.id]), null);
      assert.equal(m.emitted, 0);
      assert.equal(m.processing, null);
      assert.deepEqual(m.output, []);
      assert.deepEqual(m.inputs, [[]]);
      assert.ok(m.id < s.state.nextId);
    }
    const storage = store();
    assert.ok(saveSession(storage, s));
    assert.deepEqual(loadSession(storage).session, s);
  }
  const s = initial(7);
  const moved = command(s, winningReplay(7).commands[0]);
  assert.deepEqual(command(moved, { type: 'undo' }), s);
});
