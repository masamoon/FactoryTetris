import {
  BELT_SPACING,
  BELT_SPEED,
  CELL,
  DT,
  HUB_RADIUS,
  ORES,
  type Ore,
  SLOTS,
  TICK_HZ,
  TOW_SECONDS,
} from './config';
import {
  beltEnds,
  byId,
  cellPos,
  dockPos,
  generateRock,
  machinePos,
  type Point,
  type Rock,
  type SimEvent,
  slotVisible,
  socketAngle,
  socketPos,
  type State,
  type Target,
  unlockCost,
  smelterInputsOf,
} from './sim';
import { smelterInputs } from './config';
import {
  CORAL,
  CREAM,
  DEEP,
  drawChunk,
  drawCoin,
  drawDrill,
  drawHop,
  drawHub,
  drawSmelter,
  INK,
  LILAC,
  MINT,
  MUTED,
  NIGHT,
  rrect,
  sprite,
  YELLOW,
  MAGENTA,
} from './sprites';

type Ctx = CanvasRenderingContext2D;

export interface Overlay {
  /** World point under the mining finger. */
  finger: Point | null;
  placing: { kind: 'drill' | 'smelter'; at: Point | null; moving?: number } | null;
  reroute: { id: number; at: Point; target: Target | null } | null;
  selected: number | 'hub' | null;
  /** Screen point of the drill tray button (for the drag hint). */
  trayDrill: Point | null;
  hintHold: boolean;
  hintDrag: boolean;
  reducedMotion: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  ore?: Ore;
  spin: number;
  rot: number;
  ring?: boolean;
}

interface Pop {
  key: string;
  x: number;
  y: number;
  value: number;
  color: string;
  age: number;
  bump: number;
  best: number;
}

const WORLD = { minX: -360, maxX: 360, minY: -1160, maxY: 140 };
const DRILL_W = 30;
const SMELTER_W = 50;
const HUB_W = 100;
const HOP_W = 38;

