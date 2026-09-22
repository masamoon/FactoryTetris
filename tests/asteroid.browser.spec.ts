import { test, expect, type Page } from '@playwright/test';
import { advance, type State, type Point, type Session } from '../src/asteroid/simulation';

test.use({ hasTouch: true });
type Hook = { session: Session; scene: { screen(p: Point): Point } };
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
async function place(page: Page, tool: string, x: number, y: number) {
  await page.locator(`#a-tool-${tool}`).click();
  await cell(page, x, y);
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await page.locator('#a-confirm').click();
}
for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
  { width: 844, height: 390 },
]) {
  test(`asteroid layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await setup(page);
    await page.locator('#a-tool-belt').click();
    await cell(page, 3, 6);
    await expect(page.locator('#a-confirm')).toBeEnabled();
    const sizes = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      boxes: [...document.querySelectorAll('canvas,.a-tools button,#a-confirm,#a-pause')].map((e) =>
        e.getBoundingClientRect().toJSON()
      ),
    }));
    expect(sizes.width).toBeLessThanOrEqual(viewport.width);
    expect(sizes.height).toBeLessThanOrEqual(viewport.height);
    for (const b of sizes.boxes) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(viewport.width);
      expect(b.bottom).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: `test-results/asteroid-layout-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}
test('asteroid real UI mining → drilling → plates → parts, exact save continuation', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await setup(page);
  for (const y of [5, 6, 7]) await holdRock(page, 8, y);
  expect((await state(page)).stock.ore).toBe(6);
  for (let x = 2; x <= 6; x++) await place(page, 'belt', x, 6);
  await place(page, 'drill', 7, 6);
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
  await expect(page.locator('#a-context')).toContainText('Extend 8 · 1 part');
  await expect(page.locator('#a-context')).toContainText('New rich-face drill · 2 ore · 1 part');
  await page.screenshot({ path: 'test-results/asteroid-expansion-choice.png' });
  await page.locator('#a-view-head').click();
  const headPosition = await position(page, 15, 6);
  const canvasBounds = await page.locator('canvas').boundingBox();
  expect(canvasBounds).not.toBeNull();
  expect(headPosition.x).toBeGreaterThan(canvasBounds!.x);
  expect(headPosition.x).toBeLessThan(canvasBounds!.x + canvasBounds!.width);
  await page.locator('#a-view-base').click();
  const basePosition = await position(page, 7, 6);
  expect(basePosition.x).toBeGreaterThan(canvasBounds!.x);
  expect(basePosition.x).toBeLessThan(canvasBounds!.x + canvasBounds!.width);
  await page.locator('#a-new-drill').click();
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await expect(page.locator('#a-context')).toContainText('Shaft drill · 2 ore · 1 part');
  await page.screenshot({ path: 'test-results/asteroid-fresh-drill-preview.png' });
  await page.locator('#a-tool-mine').click();
  await cell(page, 7, 6);
  await page.locator('#a-extend-drill').click();
  expect((await state(page)).stock.part).toBe(0);
  expect((await state(page)).machines.find((m) => m.kind === 'drill')!.extension).toBeTruthy();
  await page.screenshot({ path: 'test-results/asteroid-extension-tender.png' });
  await expect
    .poll(async () => (await state(page)).machines.find((m) => m.kind === 'drill')!.extensions, {
      timeout: 6000,
    })
    .toBe(1);
  await expect
    .poll(async () => (await state(page)).terrain[6 * 36 + 16], { timeout: 6000 })
    .toBeNull();
  await expect(page.locator('#a-objective-title')).toHaveText('Your outpost is expanding');
  await page.screenshot({ path: 'test-results/asteroid-extension-working.png' });
  await page.locator('#a-pause').click();
  const before = await state(page);
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('gridforge.asteroid.v1')!).state)
    )
    .toEqual(before);
  await page.reload();
  await expect(page.locator('#a-pause')).toBeVisible();
  await page.locator('#a-pause').click();
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
  await page.locator('#a-tool-drill').click();
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
  await page.locator('#a-pause').click();
  const p = await position(page, 8, 6);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await expect
    .poll(async () => (await state(page)).terrain[6 * 36 + 8]?.work || 0)
    .toBeGreaterThan(0);
  await page.locator('canvas').dispatchEvent('pointercancel');
  const cancelled = (await state(page)).terrain[6 * 36 + 8]?.work;
  await page.waitForTimeout(350);
  expect((await state(page)).terrain[6 * 36 + 8]?.work).toBe(cancelled);
  await page.mouse.up();
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 100, p.y, { steps: 5 });
  await page.mouse.up();
  expect((await state(page)).terrain[6 * 36 + 8]?.work).toBe(cancelled);
  await page.locator('#a-home').click();
  const reset = await position(page, 8, 6);
  expect(reset.x).toBeCloseTo(p.x, 0);
});

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
]) {
  test(`service drone makes repeatable manual deliveries at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await page.evaluate(() => {
      (window as unknown as { asteroid: Hook }).asteroid.session.state.stock.ore = 12;
    });
    await place(page, 'smelter', 7, 6);
    await page.evaluate(() => {
      const smelter = (
        window as unknown as { asteroid: Hook }
      ).asteroid.session.state.machines.find((m) => m.kind === 'smelter')!;
      smelter.output = ['plate', 'plate', 'plate', 'plate'];
    });

    await cell(page, 1, 6);
    await expect(page.locator('#a-context')).toContainText('MANUAL DELIVERY');
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
    await expect(page.locator('#a-context')).toContainText('connect the right input to automate');
    await expect(page.locator('#a-dispatch-machine')).toHaveText('Send 2 ore');
    const before = await page.locator('#a-dispatch-machine').boundingBox();
    expect(before).not.toBeNull();
    expect(before!.height).toBeGreaterThanOrEqual(40);
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
    await page.locator('#a-pause').click();
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

    await page.locator('#a-undo').click();
    const restored = await state(page);
    expect(restored.stock.ore).toBe(12);
    expect(restored.machines).toEqual([]);
    await expect(page.locator('#a-undo')).toHaveText('Undo build');
  });
}

test('belt drag previews and installs a fast skipped route as one undoable build', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.locator('#a-tool-belt').click();
  await expect(page.locator('#a-context')).toContainText('Drag from output toward destination');
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
  await expect(page.locator('#a-context')).toContainText('5 conveyors · Free');
  await expect(page.locator('#a-context')).toContainText('Release to install');
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
  await page.screenshot({ path: 'test-results/asteroid-belt-drag-built.png' });
  await page.locator('#a-undo').click();
  expect((await state(page)).machines).toEqual([]);
});

test('belt drag backtracks, cancels safely and leaves camera buttons usable at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await page.locator('#a-tool-belt').click();
  const beforePan = await position(page, 6, 6);
  await page.locator('#a-right').click();
  const afterPan = await position(page, 6, 6);
  expect(afterPan.x).toBeLessThan(beforePan.x);
  await page.locator('#a-home').click();

  const start = await position(page, 6, 6),
    far = await position(page, 2, 6),
    back = await position(page, 4, 6);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(far.x, far.y);
  await page.mouse.move(back.x, back.y);
  await expect(page.locator('#a-context')).toContainText('3 conveyors · Free');
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

test('invalid belt drag across the dock is atomic and touch tap keeps precise placement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.locator('#a-tool-belt').click();
  const start = await position(page, 3, 6),
    dock = await position(page, 1, 6);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(dock.x, dock.y);
  await expect(page.locator('#a-context')).toContainText('collection dock');
  await page.mouse.up();
  expect((await state(page)).machines).toEqual([]);
  await expect(page.locator('#a-context')).toContainText('collection dock');

  await cell(page, 3, 6);
  await expect(page.locator('#a-confirm')).toBeEnabled();
  await page.locator('#a-confirm').click();
  expect((await state(page)).machines.map((m) => [m.x, m.y])).toEqual([[3, 6]]);
});

test('asteroid vertical drag exposes bottom terrain; Dock resets both camera axes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  const original = await position(page, 8, 6);
  const b = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(b.x + b.width - 20, b.y + b.height - 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 20, b.y + 50, { steps: 8 });
  await page.mouse.up();
  const bottom = await position(page, 8, 11);
  expect(bottom.y).toBeLessThan(b.y + b.height);
  expect((await state(page)).mined).toBe(0);
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
  await page.locator('#a-pause').click();
  const paused = await state(page);
  await page.waitForTimeout(300);
  expect(await state(page)).toEqual(paused);
  await page.locator('#a-pause').click();
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
  await expect(page.locator('#a-save')).toHaveText('Save unavailable');
  await holdRock(page, 8, 6);
  expect((await state(page)).stock.ore).toBe(2);
});
