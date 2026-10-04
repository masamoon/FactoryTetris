import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  beltsNear,
  bend,
  buildDrill,
  buildSmelter,
  sitePos,
  drills,
  freshState,
  joinLinkWhy,
  machinePos,
  pathLength,
  pointAlong,
  beltPath,
  route,
  setJoins,
  swapPartner,
  type State,
} from '../src/rockhopper/sim';
import { deserialize, serialize } from '../src/rockhopper/save';
import { SLOTS } from '../src/rockhopper/config';

const T1Y = SLOTS[0].y;

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

type Hook = {
  state: State;
  renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number }; cam: { z: number } };
  save(): void;
};

const hook = (page: Page) =>
  page.evaluate(() => (window as unknown as { __rockhopper: Hook }).__rockhopper.state);
const screen = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([x, y]) =>
      (window as unknown as { __rockhopper: Hook }).__rockhopper.renderer.toScreen({ x, y }),
    [x, y]
  );

async function open(page: Page, query = '?fresh') {
  await page.goto(`/${query}`);
  await expect(page.locator('.rh-canvas')).toBeVisible();
  await expect(page.locator('webpack-dev-server-client-overlay')).toHaveCount(0);
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  await page.waitForTimeout(400);
}

// These tests aim at the classic field's coordinates: new games start there unless a test asks.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('rockhopper.settings.v1'))
      localStorage.setItem(
        'rockhopper.settings.v1',
        JSON.stringify({ sectors: false, slowRocks: false })
      );
  });
});

test('a new game on the sectors setting starts a seeded sector and names it in the menu', async ({
  page,
}) => {
  await open(page, '?fresh&sector=1&seed=4242');
  const s = await hook(page);
  expect(s.sector).toBe(true);
  expect(s.seed).toBe(4242);
  await page.locator('.rh-menu-btn').click();
  await expect(page.getByText('Sector 4242 · restart to change')).toBeVisible();
  await expect(page.getByText('Next game: sector')).toBeVisible();
});

test('a new game on the slow-burn setting has deep rocks and says so in the menu', async ({
  page,
}) => {
  await open(page, '?fresh&slow=1');
  const s = await hook(page);
  expect(s.slowRocks).toBe(true);
  // The starter rock plays as before; the menu names the mode and the switch.
  expect(s.slots[0].rock!.layers).toBeUndefined();
  await page.locator('.rh-menu-btn').click();
  await expect(page.getByText('Rocks: slow-burn')).toBeVisible();
  await expect(page.getByText(/slow-burn rocks/)).toBeVisible();
});

test('the Factories switch shows a locked tray item and survives a new game', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.credits = 100;
  });
  const wrap = page.locator('.rh-tool-wrap').filter({ has: page.locator('[data-kind=factory]') });
  await expect(wrap).toBeHidden();
  await page.locator('.rh-menu-btn').click();
  await page.getByText('Factories: off').click();
  await expect(page.getByText('Factories: on')).toBeVisible();
  await page.getByText('Resume').click();
  // On, the item is in the tray at once, saying what opens it.
  await expect(wrap).toBeVisible();
  await expect(wrap.locator('.rh-price')).toHaveText('2 smelters');
  // A new game keeps the switch.
  await open(page);
  expect((await hook(page)).factories).toBe(true);
  await page.evaluate(() => {
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.credits = 100;
  });
  await expect(wrap).toBeVisible();
});

test('opening frame is the rock, the hub and one counter', async ({ page }) => {
  await open(page);
  await expect(page.locator('.rh-credits')).toHaveText('0');
  await expect(page.locator('.rh-tray')).toHaveClass(/rh-hidden/);
  await expect(page.locator('button:visible')).toHaveCount(1); // the menu
  const rock = await screen(page, 0, T1Y);
  expect(rock.x).toBeGreaterThan(150);
  expect(rock.x).toBeLessThan(240);
  const z = await page.evaluate(
    () => (window as unknown as { __rockhopper: Hook }).__rockhopper.renderer.cam.z
  );
  expect(z * 10).toBeGreaterThanOrEqual(5.5); // cells at least 5.5 px
  await page.screenshot({ path: 'test-results/rockhopper-open.png' });
});

