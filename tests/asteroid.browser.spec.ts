import { test, expect, type Page } from '@playwright/test';
import { advance, type State, type Point, type Session } from '../src/asteroid/simulation';
import { asteroidReplay } from '../tools/asteroid-replay';

test.use({ hasTouch: true });
type Hook = {
  session: Session;
  scene: { screen(p: Point): Point; cell: number };
  render(): void;
  save(): void;
};
const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { asteroid: Hook }).asteroid.session.state);
async function setup(page: Page) {
  await page.goto('/?test');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#a-objective-title')).toBeVisible();
  await expect(page.locator('webpack-dev-server-client-overlay')).toHaveCount(0);
  await page.waitForFunction(
    () => !!(window as unknown as { asteroid: Hook }).asteroid?.scene.screen({ x: 0, y: 0 })
  );
}
/** Replace or adjust the live state through the test hook, then redraw. */
async function load(page: Page, next: State) {
  await page.evaluate((s) => {
    const app = (window as unknown as { asteroid: Hook }).asteroid;
    app.session.state = s;
    app.render();
    app.save();
  }, next);
}
async function seedOre(page: Page, ore: number) {
  await page.evaluate((n) => {
    const app = (window as unknown as { asteroid: Hook }).asteroid;
    app.session.state.stock.ore = n;
    app.render();
  }, ore);
}
async function position(page: Page, x: number, y: number) {
  const at = await page.evaluate(
    (p) => (window as unknown as { asteroid: Hook }).asteroid.scene.screen(p),
    { x, y }
  );
  const b = (await page.locator('canvas').boundingBox())!;
  return { x: b.x + at.x, y: b.y + at.y };
}
async function cell(page: Page, x: number, y: number) {
  const p = await position(page, x, y);
  await page.touchscreen.tap(p.x, p.y);
}
async function holdRock(page: Page, x: number, y: number) {
  const p = await position(page, x, y);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await expect
    .poll(async () => (await state(page)).terrain[y * 36 + x], { timeout: 6000 })
    .toBeNull();
  await page.mouse.up();
}
async function tool(page: Page, name: string) {
  const button = page.locator(`#a-tool-${name}`);
  if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}