export class Renderer {
  readonly ctx: Ctx;
  w = 390;
  h = 844;
  dpr = 1;
  insetTop = 84;
  insetBottom = 130;
  cam = { x: 0, y: -150, z: 1.2 };
  pan = { x: 0, y: 0 };
  userZoom = 1;
  revealUntil = 0;
  private shake = 0;
  private hubBounce = 0;
  private time = 0;
  private particles: Particle[] = [];
  private pops: Pop[] = [];
  private rockCache = new Map<number, { key: string; canvas: HTMLCanvasElement; scale: number }>();
  private previewCache = new Map<string, Rock>();
  private smeltGlow = new Map<number, number>();
  private placedAt = new Map<number, number>();
  hop = { x: 60, y: -40, tilt: 0 };
  /** Screen rectangles of the locked-slot price tags drawn this frame (tappable). */
  tags: { slot: number; x: number; y: number; w: number; h: number }[] = [];
  private stars: { x: number; y: number; s: number; d: number; tw: number }[] = [];
  private firstFrame = true;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    let seed = 99;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++)
      this.stars.push({
        x: rnd(),
        y: rnd(),
        s: rnd() > 0.9 ? 2.4 : rnd() > 0.5 ? 1.6 : 1.1,
        d: 0.05 + rnd() * 0.25,
        tw: rnd() * 6,
      });
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, dpr);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  // ------------------------------------------------------------ camera

  private get centerY() {
    return this.insetTop + (this.h - this.insetTop - this.insetBottom) / 2;
  }

  toScreen(p: Point): Point {
    return {
      x: (p.x - this.cam.x) * this.cam.z + this.w / 2,
      y: (p.y - this.cam.y) * this.cam.z + this.centerY,
    };
  }

  toWorld(x: number, y: number): Point {
    return {
      x: (x - this.w / 2) / this.cam.z + this.cam.x,
      y: (y - this.centerY) / this.cam.z + this.cam.y,
    };
  }

  /** Where the camera wants to be for this state. */
  goal(s: State, reveal: boolean) {
    let minX = -80,
      maxX = 80,
      minY = -60,
      maxY = 85;
    const add = (x: number, y: number) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    };
    SLOTS.forEach((d, i) => {
      const ext = d.r * CELL + 44;
      if (s.slots[i].unlocked || (reveal && slotVisible(s, i))) {
        add(d.x - ext, d.y - ext);
        add(d.x + ext, d.y + ext);
      }
      // Locked slots are not framed: their price tags clamp to the screen edge instead.
    });
    for (const m of s.machines) if (m.kind === 'smelter') add(m.x + (m.x > 0 ? 36 : -36), m.y - 30);
    const usableW = this.w - 24,
      usableH = this.h - this.insetTop - this.insetBottom;
    const floor = reveal ? 0.38 : 0.55;
    let z = Math.min(usableW / (maxX - minX), usableH / (maxY - minY), 1.75);
    let cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2;
    if (z < floor) {
      z = floor;
      cy = maxY - usableH / 2 / z;
      if (reveal) cy = (minY + maxY) / 2;
    }
    if (!reveal) {
      z = Math.max(0.42, Math.min(2.4, z * this.userZoom));
      cx += this.pan.x;
      cy += this.pan.y;
    }
    cx = Math.max(WORLD.minX, Math.min(WORLD.maxX, cx));
    cy = Math.max(WORLD.minY, Math.min(WORLD.maxY, cy));
    return { x: cx, y: cy, z };
  }

  panBy(dxScreen: number, dyScreen: number) {
    this.pan.x -= dxScreen / this.cam.z;
    this.pan.y -= dyScreen / this.cam.z;
    this.pan.x = Math.max(-400, Math.min(400, this.pan.x));
    this.pan.y = Math.max(-1200, Math.min(400, this.pan.y));
  }

  resetView() {
    this.pan.x = 0;
    this.pan.y = 0;
    this.userZoom = 1;
  }

  // ------------------------------------------------------------ events

  consume(s: State, events: SimEvent[], reducedMotion: boolean) {
    for (const e of events) {
      if (e.type === 'break') {
        const n = e.by === 'crumble' ? 3 : e.by === 'laser' ? 8 : 5;
        if (e.by === 'laser' && !reducedMotion) this.shake = Math.max(this.shake, 1.6);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2,
            v = 30 + Math.random() * 70;
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: 0,
            max: 0.35 + Math.random() * 0.25,
            size: 1.4 + Math.random() * 1.8,
            color: Math.random() < 0.5 ? ORES[e.ore].color : CREAM,
            spin: (Math.random() - 0.5) * 12,
            rot: Math.random() * 6,
          });
        }
      } else if (e.type === 'deliver') {
        this.hubBounce = Math.min(1, this.hubBounce + (e.bar ? 0.35 : 0.18));
        // One pop stream above the hub: arrivals within a short window add up.
        const color = e.bar ? YELLOW : e.ore === 1 ? CREAM : ORES[e.ore].color;
        const live = this.pops.find((p) => p.age < 0.3);
        if (live) {
          live.value += e.value;
          live.bump = 1;
          if (e.value >= live.best) {
            live.best = e.value;
            live.color = color;
          }
        } else {
          const side = this.pops.length % 2 ? 1 : -1;
          this.pops.push({
            key: 'hub',
            x: side * 18,
            y: -HUB_RADIUS - 6,
            value: e.value,
            color,
            age: 0,
            bump: 1,
            best: e.value,
          });
        }
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 40,
            vy: Math.sin(a) * 40 - 20,
            life: 0,
            max: 0.3,
            size: 1.6,
            color,
            spin: 0,
            rot: 0,
          });
        }
      } else if (e.type === 'crumble') {
        const d = SLOTS[e.slot];
        if (!reducedMotion) this.shake = Math.max(this.shake, 6);
        this.particles.push({
          x: d.x,
          y: d.y,
          vx: 0,
          vy: 0,
          life: 0,
          max: 0.6,
          size: d.r * CELL * 1.2,
          color: CREAM,
          spin: 0,
          rot: 0,
          ring: true,
        });
      } else if (e.type === 'arrive') {
        const d = SLOTS[e.slot];
        if (!reducedMotion) this.shake = Math.max(this.shake, 3);
        this.particles.push({
          x: d.x,
          y: d.y,
          vx: 0,
          vy: 0,
          life: 0,
          max: 0.5,
          size: d.r * CELL * 1.4,
          color: MINT,
          spin: 0,
          rot: 0,
          ring: true,
        });
      } else if (e.type === 'smelt') {
        this.smeltGlow.set(e.id, 1);
        const m = byId(s, e.id);
        if (m) {
          const p = machinePos(m);
          this.particles.push({
            x: p.x + 9,
            y: p.y - 26,
            vx: 6,
            vy: -28,
            life: 0,
            max: 0.9,
            size: 4,
            color: MUTED,
            spin: 0,
            rot: 0,
          });
        }
      } else if (e.type === 'build' || e.type === 'upgrade') {
        this.placedAt.set(e.id, this.time);
        const m = byId(s, e.id);
        if (m) {
          const p = machinePos(m);
          this.particles.push({
            x: p.x,
            y: p.y,
            vx: 0,
            vy: 0,
            life: 0,
            max: 0.45,
            size: 34,
            color: CREAM,
            spin: 0,
            rot: 0,
            ring: true,
          });
        }
      } else if (e.type === 'sell') {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 60,
            vy: Math.sin(a) * 60,
            life: 0,
            max: 0.5,
            size: 2.5,
            color: LILAC,
            spin: 4,
            rot: 0,
          });
        }
      } else if (e.type === 'unlock') {
        this.revealUntil = this.time + 2.2;
        this.resetView();
        const d = SLOTS[e.slot];
        this.particles.push({
          x: d.x,
          y: d.y,
          vx: 0,
          vy: 0,
          life: 0,
          max: 0.8,
          size: d.r * CELL * 1.6,
          color: YELLOW,
          spin: 0,
          rot: 0,
          ring: true,
        });
      } else if (e.type === 'hub') {
        this.hubBounce = 1;
        this.particles.push({
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          life: 0,
          max: 0.5,
          size: 80,
          color: MINT,
          spin: 0,
          rot: 0,
          ring: true,
        });
      }
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  // ------------------------------------------------------------ frame

  draw(s: State, alpha: number, dt: number, o: Overlay) {
    this.time += dt;
    const reveal = this.time < this.revealUntil;
    const g = this.goal(s, reveal);
    const k = this.firstFrame ? 1 : 1 - Math.exp(-dt * (reveal ? 3.2 : 7));
    this.firstFrame = false;
    this.cam.x += (g.x - this.cam.x) * k;
    this.cam.y += (g.y - this.cam.y) * k;
    this.cam.z += (g.z - this.cam.z) * k;
    this.shake *= Math.exp(-dt * 9);
    this.hubBounce *= Math.exp(-dt * 7);
    for (const [id, v] of this.smeltGlow) this.smeltGlow.set(id, v * Math.exp(-dt * 2.5));

    const c = this.ctx;
    const d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.fillStyle = NIGHT;
    c.fillRect(0, 0, this.w, this.h);
    this.drawSky(c);

    const z = this.cam.z;
    const sx = o.reducedMotion ? 0 : (Math.random() - 0.5) * this.shake,
      sy = o.reducedMotion ? 0 : (Math.random() - 0.5) * this.shake;
    c.setTransform(
      d * z,
      0,
      0,
      d * z,
      d * (this.w / 2 - this.cam.x * z + sx),
      d * (this.centerY - this.cam.y * z + sy)
    );

    const tickF = s.tick + alpha;
    this.drawSlots(c, s, tickF);
    this.drawRocks(c, s, tickF);
    this.drawCracks(c, s);
    this.drawArms(c, s);
    this.drawBelts(c, s, alpha, o);
    this.drawHubAndDocks(c, s, o);
    this.drawMachines(c, s, o);
    this.drawFlights(c, s, tickF);
    this.drawParticles(c, dt);
    this.drawHopAndLaser(c, s, dt, o);
    this.drawOverlay(c, s, o);

    c.setTransform(d, 0, 0, d, 0, 0);
    this.drawLockedTags(c, s);
    this.drawPops(c, dt);
    this.drawHints(c, s, o);
  }

  private drawSky(c: Ctx) {
    c.fillStyle = '#261C58';
    c.globalAlpha = 0.55;
    c.beginPath();
    c.arc(
      this.w * 0.85 - this.cam.x * 0.04,
      this.h * 0.3 - this.cam.y * 0.03,
      this.w * 0.55,
      0,
      Math.PI * 2
    );
    c.fill();
    c.fillStyle = '#2C1A5E';
    c.beginPath();
    c.arc(
      this.w * 0.1 - this.cam.x * 0.03,
      this.h * 0.75 - this.cam.y * 0.02,
      this.w * 0.45,
      0,
      Math.PI * 2
    );
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = CREAM;
    for (const st of this.stars) {
      const x = (((st.x * this.w - this.cam.x * st.d) % this.w) + this.w) % this.w;
      const y = (((st.y * this.h - this.cam.y * st.d) % this.h) + this.h) % this.h;
      c.globalAlpha = 0.35 + 0.35 * Math.sin(this.time * 1.3 + st.tw);
      c.fillRect(x, y, st.s, st.s);
    }
    c.globalAlpha = 1;
  }

  private drawSlots(c: Ctx, s: State, tickF: number) {
    const z = this.cam.z;
    SLOTS.forEach((def, i) => {
      const slot = s.slots[i];
      const R = def.r * CELL + 10;
      if (!slot.unlocked) {
        if (!slotVisible(s, i)) return;
        const cost = unlockCost(s, i) ?? 0;
        const can = s.credits >= cost;
        c.save();
        c.setLineDash([10, 9]);
        c.lineDashOffset = -this.time * 8;
        c.lineWidth = 3 / z;
        c.strokeStyle = can ? YELLOW : MUTED;
        c.globalAlpha = can ? 0.7 + 0.3 * Math.sin(this.time * 5) : 0.8;
        c.beginPath();
        c.arc(def.x, def.y, R, 0, Math.PI * 2);
        c.fillStyle = 'rgba(46,37,102,0.45)';
        c.fill();
        c.stroke();
        c.restore();
        return;
      }
      if (!slot.rock) {
        // Waiting for the next rock: a progress ring fills until the tow.
        const wait = (slot.arriveAt - tickF) / TICK_HZ;
        c.save();
        c.lineWidth = 3 / z;
        c.strokeStyle = MUTED;
        c.setLineDash([4, 8]);
        c.beginPath();
        c.arc(def.x, def.y, R, 0, Math.PI * 2);
        c.stroke();
        c.restore();
        if (wait > TOW_SECONDS) {
          const total = 8;
          const p = Math.max(0, Math.min(1, 1 - (wait - TOW_SECONDS) / total));
          c.lineWidth = 5 / z;
          c.strokeStyle = MINT;
          c.lineCap = 'round';
          c.beginPath();
          c.arc(def.x, def.y, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
          c.stroke();
        }
      }
    });
  }

  private rockBitmap(i: number, rock: Rock, gen: number, key: string) {
    const scale = Math.max(0.5, Math.round(this.cam.z * this.dpr * 4) / 4);
    const full = `${key}:${gen}:${rock.remaining}:${scale}`;
    const cached = this.rockCache.get(i);
    if (cached && cached.key === full) return cached;
    const pad = 4;
    const size = rock.w * CELL + pad * 2;
    const canvas = cached?.canvas ?? document.createElement('canvas');
    canvas.width = Math.ceil(size * scale);
    canvas.height = Math.ceil(size * scale);
    const c = canvas.getContext('2d')!;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, size, size);
    c.translate(pad, pad);
    const o = 2.2;
    c.fillStyle = INK;
    for (let k = 0; k < rock.cells.length; k++) {
      if (!rock.cells[k]) continue;
      c.fillRect(
        (k % rock.w) * CELL - o,
        Math.floor(k / rock.w) * CELL - o,
        CELL + 2 * o,
        CELL + 2 * o
      );
    }
    for (let k = 0; k < rock.cells.length; k++) {
      const ore = rock.cells[k] as Ore;
      if (!ore) continue;
      const x = (k % rock.w) * CELL,
        y = Math.floor(k / rock.w) * CELL;
      const alt = ore === 1 && ((k * 2654435761) >>> 0) % 3 === 0;
      c.fillStyle = alt ? '#8A80B8' : ORES[ore].color;
      c.fillRect(x, y, CELL + 0.3, CELL + 0.3);
      c.fillStyle = 'rgba(255,255,255,0.28)';
      c.fillRect(x, y, CELL, 1.5);
      c.fillRect(x, y, 1.5, CELL);
      c.fillStyle = 'rgba(22,16,46,0.26)';
      c.fillRect(x, y + CELL - 1.5, CELL, 1.5);
      c.fillRect(x + CELL - 1.5, y, 1.5, CELL);
      if (ore > 1) {
        c.save();
        c.translate(x + CELL / 2, y + CELL / 2);
        c.globalAlpha = ore === 2 || ore === 5 ? 0.55 : 0.35;
        c.fillStyle = ore === 2 || ore === 5 ? '#FFFFFF' : INK;
        c.beginPath();
        if (ore === 2) c.arc(0, 0, 2.2, 0, Math.PI * 2);
        else if (ore === 3) {
          c.moveTo(0, -2.8);
          c.lineTo(2.6, 2.2);
          c.lineTo(-2.6, 2.2);
        } else if (ore === 4) {
          c.moveTo(0, -3);
          c.lineTo(2.6, 0);
          c.lineTo(0, 3);
          c.lineTo(-2.6, 0);
        } else {
          for (let h = 0; h < 6; h++) {
            const a = (Math.PI / 3) * h;
            if (h) c.lineTo(Math.cos(a) * 2.8, Math.sin(a) * 2.8);
            else c.moveTo(2.8, 0);
          }
        }
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    const entry = { key: full, canvas, scale };
    this.rockCache.set(i, entry);
    return entry;
  }

  private drawRockAt(
    c: Ctx,
    i: number,
    rock: Rock,
    gen: number,
    key: string,
    dx: number,
    dy: number
  ) {
    const def = SLOTS[i];
    const bmp = this.rockBitmap(i, rock, gen, key);
    const pad = 4;
    const size = rock.w * CELL + pad * 2;
    const x = def.x - (rock.r + 1) * CELL - CELL / 2 - pad + dx,
      y = def.y - (rock.r + 1) * CELL - CELL / 2 - pad + dy;
    c.drawImage(bmp.canvas, x, y, size, size);
  }

  private drawRocks(c: Ctx, s: State, tickF: number) {
    SLOTS.forEach((def, i) => {
      const slot = s.slots[i];
      if (!slot.unlocked) return;
      if (slot.rock) {
        let dx = 0,
          dy = 0;
        if (slot.crumble && slot.rock.remaining > 0) {
          dx = (Math.random() - 0.5) * 2.5;
          dy = (Math.random() - 0.5) * 2.5;
        }
        this.drawRockAt(c, i, slot.rock, slot.gen, 'live', dx, dy);
        return;
      }
      const left = slot.arriveAt - tickF;
      const towTicks = TOW_SECONDS * TICK_HZ;
      if (left > towTicks) return;
      const key = `${s.seed}:${i}:${slot.gen}`;
      let next = this.previewCache.get(key);
      if (!next) {
        next = generateRock(i, slot.gen, s.seed);
        this.previewCache.clear();
        this.previewCache.set(key, next);
      }
      const u = Math.max(0, Math.min(1, 1 - left / towTicks));
      const e = 1 - Math.pow(1 - u, 3);
      const side = def.x === 0 ? 1 : Math.sign(def.x);
      const ox = side * 260 * (1 - e),
        oy = -620 * (1 - e);
      c.save();
      c.strokeStyle = MINT;
      c.lineWidth = 3 / this.cam.z;
      c.setLineDash([8, 8]);
      c.lineDashOffset = -this.time * 40;
      c.globalAlpha = 0.8;
      for (const off of [-14, 0, 14]) {
        c.beginPath();
        c.moveTo(def.x + off, def.y + def.r * CELL + 20);
        c.lineTo(def.x + ox + off, def.y + oy);
        c.stroke();
      }
      c.restore();
      this.drawRockAt(c, i, next, slot.gen, 'tow', ox, oy);
    });
  }

  private drawCracks(c: Ctx, s: State) {
    s.slots.forEach((slot, i) => {
      const rock = slot.rock;
      if (!rock) return;
      for (let k = 0; k < rock.work.length; k++) {
        const w = rock.work[k];
        if (w <= 0 || !rock.cells[k]) continue;
        const f = Math.min(1, w / ORES[rock.cells[k] as Ore].hardness);
        const p = cellPos(i, rock, k);
        c.fillStyle = `rgba(22,16,46,${0.15 + f * 0.4})`;
        c.fillRect(p.x - CELL / 2, p.y - CELL / 2, CELL, CELL);
        c.strokeStyle = 'rgba(255,244,224,0.85)';
        c.lineWidth = 0.9;
        c.beginPath();
        c.moveTo(p.x - 3 * f, p.y - 4 * f);
        c.lineTo(p.x + 1, p.y);
        c.lineTo(p.x - 1, p.y + 4 * f);
        c.moveTo(p.x + 1, p.y);
        c.lineTo(p.x + 4 * f, p.y - 1);
        c.stroke();
      }
    });
  }

  private drawArms(c: Ctx, s: State) {
    for (const m of s.machines) {
      if (m.kind !== 'drill' || m.cell < 0) continue;
      const rock = s.slots[m.slot].rock;
      if (!rock || !rock.cells[m.cell]) continue;
      const a = socketPos(m.slot, m.socket);
      const b = cellPos(m.slot, rock, m.cell);
      const jitter = Math.sin(this.time * 60 + m.id) * 0.6;
      c.lineCap = 'round';
      c.strokeStyle = INK;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x + jitter, b.y);
      c.stroke();
      c.strokeStyle = LILAC;
      c.lineWidth = 3.6;
      c.stroke();
      c.save();
      c.setLineDash([2.5, 3.5]);
      c.lineDashOffset = -this.time * 30;
      c.strokeStyle = MUTED;
      c.lineWidth = 3.6;
      c.stroke();
      c.restore();
      // Spinning bit at the face.
      c.save();
      c.translate(b.x + jitter, b.y);
      c.rotate(this.time * 25);
      c.fillStyle = YELLOW;
      c.strokeStyle = INK;
      c.lineWidth = 1.4;
      c.beginPath();
      for (let h = 0; h < 3; h++) {
        const ang = (Math.PI * 2 * h) / 3;
        c.lineTo(Math.cos(ang) * 4.2, Math.sin(ang) * 4.2);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  private drawBelts(c: Ctx, s: State, alpha: number, o: Overlay) {
    for (const m of s.machines) {
      const e = beltEnds(s, m);
      if (!e || !m.out) continue;
      const dx = e.b.x - e.a.x,
        dy = e.b.y - e.a.y;
      const len = Math.hypot(dx, dy) || 1;
      const front = m.out.items[0];
      const jammed = !!front && m.out.to.kind === 'smelter' && front.pos >= m.out.length - 0.5;
      c.lineCap = 'round';
      c.strokeStyle = INK;
      c.lineWidth = 10;
      c.beginPath();
      c.moveTo(e.a.x, e.a.y);
      c.lineTo(e.b.x, e.b.y);
      c.stroke();
      c.strokeStyle = o.reroute?.id === m.id ? '#4A3C9A' : DEEP;
      c.lineWidth = 6;
      c.stroke();
      c.save();
      c.setLineDash([3, 9]);
      c.lineDashOffset = jammed ? 0 : -this.time * BELT_SPEED;
      c.strokeStyle = jammed ? CORAL : MINT;
      c.globalAlpha = jammed ? 0.6 : 0.9;
      c.lineWidth = 2.6;
      c.stroke();
      c.restore();
      const ux = dx / len,
        uy = dy / len;
      let max = m.out.length;
      for (const it of m.out.items) {
        const pos = Math.min(it.pos + BELT_SPEED * DT * alpha, max);
        max = pos - BELT_SPACING;
        const f = pos / m.out.length;
        c.save();
        c.translate(e.a.x + ux * len * f, e.a.y + uy * len * f);
        if (it.bar) {
          c.rotate(Math.atan2(uy, ux));
          // Cheap glow (no shadowBlur): a soft halo in the ore colour.
          c.globalAlpha = 0.35;
          c.fillStyle = ORES[it.ore].color;
          c.beginPath();
          c.arc(0, 0, 8.5, 0, Math.PI * 2);
          c.fill();
          c.globalAlpha = 1;
          drawChunk(c, it.ore, 4.2, true);
        } else {
          c.rotate((it.pos * 0.05) % 6.28);
          drawChunk(c, it.ore, 3.8);
        }
        c.restore();
      }
    }
  }

  private drawHubAndDocks(c: Ctx, s: State, o: Overlay) {
    const px = HUB_W * this.cam.z * this.dpr * (1 + this.hubBounce * 0.08);
    const size = HUB_W * (1 + this.hubBounce * 0.08);
    c.save();
    c.rotate(this.time * 0.15);
    const bmp = sprite('hub', 200, 200, px, (x) => drawHub(x));
    c.drawImage(bmp, -size / 2, -size / 2, size, size);
    c.restore();
    if (o.selected === 'hub') this.selectRing(c, 0, 0, HUB_RADIUS + 16);
    for (let i = 0; i < s.docks; i++) {
      const p = dockPos(i);
      const used = s.machines.some((m) => m.out?.to.kind === 'dock' && m.out.to.index === i);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(Math.atan2(p.y, p.x));
      rrect(c, -6, -6, 12, 12, 3);
      c.fillStyle = used ? MINT : CREAM;
      c.fill();
      c.lineWidth = 2.2;
      c.strokeStyle = INK;
      c.stroke();
      c.restore();
    }
  }

  private selectRing(c: Ctx, x: number, y: number, r: number) {
    c.save();
    c.lineWidth = 3 / this.cam.z;
    c.strokeStyle = CREAM;
    c.setLineDash([6, 6]);
    c.lineDashOffset = -this.time * 20;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  private drawMachines(c: Ctx, s: State, o: Overlay) {
    const zp = this.cam.z * this.dpr;
    for (const m of s.machines) {
      const p = machinePos(m);
      const age = this.time - (this.placedAt.get(m.id) ?? -10);
      const pop = age < 0.35 ? 1 + Math.sin((age / 0.35) * Math.PI) * 0.25 : 1;
      c.save();
      c.translate(p.x, p.y);
      if (m.kind === 'drill') {
        const working = m.cell >= 0;
        if (working)
          c.translate(Math.sin(this.time * 70 + m.id) * 0.5, Math.cos(this.time * 55 + m.id) * 0.5);
        c.rotate(socketAngle(m.slot, m.socket) + Math.PI / 2);
        c.scale(pop, pop);
        const bmp = sprite('drill', 100, 120, DRILL_W * zp * pop, drawDrill);
        c.drawImage(bmp, -DRILL_W / 2, -DRILL_W * 0.6, DRILL_W, DRILL_W * 1.2);
      } else {
        c.scale(pop, pop);
        const heat = this.smeltGlow.get(m.id) ?? 0;
        const busy = m.job ? 1 : 0;
        if (busy || heat > 0.05) {
          c.fillStyle = `rgba(255,210,63,${0.18 + 0.2 * Math.max(heat, busy * (0.5 + 0.5 * Math.sin(this.time * 10)))})`;
          c.beginPath();
          c.arc(0, 4, SMELTER_W * 0.62, 0, Math.PI * 2);
          c.fill();
        }
        const bmp = sprite(busy ? 'smelter-hot' : 'smelter', 140, 140, SMELTER_W * zp * pop, (x) =>
          drawSmelter(x, busy)
        );
        c.drawImage(bmp, -SMELTER_W / 2, -SMELTER_W / 2, SMELTER_W, SMELTER_W);
        // Input capacity pips.
        const used = smelterInputsOf(s, m.id).length,
          cap = smelterInputs(m.level);
        for (let k = 0; k < cap; k++) {
          c.fillStyle = k < used ? MINT : 'rgba(255,244,224,0.35)';
          c.beginPath();
          c.arc(-((cap - 1) * 4) + k * 8, SMELTER_W / 2 + 5, 2.4, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
      if (!m.out) this.badge(c, p.x + 10, p.y - 18);
      if (o.selected === m.id) this.selectRing(c, p.x, p.y, m.kind === 'drill' ? 24 : 34);
    }
  }

  private badge(c: Ctx, x: number, y: number) {
    const k = (1 / Math.max(0.7, this.cam.z)) * (1 + 0.12 * Math.sin(this.time * 8));
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    c.fillStyle = CORAL;
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(0, 0, 8, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-3, -3);
    c.lineTo(3, 3);
    c.moveTo(3, -3);
    c.lineTo(-3, 3);
    c.stroke();
    c.restore();
  }

  private drawFlights(c: Ctx, s: State, tickF: number) {
    for (const f of s.flights) {
      const u = Math.max(0, Math.min(1, (tickF - f.t0) / Math.max(1, f.t1 - f.t0)));
      const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
      const mx = f.x / 2,
        my = f.y / 2;
      const side = (f.x >= 0 ? 1 : -1) * 0.28;
      const cx = mx - f.y * side,
        cy = my + f.x * side;
      const pt = (t: number) => ({
        x: (1 - t) * (1 - t) * f.x + 2 * (1 - t) * t * cx,
        y: (1 - t) * (1 - t) * f.y + 2 * (1 - t) * t * cy,
      });
      const p = pt(e);
      const trail = pt(Math.max(0, e - 0.12));
      c.strokeStyle = ORES[f.ore].color;
      c.globalAlpha = 0.45;
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(trail.x, trail.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.globalAlpha = 1;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(u * 9 + f.t0);
      drawChunk(c, f.ore, 4.6 - u * 1.2);
      c.restore();
    }
  }

  private drawParticles(c: Ctx, dt: number) {
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.max) continue;
      keep.push(p);
      const t = p.life / p.max;
      if (p.ring) {
        c.globalAlpha = 1 - t;
        c.strokeStyle = p.color;
        c.lineWidth = 4 * (1 - t) + 1;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (0.4 + 0.6 * (1 - Math.pow(1 - t, 3))), 0, Math.PI * 2);
        c.stroke();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-dt * 4);
      p.vy *= Math.exp(-dt * 4);
      p.rot += p.spin * dt;
      c.globalAlpha = 1 - t * t;
      c.fillStyle = p.color;
      const sz = p.size * (1 - t * 0.5);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillRect(-sz / 2, -sz / 2, sz, sz);
      c.restore();
    }
    c.globalAlpha = 1;
    this.particles = keep;
  }

  private drawHopAndLaser(c: Ctx, s: State, dt: number, o: Overlay) {
    const z = this.cam.z;
    let tx: number, ty: number;
    if (o.finger) {
      tx = o.finger.x + 16 / z;
      ty = o.finger.y - 74 / z;
    } else {
      tx = 70;
      ty = -58 + Math.sin(this.time * 2) * 5;
    }
    const k = 1 - Math.exp(-dt * (o.finger ? 14 : 3));
    const vx = (tx - this.hop.x) * k;
    this.hop.x += vx;
    this.hop.y += (ty - this.hop.y) * k;
    this.hop.tilt +=
      (Math.max(-0.5, Math.min(0.5, vx * 0.08)) - this.hop.tilt) * Math.min(1, dt * 10);
    const L = s.laser;
    const rock = L ? s.slots[L.slot].rock : null;
    const firing = !!(L && rock && L.cell >= 0 && rock.cells[L.cell]);
    if (firing) {
      const t = cellPos(L!.slot, rock!, L!.cell);
      const from = { x: this.hop.x, y: this.hop.y + 8 };
      const wob = 1 + 0.25 * Math.sin(this.time * 50);
      c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,91,216,0.35)';
      c.lineWidth = 11 * wob;
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.lineTo(t.x, t.y);
      c.stroke();
      c.strokeStyle = MAGENTA;
      c.lineWidth = 5.5 * wob;
      c.stroke();
      c.strokeStyle = CREAM;
      c.lineWidth = 2.2;
      c.stroke();
      c.fillStyle = CREAM;
      c.beginPath();
      c.arc(t.x, t.y, 4.5 * wob, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,91,216,0.35)';
      c.beginPath();
      c.arc(t.x, t.y, 9 * wob, 0, Math.PI * 2);
      c.fill();
      if (Math.random() < 0.5)
        this.particles.push({
          x: t.x,
          y: t.y,
          vx: (Math.random() - 0.5) * 90,
          vy: (Math.random() - 0.5) * 90,
          life: 0,
          max: 0.2,
          size: 1.3,
          color: YELLOW,
          spin: 0,
          rot: 0,
        });
    }
    c.save();
    c.translate(this.hop.x + (firing ? (Math.random() - 0.5) * 0.8 : 0), this.hop.y);
    c.rotate(this.hop.tilt);
    const bmp = sprite(firing ? 'hop-fire' : 'hop', 160, 160, HOP_W * z * this.dpr, (x) =>
      drawHop(x, firing ? 1 : 0.6)
    );
    c.drawImage(bmp, -HOP_W / 2, -HOP_W / 2, HOP_W, HOP_W);
    c.restore();
  }

  private drawOverlay(c: Ctx, s: State, o: Overlay) {
    const z = this.cam.z;
    if (o.placing) {
      if (o.placing.kind === 'drill') {
        // Every free socket glows; the snapped one gets the ghost.
        SLOTS.forEach((def, i) => {
          if (!s.slots[i].unlocked) return;
          for (let k = 0; k < def.sockets; k++) {
            if (
              s.machines.some(
                (m) =>
                  m.kind === 'drill' && m.id !== o.placing!.moving && m.slot === i && m.socket === k
              )
            )
              continue;
            const p = socketPos(i, k);
            c.fillStyle = 'rgba(60,240,168,0.25)';
            c.strokeStyle = MINT;
            c.lineWidth = 2.5 / z;
            c.beginPath();
            c.arc(p.x, p.y, 11 + Math.sin(this.time * 6) * 1.5, 0, Math.PI * 2);
            c.fill();
            c.stroke();
          }
        });
      }
      const at = o.placing.at;
      if (at) {
        c.save();
        c.globalAlpha = 0.75;
        c.translate(at.x, at.y);
        if (o.placing.kind === 'drill' && 'angle' in at)
          c.rotate((at as Point & { angle: number }).angle);
        const bmp =
          o.placing.kind === 'drill'
            ? sprite('drill', 100, 120, DRILL_W * z * this.dpr, drawDrill)
            : sprite('smelter', 140, 140, SMELTER_W * z * this.dpr, (x) => drawSmelter(x));
        const W = o.placing.kind === 'drill' ? DRILL_W : SMELTER_W;
        const H = o.placing.kind === 'drill' ? DRILL_W * 1.2 : SMELTER_W;
        c.drawImage(bmp, -W / 2, o.placing.kind === 'drill' ? -W * 0.6 : -H / 2, W, H);
        c.restore();
        const ok = (at as Point & { ok?: boolean }).ok !== false;
        c.strokeStyle = ok ? MINT : CORAL;
        c.lineWidth = 3 / z;
        c.beginPath();
        c.arc(
          at.x,
          at.y,
          (o.placing.kind === 'drill' ? 20 : 32) + Math.sin(this.time * 8) * 2,
          0,
          Math.PI * 2
        );
        c.stroke();
      }
    }
    if (o.reroute) {
      const m = byId(s, o.reroute.id);
      if (m) {
        const a = machinePos(m);
        // Valid targets pulse.
        for (let i = 0; i < s.docks; i++) {
          if (s.machines.some((x) => x !== m && x.out?.to.kind === 'dock' && x.out.to.index === i))
            continue;
          const p = dockPos(i);
          this.targetRing(c, p.x, p.y, 11);
        }
        if (m.kind === 'drill')
          for (const sm of s.machines) {
            if (sm.kind !== 'smelter') continue;
            const inputs = smelterInputsOf(s, sm.id).filter((x) => x !== m).length;
            if (inputs < smelterInputs(sm.level)) this.targetRing(c, sm.x, sm.y, 32);
          }
        const b = o.reroute.target ? this.targetPoint(s, o.reroute.target) : o.reroute.at;
        c.save();
        c.setLineDash([7, 6]);
        c.lineDashOffset = -this.time * 40;
        c.strokeStyle = o.reroute.target ? MINT : CREAM;
        c.lineWidth = 4 / z;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
        c.restore();
      }
    }
  }

  private targetPoint(s: State, t: Target): Point {
    if (t.kind === 'dock') return dockPos(t.index);
    const m = byId(s, t.id);
    return m ? machinePos(m) : { x: 0, y: 0 };
  }

  private targetRing(c: Ctx, x: number, y: number, r: number) {
    c.strokeStyle = MINT;
    c.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 7);
    c.lineWidth = 3 / this.cam.z;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }

  private drawLockedTags(c: Ctx, s: State) {
    this.tags = [];
    SLOTS.forEach((def, i) => {
      if (s.slots[i].unlocked || !slotVisible(s, i)) return;
      const cost = unlockCost(s, i) ?? 0;
      const p = this.toScreen({ x: def.x, y: def.y });
      const can = s.credits >= cost;
      const text = formatNumber(cost);
      c.font = '20px "Lilita One", sans-serif';
      const tw = c.measureText(text).width;
      const w = tw + 40,
        h = 32;
      p.x = Math.max(w / 2 + 8, Math.min(this.w - w / 2 - 8, p.x));
      p.y = Math.max(this.insetTop + h, Math.min(this.h - this.insetBottom - h, p.y));
      this.tags.push({ slot: i, x: p.x - w / 2 - 6, y: p.y - h / 2 - 6, w: w + 12, h: h + 24 });
      c.save();
      c.translate(p.x, p.y);
      if (can) c.scale(1 + 0.06 * Math.sin(this.time * 6), 1 + 0.06 * Math.sin(this.time * 6));
      rrect(c, -w / 2, -h / 2, w, h, h / 2);
      c.fillStyle = INK;
      c.fill();
      c.lineWidth = 2.5;
      c.strokeStyle = can ? YELLOW : '#3F3480';
      c.stroke();
      c.save();
      c.translate(-w / 2 + 16, 0);
      drawCoin(c, 8);
      c.restore();
      c.fillStyle = can ? YELLOW : LILAC;
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(text, -w / 2 + 28, 1);
      // Ore signature chip.
      c.save();
      c.translate(0, h / 2 + 12);
      drawChunk(c, def.signature, 5);
      c.restore();
      c.restore();
    });
  }

  private drawPops(c: Ctx, dt: number) {
    const keep: Pop[] = [];
    for (const p of this.pops) {
      p.age += dt;
      p.bump *= Math.exp(-dt * 10);
      if (p.age > 1) continue;
      keep.push(p);
      const sp = this.toScreen({ x: p.x, y: p.y });
      const size = Math.min(40, 18 + Math.log10(p.value + 1) * 9) * (1 + p.bump * 0.25);
      const y = sp.y - 10 - p.age * 70;
      c.globalAlpha = p.age > 0.6 ? 1 - (p.age - 0.6) / 0.3 : 1;
      c.font = `${Math.round(size)}px "Lilita One", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.lineJoin = 'round';
      c.lineWidth = Math.max(4, size * 0.2);
      c.strokeStyle = INK;
      const text = `+${formatNumber(p.value)}`;
      c.strokeText(text, sp.x, y + 3);
      c.strokeText(text, sp.x, y);
      c.fillStyle = p.color;
      c.fillText(text, sp.x, y);
    }
    c.globalAlpha = 1;
    this.pops = keep.slice(-6);
  }

  private drawHints(c: Ctx, s: State, o: Overlay) {
    if (o.hintHold && s.slots[0].rock) {
      const p = this.toScreen({ x: SLOTS[0].x + 14, y: SLOTS[0].y + 18 });
      const t = (this.time % 1.6) / 1.6;
      c.strokeStyle = CREAM;
      c.globalAlpha = 1 - t;
      c.lineWidth = 4;
      c.beginPath();
      c.arc(p.x, p.y, 16 + t * 34, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
      drawHand(c, p.x, p.y + 4 * Math.sin(this.time * 4), 1);
      label(c, 'HOLD', p.x + 12, p.y + 86);
    }
    if (o.hintDrag && o.trayDrill) {
      const t = (this.time % 2) / 2;
      const target = this.toScreen(socketPos(0, 0));
      const e = t < 0.15 ? 0 : t > 0.75 ? 1 : (t - 0.15) / 0.6;
      const ee = e * e * (3 - 2 * e);
      const x = o.trayDrill.x + (target.x - o.trayDrill.x) * ee,
        y = o.trayDrill.y + (target.y - o.trayDrill.y) * ee;
      c.globalAlpha = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
      const bmp = sprite('drill', 100, 120, 40 * this.dpr, drawDrill);
      c.save();
      c.translate(x, y - 30);
      c.rotate(Math.PI);
      c.drawImage(bmp, -17, -20, 34, 41);
      c.restore();
      drawHand(c, x, y, 1);
      c.globalAlpha = 1;
    }
  }
}

function drawHand(c: Ctx, x: number, y: number, k: number) {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.rotate(-0.35);
  c.lineWidth = 4;
  c.strokeStyle = INK;
  c.fillStyle = CREAM;
  rrect(c, -7, -2, 14, 34, 7);
  c.fill();
  c.stroke();
  rrect(c, -15, 22, 34, 30, 12);
  c.fill();
  c.stroke();
  rrect(c, -22, 26, 12, 18, 6);
  c.fill();
  c.stroke();
  c.restore();
}

function label(c: Ctx, text: string, x: number, y: number) {
  c.font = '20px "Lilita One", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 6;
  c.strokeStyle = INK;
  c.strokeText(text, x, y);
  c.fillStyle = CREAM;
  c.fillText(text, x, y);
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T'];
  let v = n,
    u = -1;
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000;
    u++;
  }
  return `${v >= 100 ? Math.floor(v) : v >= 10 ? (Math.floor(v * 10) / 10).toString() : (Math.floor(v * 100) / 100).toString()}${units[u]}`;
}