test('hold to mine, drag a drill on, and it delivers by itself', async ({ page }) => {
  await open(page);
  const rock = await screen(page, 0, T1Y);
  await page.mouse.move(rock.x + 10, rock.y + 20);
  await page.mouse.down();
  await page.waitForTimeout(600);
  expect((await hook(page)).stats.laserBroken).toBeGreaterThan(0);
  await page.waitForTimeout(5000);
  await page.mouse.up();
  const mined = await hook(page);
  expect(mined.credits).toBeGreaterThanOrEqual(14);
  await expect(page.locator('.rh-tray')).not.toHaveClass(/rh-hidden/);
  const btn = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  const sock = await screen(page, 0, T1Y + 78);
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.mouse.move(sock.x, sock.y + 30, { steps: 10 });
  await page.mouse.up();
  const built = await hook(page);
  expect(built.machines).toHaveLength(1);
  expect(built.machines[0].out?.to).toEqual({ kind: 'dock', index: 0 });
  const earned = built.earned;
  await page.waitForTimeout(4000);
  const later = await hook(page);
  expect(later.stats.drillBroken).toBeGreaterThan(3);
  expect(later.earned).toBeGreaterThan(earned);
  await page.screenshot({ path: 'test-results/rockhopper-first-drill.png' });
});

test('a drill goes where it is dropped on the rim, and a crowded drop slides clear', async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.credits = 5000;
  });
  await expect(page.locator('.rh-tray')).not.toHaveClass(/rh-hidden/);
  await page.waitForTimeout(600); // the tray slides in
  const btn = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  const R = SLOTS[0].r * 10 + 18;
  const drop = async (a: number, shot?: string) => {
    const p = await screen(page, SLOTS[0].x + Math.cos(a) * R, T1Y + Math.sin(a) * R);
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.mouse.down();
    // The ghost sits 30 px above the finger.
    await page.mouse.move(p.x, p.y + 30, { steps: 10 });
    if (shot) await page.screenshot({ path: shot });
    await page.mouse.up();
  };
  const a = -Math.PI / 6;
  await drop(a, 'test-results/rockhopper-free-drill-ghost.png');
  let s = await hook(page);
  expect(s.machines).toHaveLength(1);
  const d = s.machines[0] as { angle: number };
  const norm = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  expect(Math.abs(norm(d.angle) - norm(a))).toBeLessThan(0.08);
  // Right next to it: the second drill slides along the rim until the two are clear.
  await drop(a + 0.15);
  s = await hook(page);
  expect(s.machines).toHaveLength(2);
  const [p, q] = s.machines.map((m) => {
    const x = (m as { angle: number }).angle;
    return { x: Math.cos(x) * R, y: Math.sin(x) * R };
  });
  expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(35.9);
  await page.screenshot({ path: 'test-results/rockhopper-free-drill-two.png' });
});

test('tap a machine for its bubble; hold-to-sell refunds half', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    a.state.credits = 500;
  });
  await expect(page.locator('.rh-tray')).not.toHaveClass(/rh-hidden/);
  await page.waitForTimeout(500); // tray slide-in
  const btn = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  // Tap-to-arm, then tap the world.
  await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await expect(page.locator('.rh-tool[data-kind=drill]')).toHaveClass(/rh-armed/);
  const sock = await screen(page, 0, T1Y + 78);
  await page.touchscreen.tap(sock.x, sock.y + 30);
  expect((await hook(page)).machines).toHaveLength(1);
  await expect(page.locator('.rh-tool[data-kind=drill]')).not.toHaveClass(/rh-armed/);
  const drill = await screen(page, 0, T1Y + 78);
  await page.touchscreen.tap(drill.x, drill.y);
  const bubble = page.locator('.rh-bubble');
  await expect(bubble).toBeVisible();
  await expect(bubble.getByRole('button', { name: /Upgrade to level 2/ })).toBeVisible();
  await expect(bubble.getByRole('button', { name: 'Move' })).toBeVisible();
  const before = (await hook(page)).credits;
  const sell = bubble.getByRole('button', { name: /Hold to sell/ });
  await sell.tap(); // a tap is not enough
  expect((await hook(page)).machines).toHaveLength(1);
  const box = (await sell.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  const after = await hook(page);
  expect(after.machines).toHaveLength(0);
  expect(after.credits).toBeGreaterThanOrEqual(before + 7);
});