async function place(page: Page, name: string, x: number, y: number) {
  await tool(page, name);
  await cell(page, x, y);
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await page.locator('#a-confirm').click();
}
async function pause(page: Page) {
  await page.locator('#a-menu').click();
  await page.locator('#a-pause').click();
  await expect(page.locator('#a-resume')).toBeVisible();
}
/** The world must stay a full-screen canvas; overlays may never shrink or blank it. */
async function expectFullBleed(page: Page, viewport: { width: number; height: number }) {
  const canvas = (await page.locator('canvas').boundingBox())!;
  expect(canvas.x).toBe(0);
  expect(canvas.y).toBe(0);
  expect(canvas.width).toBe(viewport.width);
  expect(canvas.height).toBe(viewport.height);
}
/** The world area between the HUD and the dock (bottom dock, or a side dock in landscape). */
async function visibleBand(page: Page) {
  return page.evaluate(() => {
    const dock = document.getElementById('a-dock')!.getBoundingClientRect(),
      side = dock.width < innerWidth * 0.6;
    return {
      top: document.getElementById('a-hud')!.getBoundingClientRect().bottom,
      bottom: side ? innerHeight : dock.top,
      right: side ? dock.left : innerWidth,
    };
  });
}

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
  { width: 844, height: 390 },
  { width: 640, height: 360 },
]) {
  test(`asteroid layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await setup(page);
    await expectFullBleed(page, viewport);
    // The opening frame is the world, the goal and the ore count: no build buttons yet.
    await expect(page.locator('#a-tools')).toBeHidden();
    await page.screenshot({ path: `test-results/asteroid-opening-${viewport.width}.png` });
    await seedOre(page, 2);
    await expect(page.locator('#a-tools')).toBeVisible();
    await tool(page, 'belt');
    await cell(page, 3, 6);
    await expect(page.locator('#a-confirm')).toBeEnabled();
    const sizes = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      boxes: [...document.querySelectorAll('.a-tools button,#a-confirm,#a-cancel,#a-menu')].map(
        (e) => e.getBoundingClientRect().toJSON()
      ),
    }));
    expect(sizes.width).toBeLessThanOrEqual(viewport.width);
    expect(sizes.height).toBeLessThanOrEqual(viewport.height);
    for (const b of sizes.boxes) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(viewport.width);
      expect(b.bottom).toBeLessThanOrEqual(viewport.height);
      expect(b.height).toBeGreaterThanOrEqual(40);
    }
    // The previewed cell stays between the HUD and the dock.
    const band = await visibleBand(page),
      target = await position(page, 3, 6);
    expect(target.y).toBeGreaterThan(band.top);
    expect(target.y).toBeLessThan(band.bottom);
    expect(target.x).toBeLessThan(band.right);
    await expect(page.locator('#a-frozen')).toBeVisible();
    await page.screenshot({ path: `test-results/asteroid-layout-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]) {
  test(`drill inspector keeps the factory visible at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await load(page, asteroidReplay().session.state);
    await cell(page, 7, 6);
    await expect(page.locator('#a-extend-drill')).toBeVisible();
    await expectFullBleed(page, viewport);
    const band = await visibleBand(page);
    for (const x of [1, 3, 7]) {
      const p = await position(page, x, 6);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(viewport.width);
      expect(p.y).toBeGreaterThan(band.top);
      expect(p.y).toBeLessThan(band.bottom);
    }
    for (const b of await page
      .locator('#a-context button')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
      expect(b.height).toBeGreaterThanOrEqual(36);
      expect(b.right).toBeLessThanOrEqual(viewport.width);
    }
    await page.screenshot({ path: `test-results/asteroid-inspector-${viewport.width}.png` });
  });
}

test('asteroid real UI mining → drilling → plates → parts, exact save continuation', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  for (const y of [5, 6, 7]) await holdRock(page, 8, y);
  expect((await state(page)).stock.ore).toBe(6);
  await expect(page.locator('#a-tool-drill')).toHaveClass(/suggest/);
  for (let x = 2; x <= 6; x++) await place(page, 'belt', x, 6);
  await tool(page, 'drill');
  await cell(page, 7, 6);
  await expect(page.locator('#a-context')).toContainText('96 ore deep pocket at end');
  await page.screenshot({ path: 'test-results/asteroid-pocket-preview.png' });
  await page.locator('#a-confirm').click();
  await expect(page.locator('#a-tool-drill')).toHaveAttribute('aria-pressed', 'false');
  await cell(page, 7, 6);
  await expect(page.locator('#a-extend-drill')).toBeDisabled();
  await expect(page.locator('#a-new-drill')).toBeDisabled();
  await expect(page.locator('#a-context')).toContainText('Finish this shaft');
  await page.screenshot({ path: 'test-results/asteroid-expansion-disabled.png' });
  await page.locator('#a-close-inspect').click();
  await expect
    .poll(async () => (await state(page)).stock.ore, { timeout: 16000 })
    .toBeGreaterThanOrEqual(8);
  await expect
    .poll(async () => (await state(page)).machines.find((m) => m.x === 4)?.output.length)
    .toBe(0);
  await place(page, 'smelter', 4, 6);
  await page.screenshot({ path: 'test-results/asteroid-smelting.png' });
  await expect
    .poll(async () => (await state(page)).stock.plate, { timeout: 28000 })
    .toBeGreaterThanOrEqual(6);
  await expect
    .poll(async () => (await state(page)).machines.find((m) => m.x === 3)?.output.length)
    .toBe(0);
  await place(page, 'assembler', 3, 6);
  await expect
    .poll(async () => (await state(page)).delivered.part, { timeout: 20000 })
    .toBeGreaterThanOrEqual(1);
  await expect(page.locator('#a-objective-title')).toHaveText('Choose your expansion');
  await page.screenshot({ path: 'test-results/asteroid-production.png' });
  await expect
    .poll(
      async () => {
        const drill = (await state(page)).machines.find((m) => m.kind === 'drill')!;
        return drill.head > drill.end && drill.loads.length === 0;
      },
      { timeout: 8000 }
    )
    .toBe(true);
  await cell(page, 7, 6);
  await expect(page.locator('#a-extend-drill')).toBeEnabled();
  await expect(page.locator('#a-new-drill')).toBeEnabled();
  await expect(page.locator('#a-extend-drill')).toContainText('Extend 8');
  await expect(page.locator('#a-new-drill')).toContainText('2');
  await page.screenshot({ path: 'test-results/asteroid-expansion-choice.png' });
  await page.locator('#a-view-head').click();
  const headPosition = await position(page, 15, 6);
  const canvasBounds = (await page.locator('canvas').boundingBox())!;
  expect(headPosition.x).toBeGreaterThan(canvasBounds.x);
  expect(headPosition.x).toBeLessThan(canvasBounds.x + canvasBounds.width);
  // Collection is now off-screen, so the recentre control appears and restores it.
  await expect(page.locator('#a-home')).toBeVisible();
  await page.locator('#a-home').click();
  await expect(page.locator('#a-home')).toBeHidden();
  const basePosition = await position(page, 7, 6);
  expect(basePosition.x).toBeGreaterThan(canvasBounds.x);
  expect(basePosition.x).toBeLessThan(canvasBounds.x + canvasBounds.width);
  await page.locator('#a-new-drill').click();
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await expect(page.locator('#a-context')).toContainText('Shaft drill · 2 ore');
  await page.screenshot({ path: 'test-results/asteroid-fresh-drill-preview.png' });
  await page.locator('#a-cancel').click();
  await page.locator('#a-done').click();
  await pause(page);
  await cell(page, 7, 6);
  const partsBeforeKit = (await state(page)).stock.part;
  await page.locator('#a-extend-drill').click();
  expect((await state(page)).stock.part).toBe(partsBeforeKit - 1);
  expect((await state(page)).machines.find((m) => m.kind === 'drill')!.extension?.queued).toBe(
    true
  );
  await page.screenshot({ path: 'test-results/asteroid-extension-queued.png' });
  await page.locator('#a-cancel-extension').click();
  expect((await state(page)).stock.part).toBe(partsBeforeKit);
  expect((await state(page)).machines.find((m) => m.kind === 'drill')!.extension).toBeUndefined();
  await page.locator('#a-extend-drill').click();
  const accelerated = structuredClone(await state(page));
  let safety = 3000;
  while (
    (!accelerated.machines.find((m) => m.kind === 'drill')!.extensions ||
      accelerated.terrain[6 * 36 + 16]) &&
    safety--
  )
    advance(accelerated);
  expect(safety).toBeGreaterThan(0);
  await load(page, accelerated);
  await page.screenshot({ path: 'test-results/asteroid-extension-working.png' });
  await page.locator('#a-resume').click();
  await expect(page.locator('#a-objective-title')).toHaveText('Your outpost is expanding');
  await pause(page);
  const before = await state(page);
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('gridforge.asteroid.v1')!).state)
    )
    .toEqual(before);
  await page.reload();
  await expect(page.locator('#a-menu')).toBeVisible();
  await page.locator('#a-menu').click();
  const resumed = await state(page);
  expect(resumed.tick - before.tick).toBeLessThan(25);
  const expected = structuredClone(before);
  while (expected.tick < resumed.tick) advance(expected);
  expect(resumed).toEqual(expected);
  expect(errors).toEqual([]);
});

test('asteroid planning freezes time, invalid placement is atomic, undo and input cancellation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await holdRock(page, 8, 6);
  await tool(page, 'drill');
  await expect(page.locator('#a-frozen')).toHaveText('⏸ Time stopped');
  const before = await state(page);
  await cell(page, 7, 6);
  await expect(page.locator('#a-confirm')).toBeDisabled();
  await expect(page.locator('#a-context')).toContainText('Need 6 ore');
  await page.waitForTimeout(350);
  expect(await state(page)).toEqual(before);
  await page.locator('#a-cancel').click();
  await place(page, 'belt', 3, 6);
  expect((await state(page)).machines).toHaveLength(1);
  await page.locator('#a-undo').click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator('#a-undo')).toBeDisabled();
  await page.locator('#a-done').click();
  const p = await position(page, 8, 5);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await expect
    .poll(async () => (await state(page)).terrain[5 * 36 + 8]?.work || 0)
    .toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/asteroid-hold-progress.png' });
  await page.locator('canvas').dispatchEvent('pointercancel');
  const cancelled = (await state(page)).terrain[5 * 36 + 8]?.work;
  await page.waitForTimeout(350);
  expect((await state(page)).terrain[5 * 36 + 8]?.work).toBe(cancelled);
  await page.mouse.up();
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 100, p.y, { steps: 5 });
  await page.mouse.up();
  expect((await state(page)).terrain[5 * 36 + 8]?.work).toBe(cancelled);
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('#a-home')).toBeVisible();
  await page.locator('#a-home').click();
  const reset = await position(page, 8, 5);
  expect(reset.x).toBeCloseTo(p.x, 0);
});

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]) {
  test(`one-gesture world feeding and inspection at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await seedOre(page, 14);
    await place(page, 'smelter', 7, 6);
    const dock = await position(page, 1, 6),
      machine = await position(page, 7, 6),
      client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...dock, id: 1 }],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...machine, id: 1 }],
    });
    await page.screenshot({ path: `test-results/asteroid-dock-drag-${viewport.width}.png` });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect((await state(page)).courier.cargo).toEqual(['ore', 'ore']);
    expect((await state(page)).stock.ore).toBe(4);
    await expect.poll(async () => (await state(page)).courier.phase).toBe('idle');
    await cell(page, 7, 6);
    await expect(page.locator('#a-dispatch-machine')).toBeVisible();
    await page.locator('#a-close-inspect').click();
    const feed = await page.evaluate(() => {
      const scene = (window as unknown as { asteroid: Hook }).asteroid.scene;
      const p = scene.screen({ x: 7, y: 6 });
      return { x: p.x, y: p.y - Math.max(26, scene.cell * 0.95) };
    });
    const canvas = (await page.locator('canvas').boundingBox())!;
    await page.touchscreen.tap(canvas.x + feed.x, canvas.y + feed.y);
    expect((await state(page)).courier.cargo).toEqual(['ore', 'ore']);
    expect((await state(page)).stock.ore).toBe(2);
    await page.screenshot({ path: `test-results/asteroid-world-feed-${viewport.width}.png` });
  });

  test(`service drone makes repeatable manual deliveries at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await seedOre(page, 12);
    await place(page, 'smelter', 7, 6);
    await page.evaluate(() => {
      const smelter = (
        window as unknown as { asteroid: Hook }
      ).asteroid.session.state.machines.find((m) => m.kind === 'smelter')!;
      smelter.output = ['plate', 'plate', 'plate', 'plate'];
    });

    await cell(page, 1, 6);
    await expect(page.locator('#a-context')).toContainText('Manual delivery');
    await expect(page.locator('#a-context')).toContainText('Tap a glowing processor');
    await page.screenshot({ path: `test-results/asteroid-drone-target-${viewport.width}.png` });
    await cell(page, 7, 6);
    let loaded = await state(page);
    expect(loaded.stock.ore).toBe(2);
    expect(loaded.courier.phase).toBe('outbound');
    expect(loaded.courier.cargo).toEqual(['ore', 'ore']);
    expect(loaded.machines.find((m) => m.kind === 'smelter')!.input).toEqual([]);
    await page.screenshot({ path: `test-results/asteroid-drone-flight-${viewport.width}.png` });
    await expect
      .poll(
        async () => (await state(page)).machines.find((m) => m.kind === 'smelter')!.input.length
      )
      .toBe(2);
    await expect.poll(async () => (await state(page)).courier.phase).toBe('idle');

    await cell(page, 7, 6);
    await expect(page.locator('#a-dispatch-machine')).toBeEnabled();
    await expect(page.locator('#a-context')).toContainText('Belts into the right side automate');
    await expect(page.locator('#a-dispatch-machine')).toHaveText('Send 2 ore');
    const before = await page.locator('#a-dispatch-machine').boundingBox();
    expect(before).not.toBeNull();
    expect(before!.height).toBeGreaterThanOrEqual(44);
    expect(before!.x).toBeGreaterThanOrEqual(0);
    expect(before!.x + before!.width).toBeLessThanOrEqual(viewport.width);
    await page.locator('#a-dispatch-machine').click();
    loaded = await state(page);
    expect(loaded.stock.ore).toBe(0);
    expect(loaded.courier.cargo).toEqual(['ore', 'ore']);
    await expect
      .poll(
        async () => (await state(page)).machines.find((m) => m.kind === 'smelter')!.input.length
      )
      .toBe(4);
    await pause(page);
    await cell(page, 7, 6);
    await expect(page.locator('#a-dispatch-machine')).toBeDisabled();
    await expect(page.locator('#a-context')).toContainText('Input buffer is full');
    const fullLayout = await page.evaluate(() => ({
      scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight,
    }));
    expect(fullLayout.scrollY).toBe(0);
    expect(fullLayout.scrollHeight).toBeLessThanOrEqual(fullLayout.innerHeight);
    await expectFullBleed(page, viewport);
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `test-results/asteroid-drone-delivered-${viewport.width}.png`,
    });
    loaded = await state(page);
    await expect
      .poll(async () =>
        page.evaluate(() => JSON.parse(localStorage.getItem('gridforge.asteroid.v1')!).state)
      )
      .toEqual(loaded);

    await page.locator('#a-close-inspect').click();
    await page.locator('#a-undo').click();
    const restored = await state(page);
    expect(restored.stock.ore).toBe(12);
    expect(restored.machines).toEqual([]);
    await expect(page.locator('#a-undo')).toBeDisabled();
  });
}

test('belt drag previews and installs a route as one undoable build, then resumes time', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await seedOre(page, 2);
  await tool(page, 'belt');
  await expect(page.locator('#a-context')).toContainText('Drag from an output to its destination');
  const start = await position(page, 6, 6),
    end = await position(page, 2, 6);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: end.x, y: end.y, id: 1 }],
  });
  await expect(page.locator('#a-context')).toContainText('5 conveyors · free');
  await expect(page.locator('#a-context')).toContainText('Release to build');
  await page.screenshot({ path: 'test-results/asteroid-belt-drag-preview.png' });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const built = await page.evaluate(() => {
    const session = (window as unknown as { asteroid: Hook }).asteroid.session;
    return { machines: session.state.machines, history: session.history.length };
  });
  expect(built.machines.map((m) => [m.x, m.y, m.direction])).toEqual([
    [6, 6, 3],
    [5, 6, 3],
    [4, 6, 3],
    [3, 6, 3],
    [2, 6, 3],
  ]);
  expect(built.history).toBe(1);
  // A completed drag returns to live play so cargo moves immediately.
  await expect(page.locator('#a-tool-belt')).toHaveAttribute('aria-pressed', 'false');
  const tick = (await state(page)).tick;
  await expect.poll(async () => (await state(page)).tick).toBeGreaterThan(tick);
  await page.screenshot({ path: 'test-results/asteroid-belt-drag-built.png' });
  await page.locator('#a-undo').click();
  expect((await state(page)).machines).toEqual([]);
});

test('belt drag backtracks, cancels safely and the camera pans by keys at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await seedOre(page, 2);
  await tool(page, 'belt');
  const beforePan = await position(page, 6, 6);
  await page.keyboard.press('ArrowRight');
  const afterPan = await position(page, 6, 6);
  expect(afterPan.x).toBeLessThan(beforePan.x);
  await page.keyboard.press('h');

  const start = await position(page, 6, 6),
    far = await position(page, 2, 6),
    back = await position(page, 4, 6);
  expect(start.x).toBeCloseTo(beforePan.x, 0);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(far.x, far.y);
  await page.mouse.move(back.x, back.y);
  await expect(page.locator('#a-context')).toContainText('3 conveyors · free');
  await page.locator('canvas').dispatchEvent('pointercancel');
  await page.mouse.up();
  expect((await state(page)).machines).toEqual([]);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(far.x, far.y);
  await page.mouse.move(back.x, back.y);
  await page.mouse.up();
  expect((await state(page)).machines.map((m) => m.x)).toEqual([6, 5, 4]);
});

test('invalid belt drag into rock is atomic and touch tap keeps precise placement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await seedOre(page, 2);
  await tool(page, 'belt');
  const start = await position(page, 6, 6),
    rock = await position(page, 9, 6);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(rock.x, rock.y);
  await expect(page.locator('#a-context')).toContainText('Excavate this block');
  await page.mouse.up();
  expect((await state(page)).machines).toEqual([]);
  await expect(page.locator('#a-toast')).toContainText('Excavate this block');
  await expect(page.locator('#a-tool-belt')).toHaveAttribute('aria-pressed', 'true');

  // Tap to preview, then tap the same ghost again to build it.
  await cell(page, 3, 6);
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await cell(page, 3, 6);
  expect((await state(page)).machines.map((m) => [m.x, m.y])).toEqual([[3, 6]]);
});

test('tapping a conveyor offers rotate and remove without a separate tool', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await seedOre(page, 2);
  await place(page, 'belt', 4, 6);
  await page.locator('#a-done').click();
  await cell(page, 4, 6);
  await expect(page.locator('#a-rotate-belt')).toBeEnabled();
  await page.locator('#a-rotate-belt').click();
  expect((await state(page)).machines.map((m) => [m.x, m.y, m.direction])).toEqual([[4, 6, 0]]);
  await page.screenshot({ path: 'test-results/asteroid-belt-inspector.png' });
  await page.locator('#a-remove-belt').click();
  expect((await state(page)).machines).toEqual([]);
  await expect(page.locator('#a-tools')).toBeVisible();
});

test('two-finger pinch zooms and pans without mining or building', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await seedOre(page, 2);
  await tool(page, 'belt');
  const cellSize = () =>
    page.evaluate(() => (window as unknown as { asteroid: Hook }).asteroid.scene.cell);
  const before = await cellSize(),
    a = await position(page, 4, 6),
    b = await position(page, 6, 6),
    client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: a.x, y: a.y, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: a.x, y: a.y, id: 1 },
      { x: b.x, y: b.y, id: 2 },
    ],
  });
  for (let i = 1; i <= 5; i++)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: a.x - i * 12, y: a.y, id: 1 },
        { x: b.x + i * 12, y: b.y, id: 2 },
      ],
    });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: a.x - 60, y: a.y, id: 1 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await cellSize()).toBeGreaterThan(before * 1.3);
  expect((await state(page)).machines).toEqual([]);
  expect((await state(page)).mined).toBe(0);
  await expect(page.locator('#a-home')).toBeVisible();
  await page.screenshot({ path: 'test-results/asteroid-pinch-zoom.png' });
  await page.locator('#a-home').click();
  expect(await cellSize()).toBeCloseTo(before, 1);
});

test('asteroid vertical drag explores terrain; recentre resets both camera axes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  const original = await position(page, 8, 6);
  const b = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(b.x + b.width - 20, b.y + b.height - 150);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 260, b.y + 60, { steps: 8 });
  await page.mouse.up();
  const bottom = await position(page, 8, 11);
  expect(bottom.y).toBeLessThan(b.y + b.height);
  expect((await state(page)).mined).toBe(0);
  await expect(page.locator('#a-home')).toBeVisible();
  await page.locator('#a-home').click();
  const restored = await position(page, 8, 6);
  expect(restored.x).toBeCloseTo(original.x, 0);
  expect(restored.y).toBeCloseTo(original.y, 0);
});

test('asteroid pause and resume discard a still-held mining gesture', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  const p = await position(page, 8, 6);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 1 }],
  });
  await expect
    .poll(async () => (await state(page)).terrain[6 * 36 + 8]?.work || 0)
    .toBeGreaterThan(0);
  // Mouse activation simulates a second independent pointer while the touch stays held.
  await pause(page);
  const paused = await state(page);
  await page.waitForTimeout(300);
  expect(await state(page)).toEqual(paused);
  await page.locator('#a-resume').click();
  await page.waitForTimeout(350);
  expect((await state(page)).terrain).toEqual(paused.terrain);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});

test('asteroid unavailable storage still permits mining and displays save status', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Blocked');
    };
    Storage.prototype.getItem = () => {
      throw new Error('Blocked');
    };
  });
  await setup(page);
  await expect(page.locator('#a-toast')).toContainText('Saving is unavailable');
  await page.locator('#a-menu').click();
  await expect(page.locator('#a-save')).toHaveText('Save unavailable');
  await page.locator('#a-close-modal').click();
  await holdRock(page, 8, 6);
  expect((await state(page)).stock.ore).toBe(2);
});

test('dragging a route onto collection ends it there, even after resting at the edge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await seedOre(page, 2);
  await tool(page, 'belt');
  const start = await position(page, 6, 6),
    dock = await position(page, 1, 6);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(dock.x, dock.y, { steps: 6 });
  await expect(page.locator('#a-context')).toContainText('5 conveyors · free');
  // Resting near the left edge must not drag the camera and route past collection.
  await page.waitForTimeout(600);
  await expect(page.locator('#a-context')).toContainText('5 conveyors · free');
  await page.mouse.up();
  expect((await state(page)).machines.map((m) => [m.x, m.y, m.direction])).toEqual([
    [6, 6, 3],
    [5, 6, 3],
    [4, 6, 3],
    [3, 6, 3],
    [2, 6, 3],
  ]);
});

test('a long still press on a preview never builds it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await seedOre(page, 12);
  await tool(page, 'smelter');
  await cell(page, 5, 6);
  await expect(page.locator('#a-confirm')).toBeEnabled();
  const p = await position(page, 5, 6);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.move(p.x - 120, p.y, { steps: 6 });
  await page.mouse.up();
  expect((await state(page)).machines).toEqual([]);
  expect((await state(page)).stock.ore).toBe(12);
});

test('live inspector keeps its buttons while the factory runs', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await load(page, asteroidReplay().session.state);
  await cell(page, 7, 6);
  const button = await page.locator('#a-new-drill').elementHandle();
  const tick = (await state(page)).tick;
  await expect.poll(async () => (await state(page)).tick).toBeGreaterThan(tick + 15);
  expect(await button!.evaluate((e) => e.isConnected)).toBe(true);
  // A deliberate 150 ms press lands on the same element and opens the new-drill preview.
  const box = (await page.locator('#a-new-drill').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect(page.locator('#a-confirm')).toBeVisible();
});

test('tapping collection with nothing to feed explains instead of trapping the player', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await seedOre(page, 2);
  await cell(page, 1, 6);
  await expect(page.locator('#a-toast')).toContainText('Build a smelter');
  await expect(page.locator('#a-tools')).toBeVisible();
  await expect(page.locator('#a-cancel-transfer')).toHaveCount(0);
});
