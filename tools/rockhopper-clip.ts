/**
 * Records segment A of the Rockhopper clip: real time, fresh save, scripted touch input.
 * Requires the dev server (npm start). Writes a webm, stills, a command log and a log of
 * ticks to the output directory, then replays the command log headlessly and checks that it
 * reproduces the captured state exactly (the uncut witness).
 *
 *   npx tsx tools/rockhopper-clip.ts [outDir]
 *
 * Disclosure: inputs are scripted (faster and more precise than a new player) and sent as real
 * touch events. The page runs in capture mode (?clip), which draws a dot under each real touch
 * and hides the tutorial hands. Nothing is cut or sped up; the simulation runs at 30 Hz.
 */
import { chromium, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TICK_HZ } from '../src/rockhopper/config';
import { replay, type LoggedCommand } from '../src/rockhopper/sim';
import { serialize } from '../src/rockhopper/save';
import type { State } from '../src/rockhopper/sim';

const out = process.argv[2] ?? 'docs/reviews/evidence';
const url = process.env.ROCKHOPPER_URL ?? 'http://localhost:8084/?fresh&clip&seed=1';

type Hook = {
  state: State;
  commandLog: LoggedCommand[];
  renderer: { toScreen(p: { x: number; y: number }): { x: number; y: number } };
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  x: number,
  y: number
) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }],
  });
}

/** Move a held touch from a to b over `ms` of wall time (dispatch latency is absorbed). */
async function glide(
  cdp: CDPSession,
  a: { x: number; y: number },
  b: { x: number; y: number },
  ms: number
) {
  const start = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - start) / ms);
    const e = t * t * (3 - 2 * t);
    await touch(cdp, 'touchMove', a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
    if (t >= 1) return;
    await wait(8);
  }
}

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: out, size: { width: 390, height: 844 } },
  });
  const page: Page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(url);
  await page.waitForFunction(
    () => !!(window as unknown as { __rockhopper?: unknown }).__rockhopper
  );
  await wait(600);
  const hook = () =>
    page.evaluate(() => {
      const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
      return { tick: a.state.tick, credits: a.state.credits, machines: a.state.machines.length };
    });
  const screen = (x: number, y: number) =>
    page.evaluate(
      ([x, y]) =>
        (window as unknown as { __rockhopper: Hook }).__rockhopper.renderer.toScreen({ x, y }),
      [x, y]
    );
  const t0 = Date.now();
  const tick0 = (await hook()).tick;
  const log: string[] = [];
  const note = async (what: string) => {
    const s = await hook();
    const wall = (Date.now() - t0) / 1000;
    const sim = (s.tick - tick0) / TICK_HZ;
    log.push(
      `${wall.toFixed(2)}s wall  tick ${s.tick} (${sim.toFixed(2)}s sim)  credits ${s.credits}  machines ${s.machines}  ${what}`
    );
  };
  await note('start (fresh save)');

  // 0–5 s: hold the rock and sweep slowly across it.
  const rock = await screen(0, -230);
  const a = { x: rock.x + 18, y: rock.y + 34 };
  await touch(cdp, 'touchStart', a.x, a.y);
  await note('touch down on the rock');
  await glide(cdp, a, { x: rock.x - 20, y: rock.y + 10 }, 4200);
  await touch(cdp, 'touchEnd', 0, 0);
  await note('lifted after hand mining');
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-04s.png') });

  // 5–10 s: drag the drill from the tray onto the rock, slowly enough to follow.
  const btn = (await page.locator('.rh-tool[data-kind=drill]').boundingBox())!;
  const sock = await screen(0, -230 + 78);
  const from = { x: btn.x + btn.width / 2, y: btn.y + btn.height / 2 };
  await touch(cdp, 'touchStart', from.x, from.y);
  await wait(120);
  await glide(cdp, from, { x: sock.x, y: sock.y + 30 }, 850);
  await wait(150);
  await touch(cdp, 'touchEnd', 0, 0);
  await note('drill dropped');
  await wait(1500);
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-07s.png') });
  await wait(3300);
  await note('hands off');
  await page.screenshot({ path: path.join(out, 'rockhopper-clip-10s.png') });

  // Witness: capture the command log and state atomically, then replay it headlessly.
  const final = await page.evaluate(() => {
    const a = (window as unknown as { __rockhopper: Hook }).__rockhopper;
    return { state: JSON.parse(JSON.stringify(a.state)) as State, log: a.commandLog };
  });
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) renameSync(await video.path(), path.join(out, 'rockhopper-clip-segment-a.webm'));
  final.state.events = [];
  const again = replay(final.state.seed, final.log, final.state.tick);
  const same = serialize(again) === serialize(final.state);
  const wall = (Date.now() - t0) / 1000;
  log.push(
    `witness replay of ${final.log.length} commands to tick ${final.state.tick}: ${same ? 'IDENTICAL' : 'DIFFERENT'}`
  );
  writeFileSync(
    path.join(out, 'rockhopper-clip-segment-a.commands.json'),
    JSON.stringify(final.log)
  );
  writeFileSync(path.join(out, 'rockhopper-clip-segment-a.log.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
  console.log(`(wall clock including teardown ${wall.toFixed(1)} s)`);
  if (!same) process.exitCode = 1;
}

void main();