test('locked slot needs two taps and reveals the next rock', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.credits = 1000;
  });
  await page.waitForTimeout(100);
  const tag = await page.evaluate(
    () =>
      (
        window as unknown as {
          __rockhopper: {
            renderer: { tags: { slot: number; x: number; y: number; w: number; h: number }[] };
          };
        }
      ).__rockhopper.renderer.tags[0]
  );
  await page.touchscreen.tap(tag.x + tag.w / 2, tag.y + 20);
  const unlockBtn = page.getByRole('button', { name: /Unlock this/ });
  await expect(unlockBtn).toBeVisible();
  expect((await hook(page)).slots[tag.slot].unlocked).toBe(false);
  await unlockBtn.tap();
  expect((await hook(page)).slots[tag.slot].unlocked).toBe(true);
  await page.waitForTimeout(1800);
  expect((await hook(page)).slots[tag.slot].rock).not.toBeNull();
});

test('progress survives a reload', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    a.state.credits = 321;
    a.save();
  });
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  expect((await hook(page)).credits).toBeGreaterThanOrEqual(321);
});

test('small phone layout keeps the world between the HUD and the tray', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  await page.evaluate(() => {
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.credits = 50;
  });
  await page.waitForTimeout(300);
  const counter = (await page.locator('.rh-counter').boundingBox())!;
  const tray = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  const rock = await screen(page, 0, T1Y);
  const hub = await screen(page, 0, 0);
  expect(rock.y).toBeGreaterThan(counter.y + counter.height);
  expect(hub.y).toBeLessThan(tray.y);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/rockhopper-360.png' });
});

type App = Hook & {
  overlay: { placing: { at: { splice?: number; ok?: boolean } | null } | null };
};
const app = (page: Page) =>
  page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: App }).__rockhopper;
    return { state: a.state, placing: a.overlay.placing };
  });

/** Three drills on the first rock (docks full) and plenty of credits, built through the hook. */
async function threeDrills(page: Page) {
  await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    a.state.credits = 1e6;
    for (let k = 0; k < 3; k++) a.cmd('buildDrill', 0, ((90 + 120 * k) * Math.PI) / 180);
  });
  await page.waitForTimeout(600);
}

test('the machine bubble fits a small phone and offers Widen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page);
  await threeDrills(page);
  const drill = await screen(page, 0, T1Y + 78);
  await page.touchscreen.tap(drill.x, drill.y);
  const bubble = page.locator('.rh-bubble');
  await expect(bubble).toBeVisible();
  const widen = bubble.getByRole('button', { name: /Widen belt/ });
  await expect(widen).toBeVisible();
  const box = (await bubble.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  const tier = (await hook(page)).machines[0].tier;
  await widen.tap();
  expect((await hook(page)).machines[0].tier).toBe(tier + 1);
  await page.screenshot({ path: 'test-results/rockhopper-bubble-360.png' });
});

