import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { State } from '../src/rockhopper/sim';
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
  expect(s.version).toBe(2);
  expect(s.credits).toBeGreaterThanOrEqual(777);
  expect(s.machines[0].tier).toBe(2);
  await page.evaluate(() => (window as unknown as { __rockhopper: Hook }).__rockhopper.save());
  const keys = await page.evaluate(() => ({
    v1: localStorage.getItem('rockhopper.save.v1'),
    v2: !!localStorage.getItem('rockhopper.save.v2'),
  }));
  expect(keys.v1).toBe(text);
  expect(keys.v2).toBe(true);
  // Restore: the v2 save is dropped and the untouched v1 save is migrated again.
  await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    a.state.credits = 5;
    a.save();
  });
  await page.goto('/?restore=pre-logistics');
  await page.waitForFunction(() => !!(window as unknown as { __rockhopper?: Hook }).__rockhopper);
  expect((await hook(page)).credits).toBeGreaterThanOrEqual(777);
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
