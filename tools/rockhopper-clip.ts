/**
 * Records segment A of the Rockhopper clip: real time, fresh save, scripted touch input.
 * Requires the dev server (npm start). Writes a webm plus stills to docs/reviews/evidence/.
 *
 *   npx tsx tools/rockhopper-clip.ts [outDir]
 *
 * Disclosure: inputs are scripted (faster and more precise than a new player). Nothing is cut
 * or sped up; the simulation runs at its normal 30 Hz.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] ?? 'docs/reviews/evidence';
const url = process.env.ROCKHOPPER_URL ?? 'http://localhost:8084/?fresh';

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    recordVideo: { dir: out, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  await page.goto(url);
  await page.waitForFunction(
    () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
  );
  await page.waitForTimeout(600);
  const t0 = Date.now();
  const log: string[] = [];
  const note = async (what: string) => {
    const s = await page.evaluate(() => {
      const a = (
        window as unknown as {
          __rockhopper: { state: { tick: number; credits: number; machines: unknown[] } };
        }
      ).__rockhopper;
      return { tick: a.state.tick, credits: a.state.credits, machines: a.state.machines.length };
    });
    log.push(
      `${((Date.now() - t0) / 1000).toFixed(1)}s  tick ${s.tick}  credits ${s.credits}  machines ${s.machines}  ${what}`
    );
  };
  const screen = (x: number, y: number) =>
    page.evaluate(
      ([x, y]) =>
        (
          window as unknown as {
            __rockhopper: {
              renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
            };
          }
        ).__rockhopper.renderer.toScreen({ x, y }),
      [x, y]
    );
  await note('start (fresh save)');
  // 0–5 s: hold the rock and sweep slowly.
  const rock = await screen(0, -230);
  await page.mouse.move(rock.x + 18, rock.y + 34);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(rock.x + 18 - i * 0.9, rock.y + 34 - i * 0.6);
    await page.waitForTimeout(100);
  }
  await page.mouse.up();
  await note('released after hand mining');
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-04s.png') });
  // 5–10 s: drag the drill from the tray onto the rock.
  const btn = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  const sock = await screen(0, -230 + 78);
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.mouse.move(sock.x, sock.y + 30, { steps: 14 });
  await page.mouse.up();
  await note('drill dropped');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-07s.png') });
  await page.waitForTimeout(3500);
  await note('hands off');
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-10s.png') });
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) renameSync(await video.path(), path.join(out, 'rockhopper-clip-segment-a.webm'));
  console.log(log.join('\n'));
}

void main();