test('a smelter dragged onto a belt snaps to it, floats as a hologram, and splices in', async ({
  page,
}) => {
  await open(page);
  await threeDrills(page);
  const s = await hook(page);
  const d = s.machines.find((m) => m.kind === 'drill' && Math.abs(m.angle - Math.PI / 2) < 1e-6)!;
  // Aim at the drill's belt, part way to the hub (the ghost sits 56 px above the finger).
  const sock = await screen(page, 0, T1Y + 78);
  const hub = await screen(page, 0, -49);
  const aim = { x: sock.x + (hub.x - sock.x) * 0.4, y: sock.y + (hub.y - sock.y) * 0.4 };
  const btn = (await page.locator('.rh-tool[data-kind=smelter]').boundingBox())!;
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.mouse.move(aim.x + 3, aim.y + 56, { steps: 12 });
  await page.waitForTimeout(200);
  const hovering = await app(page);
  expect(hovering.placing?.at?.splice).toBe(d.id);
  expect(hovering.placing?.at?.ok).toBe(true);
  expect(hovering.state.machines.filter((m) => m.kind === 'smelter')).toHaveLength(0);
  await page.screenshot({ path: 'test-results/rockhopper-smelter-hologram.png' });
  await page.mouse.up();
  const after = await hook(page);
  const sm = after.machines.find((m) => m.kind === 'smelter')!;
  expect(sm).toBeTruthy();
  expect(after.machines.find((m) => m.id === d.id)!.out?.to).toEqual({
    kind: 'smelter',
    id: sm.id,
  });
  expect(sm.out?.to.kind).toBe('dock');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/rockhopper-smelter-landed.png' });
});

test('dragging from an unlinked drill onto a drill chains it through that junction', async ({
  page,
}) => {
  await open(page);
  await threeDrills(page);
  await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    a.cmd('unlock', 1);
  });
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    a.cmd('buildDrill', 1, Math.PI / 2);
  });
  const s = await hook(page);
  const lonely = s.machines.find((m) => m.kind === 'drill' && m.slot === 1)!;
  expect(lonely.out).toBeNull();
  await page.waitForTimeout(1500); // the camera settles after the unlock reveal
  const from = await screen(page, -170, T1Y + 78);
  const to = await screen(page, 0, T1Y + 78);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  const after = await hook(page);
  const target = after.machines.find(
    (m) => m.kind === 'drill' && m.slot === 0 && Math.abs(m.angle - Math.PI / 2) < 1e-6
  )!;
  expect(after.machines.find((m) => m.id === lonely.id)!.out?.to).toEqual({
    kind: 'drill',
    id: target.id,
  });
});

test('a pre-logistics save is migrated, and the v1 save is never touched', async ({ page }) => {
  // A tiny v1 save: one drill on a dock, as the previous build wrote it.
  await page.goto('/?fresh');
  const text = await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    a.state.credits = 100;
    a.cmd('buildDrill', 0, Math.PI / 2);
    const raw = JSON.parse(JSON.stringify({ ...a.state, events: undefined, laser: null }));
    raw.version = 1;
    for (const m of raw.machines) {
      delete m.tier;
      delete m.tierBought;
      m.level = 3;
    }
    raw.slots = raw.slots.map((s: { rock: unknown }) => ({ ...s, rock: null, arriveAt: 0 }));
    raw.credits = 777;
    return JSON.stringify(raw);
  });
  // Seed storage in the next document, after this page's own save on unload.
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('rockhopper.save.v1', t);
  }, text);
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  const s = await hook(page);
  expect(s.version).toBe(3);
  expect(s.credits).toBeGreaterThanOrEqual(777);
  expect(s.machines[0].tier).toBe(2);
  await page.evaluate(() => (window as unknown as { __rockhopper: Hook }).__rockhopper.save());
  const keys = await page.evaluate(() => ({
    v1: localStorage.getItem('rockhopper.save.v1'),
    v2: localStorage.getItem('rockhopper.save.v2'),
    v3: !!localStorage.getItem('rockhopper.save.v3'),
  }));
  expect(keys.v1).toBe(text);
  expect(keys.v2).toBeNull();
  expect(keys.v3).toBe(true);
  // Restore: the v3 save is dropped and the untouched v1 save is migrated again.
  await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    a.state.credits = 5;
    a.save();
  });
  await page.goto('/?restore=pre-logistics');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  expect((await hook(page)).credits).toBeGreaterThanOrEqual(777);
});

