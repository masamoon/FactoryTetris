/**
 * Ore picks witness (docs/ROCKHOPPER_ORE_PICKS.md): a scripted layout, not a player. Two drills on
 * the first copper rock into a smelter, two on the T3 crystal rock into a smelter, both into one
 * crystal factory. It compares drills at fixed rim spots against drills at the spot with the most
 * of their ore in its first 12 cells, each with and without picks, at a given reach cap.
 *
 *   npx tsx tools/rockhopper-ore-picks.ts [--minutes 60] [--reach 1] [--slow]
 */
import { COPPER, CRYSTAL, PICK_REACH, SLOTS, TICK_HZ, type Ore } from '../src/rockhopper/config';
import * as S from '../src/rockhopper/sim';

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const MIN = arg('--minutes', 60);
const SLOW = process.argv.includes('--slow');
S.setPickReach(arg('--reach', PICK_REACH));

function ok(r: S.Result, what: string) {
  if (r !== true) throw new Error(`${what}: ${r}`);
}
const last = (s: S.State) => s.machines[s.machines.length - 1];

function setup(seed: number) {
  const s = S.freshState(seed, false, SLOW);
  S.setFactories(s, true);
  S.setOrePicks(s, true);
  s.credits = 1e12;
  for (let k = 0; k < 3; k++)
    for (let i = 0; i < SLOTS.length; i++) if (!s.slots[i].unlocked) S.unlock(s, i);
  for (let i = 0; i < 6; i++) S.upgradeHub(s, 'docks');
  for (let t = 0; t < 40 * TICK_HZ; t++) {
    S.step(s);
    s.events.length = 0;
  }
  return s;
}

/** `n` drills on `slot` at the rim spots with the most `ore` among the first 12 cells, linked to `to`. */
function bestDrills(s: S.State, slot: number, ore: Ore, n: number, to: S.Target) {
  const rock = s.slots[slot].rock!;
  const spots: { a: number; score: number }[] = [];
  for (let deg = 0; deg < 360; deg += 3) {
    const a = (deg * Math.PI) / 180;
    const cells = S.firstCells(slot, rock, S.rimPos(slot, a), 12);
    spots.push({ a, score: cells.filter((k) => rock.cells[k] === ore).length });
  }
  spots.sort((x, y) => y.score - x.score);
  const out: S.Drill[] = [];
  for (const c of spots) {
    if (out.length >= n) break;
    if (S.buildDrill(s, slot, c.a) !== true) continue;
    const d = last(s) as S.Drill;
    if (S.route(s, d.id, to) === true) out.push(d);
    else S.sell(s, d.id);
  }
  return out;
}

function fixedDrills(s: S.State, ps: { x: number; y: number }[], to: S.Target) {
  return ps.map((p) => {
    const r = S.nearestRim(s, p, 80)!;
    ok(S.buildDrill(s, r.slot, r.angle), 'drill');
    const d = last(s) as S.Drill;
    ok(S.route(s, d.id, to), 'route drill');
    return d;
  });
}

function measure(s: S.State) {
  const start = s.earned;
  let cuCr = 0;
  const marks: number[] = [];
  for (let t = 0; t < MIN * 60 * TICK_HZ; t++) {
    S.step(s);
    for (const e of s.events)
      if (e.type === 'deliver' && e.alloy === CRYSTAL && e.ore === COPPER) cuCr++;
    s.events.length = 0;
    if ((t + 1) % (20 * 60 * TICK_HZ) === 0)
      marks.push(Math.round((s.earned - start) / ((t + 1) / TICK_HZ)));
  }
  return `${marks.join(' / ')} /s, Cu+Cr ${cuCr}`;
}

console.log(
  `${SLOW ? 'slow-burn' : 'classic'} rocks, reach ${S.PICK_REACH_NOW()} radii, ${MIN} min; income averaged from the start at each 20 min`
);
for (const seed of [1, 2, 3]) {
  const rows: string[] = [];
  for (const v of ['plain fixed', 'pick fixed', 'plain best', 'pick best']) {
    const s = setup(seed);
    const c = SLOTS[0],
      x = SLOTS[6];
    const place = (kind: 'smelter' | 'factory', p: { x: number; y: number }) => {
      ok(kind === 'smelter' ? S.buildSmelter(s, p) : S.buildFactory(s, p), kind);
      return last(s);
    };
    const f = place('factory', { x: x.x - 150, y: x.y + 200 });
    const crS = place('smelter', { x: x.x - 150, y: x.y + 130 });
    const cuS = place('smelter', { x: c.x + 95, y: c.y - 110 });
    ok(S.route(s, cuS.id, { kind: 'factory', id: f.id }), 'copper to factory');
    ok(S.route(s, crS.id, { kind: 'factory', id: f.id }), 'crystal to factory');
    const toCu: S.Target = { kind: 'smelter', id: cuS.id },
      toCr: S.Target = { kind: 'smelter', id: crS.id };
    const fixed = v.endsWith('fixed');
    const cu = fixed
      ? fixedDrills(
          s,
          [
            { x: c.x + 80, y: c.y },
            { x: c.x + 55, y: c.y - 55 },
          ],
          toCu
        )
      : bestDrills(s, 0, COPPER, 2, toCu);
    const cr = fixed
      ? fixedDrills(
          s,
          [
            { x: x.x - 120, y: x.y },
            { x: x.x - 85, y: x.y + 85 },
          ],
          toCr
        )
      : bestDrills(s, 6, CRYSTAL, 2, toCr);
    if (v.startsWith('pick')) {
      for (const d of cu) S.setPick(s, d.id, COPPER);
      for (const d of cr) S.setPick(s, d.id, CRYSTAL);
    }
    rows.push(`${v.padEnd(11)} ${measure(s)}`);
  }
  console.log(`seed ${seed}\n  ${rows.join('\n  ')}`);
}
