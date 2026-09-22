import { test, expect, type Page } from '@playwright/test';
import { geometry, LEVELS } from '../src/game/content';
import { winningReplay } from '../tools/replay';
import type { Command, RunState } from '../src/game/types';
test.use({ hasTouch: true });
const state = (page: Page): Promise<RunState> =>
  page.evaluate(
    () => (window as unknown as { factory: { session: { state: RunState } } }).factory.session.state
  );
async function ready(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('webpack-dev-server-client-overlay')).toHaveCount(0);
  await expect(page.locator('#run,#results')).toBeEnabled();
}
async function cell(page: Page, x: number, y: number) {
  const b = (await page.locator('canvas').boundingBox())!;
  await page.touchscreen.tap(
    b.x + ((32 + (x + 0.5) * 48) * b.width) / 448,
    b.y + ((23 + (y + 0.5) * 48) * b.height) / 478
  );
}
async function setup(page: Page) {
  await page.addInitScript(
    () =>
      !localStorage.getItem('gridforge.folded.settings.v1') &&
      localStorage.setItem(
        'gridforge.folded.settings.v1',
        JSON.stringify({ reducedMotion: true, muted: true })
      )
  );
  await page.goto('/?mode=tiles&test');
  await ready(page);
}
async function choose(page: Page, level: number) {
  await page.locator('#levels').click();
  await page.locator(`#level-${level}`).click();
  await ready(page);
}
async function action(page: Page, c: Command) {
  if (c.type === 'run' || c.type === 'undo') {
    await page.locator(`#${c.type}`).click();
  } else if (c.type === 'place') {
    await page.locator(`#tool-${c.kind}`).click();
    for (let r = 0; r < c.rotation; r++) await page.locator('#rotate').click();
    await cell(page, c.x, c.y);
    await expect(page.locator('#confirm')).toBeEnabled();
    await page.locator('#confirm').click();
  } else {
    const m = (await state(page)).machines.find((m) => m.id === c.id)!;
    const p = geometry(m).cells[0];
    await cell(page, p.x, p.y);
    await page.locator(`#${c.type}`).click();
    if (c.type === 'recycle') await page.locator('#do-recycle').click();
    else {
      for (let r = 0; r < (c.rotation - (c.type === 'move' ? m.rotation : 0) + 4) % 4; r++)
        await page.locator('#rotate').click();
      await cell(page, c.x, c.y);
      await page.locator('#confirm').click();
    }
  }
  await ready(page);
}
for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
  { width: 844, height: 390 },
])
  test(`layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await choose(page, 9);
    const sizes = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      boxes: [...document.querySelectorAll('canvas,#controls button,.order-item')].map((e) =>
        e.getBoundingClientRect().toJSON()
      ),
    }));
    expect(sizes.width).toBeLessThanOrEqual(viewport.width);
    expect(sizes.height).toBeLessThanOrEqual(viewport.height);
    for (const b of sizes.boxes) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(viewport.width);
      expect(b.bottom).toBeLessThanOrEqual(viewport.height);
      expect(b.top).toBeGreaterThanOrEqual(0);
    }
    await page.screenshot({ path: `test-results/layout-${viewport.width}.png` });
  });
for (let level = 0; level < LEVELS.length; level++)
  test(`touch playthrough level ${level + 1}, exact save and results`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await setup(page);
    await choose(page, level);
    await page.screenshot({ path: `test-results/level-${level + 1}-start.png` });
    const replay = winningReplay(level);
    for (const c of replay.commands) {
      await action(page, c);
      if (c.type === 'fold') {
        const before = await state(page);
        await page.reload();
        await ready(page);
        expect(await state(page)).toEqual(before);
      }
    }
    expect(await state(page)).toEqual(replay.session.state);
    await expect(page.getByRole('heading', { name: 'Commission complete.' })).toBeVisible();
    await page.locator('#close-modal').click();
    await page.screenshot({ path: `test-results/level-${level + 1}.png` });
    const won = await state(page);
    await page.reload();
    await ready(page);
    expect(await state(page)).toEqual(won);
    await page.locator('#results').click();
    if (level < LEVELS.length - 1) {
      await page.locator('#next').click();
      expect((await state(page)).level).toBe(level + 1);
    } else {
      await expect(page.getByText('You completed the final commission.')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test('diversion warning, cancellation, failed placement and undo preserve actions', async ({
  page,
}) => {
  await setup(page);
  await action(page, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  const before = await state(page);
  await page.locator('#tool-cutter').click();
  await cell(page, 2, 4);
  await expect(page.locator('.diversion')).toContainText('instead of shipping');
  await page.screenshot({ path: 'test-results/diversion.png' });
  await page.locator('#cancel').click();
  expect(await state(page)).toEqual(before);
  await cell(page, 7, 8);
  await expect(page.locator('#confirm')).toBeDisabled();
  await page.locator('#cancel').click();
  await action(page, { type: 'undo' });
  expect((await state(page)).machines).toHaveLength(0);
  expect((await state(page)).actions).toBe(LEVELS[0].actions);
});
test('reverse composition works through actual UI', async ({ page }) => {
  await setup(page);
  await choose(page, 2);
  const replay = winningReplay(2, 'reverse');
  for (const c of replay.commands) await action(page, c);
  expect((await state(page)).status).toBe('won');
});
test('early-fold scheduling strategy works through actual UI', async ({ page }) => {
  await setup(page);
  await choose(page, 4);
  for (const c of winningReplay(4, 'early-fold').commands) await action(page, c);
  expect((await state(page)).actions).toBe(7);
});
test('pointer cancellation, keyboard placement and settings', async ({ page }) => {
  await setup(page);
  await cell(page, 0, 2);
  await page.locator('canvas').dispatchEvent('pointercancel');
  expect((await state(page)).machines).toHaveLength(0);
  await expect(page.locator('#confirm')).toHaveCount(0);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await ready(page);
  expect((await state(page)).machines).toHaveLength(1);
  await page.locator('#menu').click();
  await page.locator('#muted').uncheck();
  await page.locator('#motion').uncheck();
  await page.locator('#volume').fill('0.25');
  await page.locator('#close-modal').click();
  await page.reload();
  await ready(page);
  await page.locator('#menu').click();
  await expect(page.locator('#muted')).not.toBeChecked();
  await page.locator('#close-modal').click();
});
test('all exact products have named enlarged explanations', async ({ page }) => {
  await setup(page);
  await choose(page, 4);
  await page.locator('[data-product="combined"]').click();
  await expect(
    page.getByText('It needs both a round hole and a clipped corner.', { exact: false })
  ).toBeVisible();
  await page.locator('#close-modal').click();
  await page.locator('#help').click();
  await page.screenshot({ path: 'test-results/help.png' });
  await expect(page.getByRole('heading', { name: 'Small tools. Visible changes.' })).toBeVisible();
});
test('unavailable storage remains playable with visible notice', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Blocked');
    };
    Storage.prototype.getItem = () => {
      throw new Error('Blocked');
    };
  });
  await page.goto('/?mode=tiles&test');
  await ready(page);
  await expect(page.getByText('Resume unavailable — storage is blocked.')).toBeVisible();
  await action(page, { type: 'place', kind: 'punch', x: 0, y: 2, rotation: 0 });
  expect((await state(page)).machines).toHaveLength(1);
});

test('first-level invitation is a free cancellable placement preview', async ({ page }) => {
  await setup(page);
  const before = await state(page);
  await expect(page.locator('#run')).toHaveText('Place a Punch');
  await page.locator('#run').click();
  expect(await state(page)).toEqual(before);
  await expect(page.locator('#confirm')).toHaveText('Place · 1');
  await page.locator('#cancel').click();
  expect(await state(page)).toEqual(before);
  await page.locator('#run').click();
  await page.locator('#confirm').click();
  await ready(page);
  expect((await state(page)).machines).toHaveLength(1);
});
test('drag placement previews before committing; animated production unlocks audio and resumes exactly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.locator('#menu').click();
  await page.locator('#motion').uncheck();
  await page.locator('#muted').uncheck();
  await page.locator('#close-modal').click();
  const box = (await page.locator('canvas').boundingBox())!,
    tray = (await page.locator('#current-piece').boundingBox())!;
  const x = box.x + ((32 + 24) * box.width) / 448,
    y = box.y + ((23 + 2.5 * 48 + 38) * box.height) / 478;
  await page.mouse.move(tray.x + 20, tray.y + 10);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
  expect((await state(page)).machines).toHaveLength(0);
  await expect(page.locator('#confirm')).toBeEnabled();
  await page.locator('#confirm').click();
  await ready(page);
  const before = await state(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.reload();
  await ready(page);
  expect(await state(page)).toEqual(before);
  await action(page, { type: 'run' });
  expect((await state(page)).status).toBe('won');
  const audioState = await page.evaluate(
    () =>
      (window as unknown as { factory: { audio: { context: AudioContext | null } } }).factory.audio
        .context?.state
  );
  expect(audioState).toBe('running');
});

for (const level of [8, 9])
  test(`alternate branch or order in level ${level + 1}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await setup(page);
    await choose(page, level);
    const replay = winningReplay(level, 'reverse');
    for (const c of replay.commands) await action(page, c);
    expect(await state(page)).toEqual(replay.session.state);
  });

test('processed source explains its real tile, and all ten commissions are reachable on phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await setup(page);
  await choose(page, 6);
  await cell(page, -1, 2);
  await expect(page.getByRole('heading', { name: 'Clipped supply' })).toBeVisible();
  await page.locator('#close-modal').click();
  await page.locator('#levels').click();
  await page.locator('#level-9').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/commissions.png' });
  await page.locator('#level-9').click();
  expect((await state(page)).level).toBe(9);
});