test('a pre-factories (v2) save is migrated, never touched, and can be restored', async ({
  page,
}) => {
  await page.goto('/?fresh');
  const text = await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    a.state.credits = 100;
    a.cmd('buildDrill', 0, Math.PI / 2);
    a.save();
    const raw = JSON.parse(localStorage.getItem('rockhopper.save.v3')!);
    raw.version = 2;
    delete raw.factories;
    raw.credits = 888;
    return JSON.stringify(raw);
  });
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('rockhopper.save.v2', t);
  }, text);
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  const s = await hook(page);
  expect(s.version).toBe(3);
  expect(s.credits).toBeGreaterThanOrEqual(888);
  await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    a.state.credits = 5;
    a.save();
  });
  expect(await page.evaluate(() => localStorage.getItem('rockhopper.save.v2'))).toBe(text);
  await page.goto('/?restore=pre-factories');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  expect((await hook(page)).credits).toBeGreaterThanOrEqual(888);
});

test('a smelter is never dropped onto a belt it cannot join (already smelted)', async ({
  page,
}) => {
  await open(page);
  await threeDrills(page);
  // Splice one smelter into the middle drill's line, then aim a second at the bar belt it feeds.
  const placed = await page.evaluate(() => {
    const a = (
      window as unknown as {
        __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown };
      }
    ).__rockhopper;
    const d = a.state.machines.find(
      (m) => m.kind === 'drill' && Math.abs(m.angle - Math.PI / 2) < 1e-6
    )!;
    for (let y = -170; y < -60; y += 2)
      if (a.cmd('buildSmelter', { x: 0, y }, d.id) === true) return { x: 0, y };
    return null;
  });
  expect(placed).not.toBeNull();
  const s = await hook(page);
  const sm = s.machines.find((m) => m.kind === 'smelter')!;
  const dock = s.machines.find((m) => m.id === sm.id)!.out!;
  expect(dock.to.kind).toBe('dock');
  // Aim at the smelter's own output (bar) belt, halfway to the hub's dock arc.
  const at = sm as unknown as { x: number; y: number };
  const aim = await screen(page, at.x / 2, (at.y - 49) / 2);
  const btn = (await page.locator('.rh-tool[data-kind=smelter]').boundingBox())!;
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.mouse.move(aim.x, aim.y + 56, { steps: 12 });
  await page.waitForTimeout(150);
  const hovering = await app(page);
  expect(hovering.placing?.at?.ok).toBe(false);
  await page.mouse.up();
  expect((await hook(page)).machines.filter((m) => m.kind === 'smelter')).toHaveLength(1);
});

test('holding a belt drops a bend post; it can be dragged off, re-placed and survives a reload', async ({
  page,
}) => {
  const save = readFileSync(
    'docs/reviews/evidence/rockhopper-crossings-prepared-save.json',
    'utf8'
  );
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rockhopper.save.v2', t);
  }, save);
  await open(page, '');
  // Drill 4's trunk runs through open space here; a post 50 u to its left bends it legally.
  const on = await screen(page, -8.9, -97.1);
  const post = await screen(page, -58, -106.8);
  const via = () =>
    page.evaluate(
      () =>
        (window as unknown as { __rockhopper: Hook }).__rockhopper.state.machines.find(
          (m) => m.id === 4
        )!.out!.via ?? null
    );
  async function drag(a: { x: number; y: number }, b: { x: number; y: number }, hold: number) {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.waitForTimeout(hold);
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  // A quick drag pans; it never bends.
  await drag(on, { x: on.x + 40, y: on.y + 40 }, 30);
  expect(await via()).toBeNull();
  await page.evaluate(() =>
    (
      window as unknown as { __rockhopper: { renderer: { resetView(): void } } }
    ).__rockhopper.renderer.resetView()
  );
  await page.waitForTimeout(500);
  // Hold, then drag: the new post rides 44 px above the finger.
  await drag(on, { x: post.x, y: post.y + 44 }, 500);
  expect((await via())?.length).toBe(1);
  // Dragging it back onto the straight line removes it.
  await drag(post, on, 0);
  expect(await via()).toBeNull();
  await drag(on, { x: post.x, y: post.y + 44 }, 500);
  expect((await via())?.length).toBe(1);
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  expect((await via())?.length).toBe(1);
});

