import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOCKS_MAX, DOCKS_START } from '../src/rockhopper/config';
import {
  buildDrill,
  dockPos,
  drillSpotWhy,
  dockSite,
  drills,
  freeDockSites,
  freshState,
  sitePos,
  upgradeHub,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';

function rich(): State {
  const s = freshState(3);
  s.credits = 1e12;
  return s;
}

test('a new dock goes on the site the player picks', () => {
  const s = rich();
  assert.deepEqual(freeDockSites(s), [3, 4, 5, 6, 7, 8]);
  assert.equal(upgradeHub(s, 'docks', 6), true);
  assert.equal(s.docks, DOCKS_START + 1);
  assert.deepEqual(s.dockSites, [0, 1, 2, 6]);
  assert.deepEqual(dockPos(s, 3), sitePos(6));
  assert.deepEqual(freeDockSites(s), [3, 4, 5, 7, 8]);
});

test('a taken or invalid site is refused and costs nothing', () => {
  const s = rich();
  const credits = s.credits;
  for (const bad of [0, 2, -1, 9, 1.5, NaN]) {
    assert.equal(upgradeHub(s, 'docks', bad), 'invalid', String(bad));
    assert.equal(s.credits, credits);
    assert.equal(s.docks, DOCKS_START);
  }
  assert.equal(s.dockSites, undefined);
});

test('without a pick, docks follow the classic order and record nothing', () => {
  const s = rich();
  while (s.docks < DOCKS_MAX) assert.equal(upgradeHub(s, 'docks'), true);
  assert.equal(s.dockSites, undefined);
  assert.equal(upgradeHub(s, 'docks'), 'max');
  for (let i = 0; i < s.docks; i++) assert.deepEqual(dockPos(s, i), sitePos(i));
});

test('after a pick, later default buys fill the first free site', () => {
  const s = rich();
  upgradeHub(s, 'docks', 8);
  upgradeHub(s, 'docks');
  assert.deepEqual(s.dockSites, [0, 1, 2, 8, 3]);
  while (s.docks < DOCKS_MAX) upgradeHub(s, 'docks');
  assert.deepEqual([...s.dockSites!].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(freeDockSites(s), []);
});

test('a waiting drill links to the new dock where it was built', () => {
  const s = rich();
  // Fill the three starting docks, then one more drill waits.
  for (let a = 0; a < 2 * Math.PI && drills(s).every((d) => d.out); a += 0.05)
    if (!drillSpotWhy(s, 0, a)) assert.equal(buildDrill(s, 0, a), true);
  const waiting = drills(s).find((d) => !d.out);
  assert.ok(waiting);
  upgradeHub(s, 'docks', 5);
  assert.deepEqual(waiting.out?.to, { kind: 'dock', index: 3 });
  assert.equal(dockSite(s, 3), 5);
});

test('dock sites survive a save, and a malformed list falls back to the classic order', () => {
  const s = rich();
  upgradeHub(s, 'docks', 7);
  upgradeHub(s, 'docks', 4);
  const back = deserialize(serialize(s))!;
  assert.deepEqual(back.dockSites, [0, 1, 2, 7, 4]);
  assert.deepEqual(dockPos(back, 4), sitePos(4));
  for (const bad of [[0, 1, 2, 7], [0, 1, 2, 7, 7], [0, 1, 2, 7, 9], [0, 1, 2, 7, 'x'], 'nope']) {
    const raw = JSON.parse(serialize(s));
    raw.dockSites = bad;
    const t = deserialize(JSON.stringify(raw))!;
    assert.ok(t, JSON.stringify(bad));
    assert.equal(t.dockSites, undefined, JSON.stringify(bad));
    assert.equal(t.docks, 5);
  }
  // An old save has no list: its docks stand where they always did.
  const old = JSON.parse(serialize(rich()));
  delete old.dockSites;
  assert.equal(deserialize(JSON.stringify(old))!.dockSites, undefined);
});
