/**
 * 390 px screenshots of slow-burn rocks from bot-developed saves (disclosed: the bot plays, the
 * page renders its save). Needs the dev server: `npm start`, then
 *
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx tools/rockhopper-slow-rocks-shots.ts
 */
import { chromium } from '@playwright/test';
import { serialize } from '../src/rockhopper/save';
import { runBot } from './rockhopper-bot';

const OUT = 'docs/reviews/evidence';
const shots: { name: string; seed: number; seconds: number; sector: boolean; zoomTo?: number }[] = [
  { name: 'slow-rocks-0130', seed: 1, seconds: 90, sector: false },
  { name: 'slow-rocks-0600', seed: 1, seconds: 360, sector: false },
  { name: 'slow-rocks-1500-sector', seed: 4, seconds: 900, sector: true },
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const shot of shots) {
    const { state } = runBot({
      minutes: shot.seconds / 60,
      laser: true,
      seed: shot.seed,
      sector: shot.sector,
      slowRocks: true,
    });
    const text = serialize(state);
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.addInitScript((t) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('rockhopper.save.v3', t);
    }, text);
    await page.goto('http://localhost:8084/');
    await page.waitForFunction(
      () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
    );
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/2026-10-01-${shot.name}-390.png` });
    console.log(`${shot.name}: ${state.machines.length} machines, earned ${state.earned}`);
    await ctx.close();
  }
  await browser.close();
})();