test('a link with a post pinned mid-drag lands on a busy dock, and that dock’s belt takes its old place', async ({
  page,
}) => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  buildDrill(s, 0, Math.PI * 1.5);
  const [a, , c] = drills(s);
  route(s, c.id, { kind: 'drill', id: a.id });
  const dock = { kind: 'dock', index: 2 } as const;
  const save = serialize(s);
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rockhopper.save.v2', t);
  }, save);
  await open(page, '');
  // A post spot on screen that takes c's belt round drill b to dock 2.
  let post: { x: number; y: number } | null = null;
  for (let y = -340; y <= 0 && !post; y += 10)
    for (let x = -200; x <= 200 && !post; x += 10) {
      if (!swapPartner(s, c, dock, [{ x, y }])) continue;
      const q = await screen(page, x, y);
      if (q.x > 30 && q.x < 360 && q.y > 150 && q.y < 700) post = { x, y };
    }
  expect(post).not.toBeNull();
  const C = await screen(page, machinePos(c).x, machinePos(c).y);
  const P = await screen(page, post!.x, post!.y);
  const D = await screen(page, sitePos(2).x, sitePos(2).y);
  await page.mouse.move(C.x, C.y);
  await page.mouse.down();
  await page.mouse.move(P.x, P.y, { steps: 12 });
  await page.waitForTimeout(600);
  await page.mouse.move(D.x, D.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const outs = await page.evaluate(() =>
    (window as unknown as { __rockhopper: Hook }).__rockhopper.state.machines.map((m) => m.out?.to)
  );
  expect(outs[2]).toEqual(dock);
  expect(outs[1]).toEqual({ kind: 'drill', id: a.id });
});

test('a smelter dragged near a bend post snaps into the knee', async ({ page }) => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.6);
  // Three drills show the smelter in the tray.
  buildDrill(s, 0, Math.PI * 0.1);
  buildDrill(s, 0, Math.PI * 0.9);
  const [a] = drills(s);
  // A post on a's belt with room for a smelter on it.
  let post: { x: number; y: number } | null = null;
  for (let y = -240; y <= 0 && !post; y += 10)
    for (let x = -200; x <= 200 && !post; x += 10) {
      const t = deserialize(serialize(s))!;
      if (bend(t, a.id, [{ x, y }]) !== true) continue;
      // Clear of every other belt, so the drop isn't on a crossing.
      if (beltsNear(t, { x, y }, 30).some((b) => b.id !== a.id)) continue;
      if (buildSmelter(t, { x, y }, a.id) === true) post = { x, y };
    }
  expect(post).not.toBeNull();
  bend(s, a.id, [post!]);
  const save = serialize(s);
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rockhopper.save.v2', t);
  }, save);
  await open(page, '');
  const P = await screen(page, post!.x, post!.y);
  const btn = (await page.locator('.rh-tool[data-kind=smelter]').boundingBox())!;
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  // Aim a little off the post (the ghost sits 56 px above the finger): it snaps onto it.
  await page.mouse.move(P.x + 8, P.y + 56 + 6, { steps: 12 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = await hook(page);
  const sm = after.machines.find((m) => m.kind === 'smelter')!;
  expect(sm).toBeTruthy();
  expect({ x: (sm as { x: number }).x, y: (sm as { y: number }).y }).toEqual(post);
  const owner = after.machines.find((m) => m.id === a.id)!;
  expect(owner.out?.to).toEqual({ kind: 'smelter', id: sm.id });
  expect(owner.out?.via).toBeUndefined();
});

test('a belt’s end can be dragged from its dock to another dock', async ({ page }) => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  const [a, b] = drills(s);
  const from = (a.out!.to as { index: number }).index;
  const busy = (b.out!.to as { index: number }).index;
  const free = [...Array(9).keys()].find(
    (i) =>
      i !== from &&
      i !== busy &&
      route(deserialize(serialize(s))!, a.id, { kind: 'dock', index: i }) === true
  )!;
  await page.addInitScript((t) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rockhopper.save.v2', t);
  }, serialize(s));
  await open(page, '');
  const docks = () =>
    page.evaluate(() =>
      (window as unknown as { __rockhopper: Hook }).__rockhopper.state.machines.map(
        (m) => (m.out?.to as { index?: number } | undefined)?.index
      )
    );
  async function drag(i: number, j: number) {
    const A = await screen(page, sitePos(i).x, sitePos(i).y);
    const D = await screen(page, sitePos(j).x, sitePos(j).y);
    await page.mouse.move(A.x, A.y);
    await page.mouse.down();
    await page.mouse.move(D.x, D.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  // Grabbed by its end on the dock, a's belt moves to a free dock...
  await drag(from, free);
  expect((await docks())[0]).toBe(free);
  // ...and onto b's dock, the two trade.
  await drag(free, busy);
  expect(await docks()).toEqual([busy, free]);
});

test('with joins on, a link dropped on a belt joins it, and one on open space makes a hinge', async ({
  page,
}) => {
  const s = freshState(1);
  s.credits = 1e9;
  s.docks = 9;
  setJoins(s, true);
  buildDrill(s, 0, Math.PI * 0.6);
  buildDrill(s, 0, Math.PI * 0.4);
  buildDrill(s, 0, Math.PI * 1.5);
  const [a, b, c] = drills(s);
  // A spot on b's belt that takes a join from a, clear of other belts and targets.
  const path = beltPath(s, b)!;
  const L = pathLength(path);
  let onB: { x: number; y: number } | null = null;
  for (let f = 0.35; f < 0.9 && !onB; f += 0.03) {
    const q = pointAlong(path, L * f);
    const p = { x: q.x, y: q.y };
    const far = [a, c].every((m) => Math.hypot(machinePos(m).x - p.x, machinePos(m).y - p.y) > 60);
    if (far && Math.hypot(p.x, p.y) > 110 && !joinLinkWhy(s, a.id, p, b.id)) onB = p;
  }
  expect(onB).not.toBeNull();
  // Open space for c's hinge: away from belts, docks and machines.
  let open_: { x: number; y: number } | null = null;
  for (let y = T1Y + 200; y > T1Y - 200 && !open_; y -= 20)
    for (let x = 220; x > 60 && !open_; x -= 20) {
      const p = { x, y };
      const clear =
        beltsNear(s, p, 40).length === 0 &&
        s.machines.every((m) => Math.hypot(machinePos(m).x - x, machinePos(m).y - y) > 70) &&
        Math.hypot(x, y) > 130;
      if (clear && !joinLinkWhy(s, c.id, p)) open_ = p;
    }
  expect(open_).not.toBeNull();
  await page.addInitScript((t) => {
    localStorage.setItem(
      'rockhopper.settings.v1',
      JSON.stringify({ sectors: false, slowRocks: false, joins: true })
    );
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('rockhopper.save.v3', t);
  }, serialize(s));
  await open(page, '');
  async function drag(from: { x: number; y: number }, to: { x: number; y: number }, pause = 0) {
    const A = await screen(page, from.x, from.y);
    const D = await screen(page, to.x, to.y);
    await page.mouse.move(A.x, A.y);
    await page.mouse.down();
    await page.mouse.move(D.x, D.y, { steps: 12 });
    if (pause) await page.waitForTimeout(pause);
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  const outs = () =>
    page.evaluate(() =>
      (window as unknown as { __rockhopper: Hook }).__rockhopper.state.machines.map((m) => ({
        id: m.id,
        kind: m.kind,
        to: m.out?.to ?? null,
      }))
    );
  // a's link dropped on b's belt: a join goes in there, and both belts feed it.
  await drag(machinePos(a), onB!);
  let ms = await outs();
  const j = ms.find((m) => m.kind === 'join')!;
  expect(j).toBeTruthy();
  expect(ms.find((m) => m.id === a.id)!.to).toEqual({ kind: 'join', id: j.id });
  expect(ms.find((m) => m.id === b.id)!.to).toEqual({ kind: 'join', id: j.id });
  expect(j.to).toEqual(b.out!.to);
  // A quick release on open space cancels, as before: c keeps its dock.
  const before = ms.find((m) => m.id === c.id)!.to;
  await drag(machinePos(c), open_!);
  ms = await outs();
  expect(ms.find((m) => m.id === c.id)!.to).toEqual(before);
  expect(ms.filter((m) => m.kind === 'join')).toHaveLength(1);
  // A pause there, then release: a hinge, with nowhere to go yet.
  await drag(machinePos(c), open_!, 700);
  ms = await outs();
  const h = ms.find((m) => m.kind === 'join' && m.id !== j.id)!;
  expect(h).toBeTruthy();
  expect(h.to).toBeNull();
  expect(ms.find((m) => m.id === c.id)!.to).toEqual({ kind: 'join', id: h.id });
  // Dragging on from the hinge to a free dock finishes the line.
  const t = await page.evaluate(() => {
    const st = (window as unknown as { __rockhopper: Hook }).__rockhopper.state;
    const used = new Set(st.machines.map((m) => (m.out?.to as { index?: number })?.index));
    return [...Array(st.docks).keys()].filter((i) => !used.has(i));
  });
  let linked = false;
  for (const i of t) {
    await drag(open_!, sitePos(i));
    ms = await outs();
    if (ms.find((m) => m.id === h.id)!.to) {
      expect(ms.find((m) => m.id === h.id)!.to).toEqual({ kind: 'dock', index: i });
      linked = true;
      break;
    }
  }
  expect(linked).toBe(true);
  // The switch is in the menu.
  await page.locator('.rh-menu-btn, [aria-label="Menu"]').first().click();
  await expect(page.getByRole('button', { name: 'Joins: on' })).toBeVisible();
});

test('Docks in the hub bubble lets the player aim the new dock, and a waiting belt takes it', async ({
  page,
}) => {
  await open(page);
  await threeDrills(page);
  // A fourth drill waits: the three starting docks are taken.
  await page.evaluate(() => {
    const a = (
      window as unknown as { __rockhopper: Hook & { cmd(n: string, ...x: unknown[]): unknown } }
    ).__rockhopper;
    for (let d = 0; d < 360 && a.state.machines.length < 4; d += 5)
      a.cmd('buildDrill', 0, (d * Math.PI) / 180);
  });
  expect((await hook(page)).machines.filter((m) => !m.out)).toHaveLength(1);
  const hub = await screen(page, 0, 0);
  await page.mouse.click(hub.x, hub.y);
  await page.getByRole('button', { name: /Choose where to build a dock/ }).click();
  const before = (await hook(page)).credits;
  // Tapping away cancels: nothing is bought.
  const far = await screen(page, SLOTS[0].x, T1Y);
  await page.mouse.click(far.x, far.y);
  expect((await hook(page)).docks).toBe(3);
  expect((await hook(page)).credits).toBe(before);
  // Aim right of the hub, toward site 4 (-44°), and release there.
  await page.mouse.click(hub.x, hub.y);
  await page.getByRole('button', { name: /Choose where to build a dock/ }).click();
  const a = (-44 * Math.PI) / 180;
  const aim = await screen(page, Math.cos(a) * 110, Math.sin(a) * 110);
  await page.mouse.move(hub.x, hub.y - 70);
  await page.mouse.down();
  await page.mouse.move(aim.x, aim.y, { steps: 10 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'test-results/rockhopper-dock-aim.png' });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const s = await hook(page);
  expect(s.docks).toBe(4);
  expect(s.dockSites).toEqual([0, 1, 2, 4]);
  expect(s.machines.some((m) => m.out?.to.kind === 'dock' && m.out.to.index === 3)).toBe(true);
  await page.screenshot({ path: 'test-results/rockhopper-dock-built.png' });
});
