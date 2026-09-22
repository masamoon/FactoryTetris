import Phaser from 'phaser';
import {
  WORLD_W,
  WORLD_H,
  DOCK,
  tileAt,
  hardness,
  tileYield,
  type State,
  type Point,
  type Tool,
  type Direction,
  type Event,
  type Resource,
  type Machine,
  DELTAS,
} from './simulation';
import { extendBeltPath } from './beltPath';

export interface SceneModel {
  state: State;
  mode: string;
  paused: boolean;
  reduced: boolean;
  preview: (Point & { kind: Tool; direction: Direction; valid: boolean }) | null;
  beltPreview: (Point & { direction: Direction; valid: boolean })[];
  selected: Point | null;
  transferTargets: Point[];
}
const palette = { ore: 0xeac481, plate: 0x82dccc, part: 0xcbadff };
export class AsteroidScene extends Phaser.Scene {
  onTap: (p: Point) => void = () => {};
  onHold: (p: Point | null) => void = () => {};
  onPan: () => void = () => {};
  onBeltDrag: (path: Point[] | null, commit: boolean) => void = () => {};
  model: SceneModel | null = null;
  private art!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private effects: { event: Event; born: number }[] = [];
  private pan = 0;
  private panY = 0;
  private layoutHeight = 0;
  private explored = false;
  private down: {
    x: number;
    y: number;
    pan: number;
    panY: number;
    moved: boolean;
    cell: Point;
    time: number;
  } | null = null;
  private activePointer: number | null = null;
  private beltPath: Point[] | null = null;
  cell = 38;
  top = 30;
  constructor() {
    super('Asteroid');
  }
  create() {
    this.art = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.activePointer !== null) {
        if (this.model?.mode === 'belt') this.cancelPointer();
        return;
      }
      this.activePointer = p.id;
      const cell = this.point(p.x, p.y);
      this.down = {
        x: p.x,
        y: p.y,
        pan: this.pan,
        panY: this.panY,
        moved: false,
        cell,
        time: this.time.now,
      };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.down || p.id !== this.activePointer) return;
      if (Math.abs(p.x - this.down.x) + Math.abs(p.y - this.down.y) > 9) {
        this.down.moved = true;
        this.explored = true;
        this.onHold(null);
        if (this.model?.mode === 'belt') {
          this.beltPath = extendBeltPath(this.beltPath || [this.down.cell], this.point(p.x, p.y));
          this.onBeltDrag(this.beltPath, false);
        } else {
          this.pan = this.clampPan(this.down.pan - (p.x - this.down.x));
          this.panY = this.clampPanY(this.down.panY - (p.y - this.down.y));
        }
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.activePointer) return;
      if (this.down?.moved && this.model?.mode === 'belt' && this.beltPath) {
        const path = extendBeltPath(this.beltPath, this.point(p.x, p.y));
        this.down = null;
        this.beltPath = null;
        this.activePointer = null;
        this.onHold(null);
        this.onBeltDrag(path, true);
        return;
      }
      if (
        this.down &&
        !this.down.moved &&
        (this.time.now - this.down.time < 180 || this.model?.mode === 'belt')
      )
        this.onTap(this.down.cell);
      else if (this.down?.moved) this.onPan();
      this.cancelPointer();
    });
    this.input.on('pointerupoutside', () => this.cancelPointer());
    this.game.canvas.addEventListener('pointercancel', () => this.cancelPointer());
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.scale.on('resize', () => this.layout());
    this.layout();
  }
  cancelPointer() {
    this.down = null;
    this.beltPath = null;
    this.activePointer = null;
    this.onHold(null);
    this.onBeltDrag(null, false);
  }
  private layout() {
    const center =
      this.layoutHeight && this.explored
        ? (this.panY + this.layoutHeight / 2 - this.top) / this.cell
        : 6.5;
    this.cell = Math.max(26, Math.min(48, (this.scale.height - 48) / WORLD_H));
    this.top = Math.max(18, (this.scale.height - WORLD_H * this.cell) / 2);
    this.pan = this.clampPan(this.pan);
    this.panY = this.clampPanY(this.top + center * this.cell - this.scale.height / 2);
    this.layoutHeight = this.scale.height;
  }
  private clampPanY(value: number) {
    return Phaser.Math.Clamp(
      value,
      0,
      Math.max(0, WORLD_H * this.cell + this.top * 2 - this.scale.height)
    );
  }
  private clampPan(value: number) {
    return Phaser.Math.Clamp(value, 0, Math.max(0, WORLD_W * this.cell - this.scale.width + 22));
  }
  panBy(cells: number) {
    this.pan = this.clampPan(this.pan + cells * this.cell);
    this.cancelPointer();
  }
  focus(x = 3, y = 6) {
    this.explored = false;
    this.pan = this.clampPan(x * this.cell - this.scale.width * 0.4);
    this.panY = this.clampPanY(this.top + (y + 0.5) * this.cell - this.scale.height / 2);
    this.cancelPointer();
  }
  point(x: number, y: number): Point {
    return {
      x: Math.floor((x + this.pan) / this.cell),
      y: Math.floor((y + this.panY - this.top) / this.cell),
    };
  }
  screen(p: Point) {
    return {
      x: (p.x + 0.5) * this.cell - this.pan,
      y: this.top + (p.y + 0.5) * this.cell - this.panY,
    };
  }
  setModel(model: SceneModel) {
    this.model = model;
  }
  emit(events: Event[]) {
    for (const event of events) this.effects.push({ event, born: this.time.now });
  }
  private text(x: number, y: number, text: string, size = 11, color = '#94a6b5', origin = 0.5) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: size + 'px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(origin, 0.5);
    this.labels.push(label);
  }
  private item(g: Phaser.GameObjects.Graphics, r: Resource, x: number, y: number, size = 5) {
    g.fillStyle(palette[r]);
    if (r === 'ore') {
      g.fillTriangle(
        x - size,
        y + size * 0.7,
        x - size * 0.7,
        y - size * 0.7,
        x + size,
        y - size * 0.35
      );
      g.fillTriangle(x - size, y + size * 0.7, x + size, y - size * 0.35, x + size * 0.6, y + size);
    } else if (r === 'plate') {
      g.fillRoundedRect(x - size, y - size * 0.55, size * 2, size * 1.1, 2);
      g.lineStyle(1, 0xd8fff4, 0.8);
      g.lineBetween(x - size + 1, y - 1, x + size - 1, y - 1);
    } else {
      g.fillRoundedRect(x - size, y - size, size * 2, size * 2, 2);
      g.fillStyle(0x211e39);
      g.fillCircle(x, y, size * 0.4);
    }
  }
  private arrow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    direction: Direction,
    size = 4,
    color = 0x98c5d1
  ) {
    const d = DELTAS[direction];
    g.fillStyle(color);
    g.fillTriangle(
      x + d.x * size,
      y + d.y * size,
      x - d.x * size - d.y * size,
      y - d.y * size + d.x * size,
      x - d.x * size + d.y * size,
      y - d.y * size - d.x * size
    );
  }
  update() {
    if (!this.art || !this.model) return;
    if (this.down && !this.down.moved && this.time.now - this.down.time >= 180) {
      if (this.model.mode === 'mine' && tileAt(this.model.state, this.down.cell))
        this.onHold(this.down.cell);
      else if (this.model.mode !== 'belt') {
        this.onTap(this.down.cell);
        this.down = null;
      }
    }
    this.draw();
  }
  private draw() {
    const model = this.model!,
      s = model.state,
      g = this.art,
      c = this.cell,
      t = model.reduced ? 0 : model.paused ? s.tick * 100 : this.time.now;
    g.clear();
    this.labels.forEach((l) => l.destroy());
    this.labels = [];
    g.fillStyle(0x080f1b);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    for (let i = 0; i < 70; i++) {
      const x =
          (((i * 127.3 - this.pan * 0.12) % (this.scale.width + 40)) + this.scale.width + 40) %
          (this.scale.width + 40),
        y = (i * 71.9) % this.scale.height;
      g.fillStyle(i % 8 ? 0x658197 : 0xcce3e2, i % 8 ? 0.35 : 0.6);
      g.fillCircle(x, y, i % 8 ? 0.8 : 1.4);
    }
    const planetX = this.scale.width * 0.77 - this.pan * 0.08;
    g.fillStyle(0x122738, 0.65);
    g.fillCircle(planetX, this.top + 24, 53);
    g.fillStyle(0x080f1b);
    g.fillCircle(planetX - 16, this.top + 11, 49);
    const startX = Math.max(0, Math.floor(this.pan / c) - 1),
      endX = Math.min(WORLD_W, Math.ceil((this.pan + this.scale.width) / c) + 1);
    for (let y = 0; y < WORLD_H; y++)
      for (let x = startX; x < endX; x++) {
        const p = this.screen({ x, y }),
          tile = tileAt(s, { x, y });
        if (tile) {
          const shade = (x * 13 + y * 7) % 3;
          g.fillStyle([0x39404b, 0x414653, 0x363d48][shade]);
          g.fillRoundedRect(p.x - c / 2 + 1, p.y - c / 2 + 1, c - 2, c - 2, 3);
          g.fillStyle(0x59616a, 0.65);
          g.fillRect(p.x - c / 2 + 3, p.y - c / 2 + 2, c - 6, 2);
          g.lineStyle(1, 0x222b38, 0.8);
          g.lineBetween(p.x - c * 0.23, p.y - c * 0.08, p.x + c * 0.17, p.y + c * 0.26);
          if (tile.kind === 'ore') {
            for (let k = 0; k < 3; k++)
              this.item(
                g,
                'ore',
                p.x + (k - 1) * c * 0.19,
                p.y + (k % 2 ? -0.12 : 0.14) * c,
                c * 0.105
              );
          } else {
            g.fillStyle(0x8f958e, 0.45);
            g.fillCircle(p.x + c * 0.2, p.y - c * 0.19, c * 0.045);
          }
          if (tile.work) {
            g.lineStyle(2, 0xf8dfa5);
            g.lineBetween(p.x - c * 0.25, p.y - c * 0.28, p.x + 1, p.y - 1);
            g.lineBetween(p.x + 1, p.y - 1, p.x - c * 0.13, p.y + c * 0.3);
            g.fillStyle(0xf6c574);
            g.fillRect(
              p.x - c * 0.36,
              p.y + c * 0.32,
              c * 0.72 * Math.min(1, tile.work / hardness(tile)),
              3
            );
          }
        } else {
          const artificial = x < 8 && y >= 3 && y <= 9;
          if (artificial) {
            g.fillStyle(0x102333, 0.72);
            g.fillRect(p.x - c / 2 + 1, p.y - c / 2 + 1, c - 2, c - 2);
            g.fillStyle(0x314b5b, 0.6);
            g.fillCircle(p.x - c * 0.35, p.y - c * 0.35, 1);
          } else if (x >= 8) {
            g.fillStyle(0x1b2431, 0.85);
            g.fillRect(p.x - c / 2, p.y - c / 2, c, c);
            g.lineStyle(1, 0x35414b, 0.4);
            g.lineBetween(p.x - c / 2, p.y + c * 0.45, p.x + c / 2, p.y + c * 0.45);
          }
        }
      }
    // Landing gantry and dock, both fixed in world coordinates.
    const platformA = this.screen({ x: 0, y: 9 }),
      platformB = this.screen({ x: 7, y: 9 });
    g.fillStyle(0x31424f);
    g.fillRoundedRect(
      platformA.x - c / 2,
      platformA.y + c * 0.38,
      platformB.x - platformA.x + c,
      c * 0.22,
      3
    );
    for (let x = 0; x < 8; x++) {
      const p = this.screen({ x, y: 9 });
      g.fillStyle(0xe2b974, 0.65);
      g.fillRect(p.x - 5, p.y + c * 0.4, 10, 3);
    }
    const dock = this.screen(DOCK);
    g.fillStyle(0x24454c);
    g.fillRoundedRect(dock.x - c * 0.48, dock.y - c * 0.43, c * 0.96, c * 0.86, 5);
    g.lineStyle(2, 0x82dccc);
    g.strokeRoundedRect(dock.x - c * 0.44, dock.y - c * 0.39, c * 0.88, c * 0.78, 4);
    g.fillStyle(0x0a202a);
    g.fillRect(dock.x - c * 0.3, dock.y - c * 0.2, c * 0.6, c * 0.4);
    this.arrow(g, dock.x, dock.y, 2, c * 0.15, 0x82dccc);
    this.text(dock.x, dock.y + c * 0.7, 'COLLECTION', 9, '#8ddbc9');
    if (s.tick < 10 || !s.machines.length) {
      const face = this.screen({ x: 8, y: 6 });
      if (tileAt(s, { x: 8, y: 6 })) {
        g.lineStyle(2, 0xf6c574, model.reduced ? 0.8 : 0.6 + Math.sin(t / 300) * 0.3);
        g.strokeRoundedRect(face.x - c * 0.45, face.y - c * 0.45, c * 0.9, c * 0.9, 4);
        this.text(face.x - c * 0.1, face.y - c * 0.7, 'HOLD TO MINE', 10, '#f4d6a1');
      }
    }
    for (const m of s.machines)
      if (m.kind === 'drill') {
        const base = this.screen(m),
          headX = Math.min(m.head, m.end),
          head = this.screen({ x: headX, y: m.y });
        g.lineStyle(c * 0.26, 0x526371);
        g.lineBetween(base.x, base.y, head.x, head.y);
        g.lineStyle(c * 0.09, 0x172733);
        g.lineBetween(base.x, base.y, head.x, head.y);
        for (let x = m.x + 1; x < m.head && x <= m.end; x++) {
          const p = this.screen({ x, y: m.y });
          g.lineStyle(2, 0x8393a0, 0.7);
          g.lineBetween(p.x - c * 0.2, p.y - c * 0.18, p.x - c * 0.2, p.y + c * 0.18);
        }
        if (m.head <= m.end) {
          const target = tileAt(s, { x: m.head, y: m.y });
          const hasRoom =
            target &&
            m.output.length + m.loads.reduce((n, l) => n + l.amount, 0) + tileYield(target) <= 8;
          const vibration =
            !model.paused && !model.reduced && m.progress && hasRoom ? Math.sin(t / 40) * 1.3 : 0;
          g.fillStyle(0xf0bd6d);
          g.fillTriangle(
            head.x - c * 0.26,
            head.y - c * 0.3,
            head.x + c * 0.3 + vibration,
            head.y,
            head.x - c * 0.26,
            head.y + c * 0.3
          );
          g.lineStyle(2, 0x76543c);
          g.lineBetween(head.x - 3, head.y - c * 0.2, head.x + 4, head.y + c * 0.12);
        }
        for (const load of m.loads) {
          const p = this.screen({
            x: m.x + ((load.from - m.x) * load.remaining) / load.duration,
            y: m.y,
          });
          this.item(g, 'ore', p.x, p.y - c * 0.02, c * 0.13);
        }
        if (m.extension) {
          for (let x = m.end + 1; x <= m.extension.targetEnd; x++) {
            const p = this.screen({ x, y: m.y });
            g.lineStyle(1, 0xcbadff, x % 2 ? 0.45 : 0.8);
            g.strokeRoundedRect(p.x - c * 0.43, p.y - c * 0.25, c * 0.86, c * 0.5, 3);
          }
          const travelled = 1 - m.extension.remaining / m.extension.duration,
            tender = this.screen({
              x: m.x + (m.end - m.x) * travelled,
              y: m.y,
            });
          g.fillStyle(0x6e6191);
          g.fillRoundedRect(tender.x - c * 0.24, tender.y - c * 0.18, c * 0.48, c * 0.36, 3);
          g.lineStyle(2, 0xe0c9ff);
          g.strokeRoundedRect(tender.x - c * 0.22, tender.y - c * 0.16, c * 0.44, c * 0.32, 3);
          this.item(g, 'part', tender.x, tender.y, c * 0.1);
        }
      }
    for (const m of s.machines) this.drawMachine(g, m, t);
    if (model.mode === 'transfer') {
      for (const target of model.transferTargets) {
        const p = this.screen(target),
          pulse = model.reduced ? 0.8 : 0.65 + Math.sin(t / 180) * 0.25;
        g.fillStyle(0x82dccc, 0.12);
        g.fillRoundedRect(p.x - c * 0.48, p.y - c * 0.48, c * 0.96, c * 0.96, 6);
        g.lineStyle(3, 0x82dccc, pulse);
        g.strokeRoundedRect(p.x - c * 0.48, p.y - c * 0.48, c * 0.96, c * 0.96, 6);
      }
    }
    this.drawCourier(g, t);
    if (model.preview) {
      const v = model.preview,
        p = this.screen(v),
        color = v.valid ? 0x89e3c3 : 0xf18d82;
      g.fillStyle(color, 0.14);
      g.fillRoundedRect(p.x - c * 0.46, p.y - c * 0.46, c * 0.92, c * 0.92, 4);
      g.lineStyle(2, color);
      g.strokeRoundedRect(p.x - c * 0.46, p.y - c * 0.46, c * 0.92, c * 0.92, 4);
      this.arrow(g, p.x, p.y, v.kind === 'belt' ? v.direction : 3, c * 0.17, color);
      if (v.kind === 'drill') {
        g.lineStyle(1, color, 0.75);
        for (let x = v.x + 1; x <= Math.min(WORLD_W - 1, v.x + 8); x++) {
          const p = this.screen({ x, y: v.y });
          g.strokeRect(p.x - c * 0.45, p.y - c * 0.3, c * 0.9, c * 0.6);
        }
      }
    }
    for (const v of model.beltPreview) {
      const p = this.screen(v),
        color = v.valid ? 0x89e3c3 : 0xf18d82;
      g.fillStyle(color, 0.2);
      g.fillRoundedRect(p.x - c * 0.46, p.y - c * 0.46, c * 0.92, c * 0.92, 4);
      g.lineStyle(2, color, 0.95);
      g.strokeRoundedRect(p.x - c * 0.46, p.y - c * 0.46, c * 0.92, c * 0.92, 4);
      this.arrow(g, p.x, p.y, v.direction, c * 0.2, color);
    }
    if (model.selected) {
      const p = this.screen(model.selected);
      g.lineStyle(2, 0xffffff, 0.85);
      g.strokeRoundedRect(p.x - c / 2, p.y - c / 2, c, c, 5);
    }
    this.effects = this.effects.filter((e) => {
      const duration =
        e.event.type === 'mine'
          ? 750
          : e.event.type === 'extend'
            ? 700
            : e.event.type.startsWith('courier-')
              ? 520
              : 300;
      return this.time.now - e.born < duration;
    });
    if (!model.reduced)
      for (const { event, born } of this.effects) {
        const age = this.time.now - born,
          a = this.screen(event.from),
          b = this.screen(event.to || event.from);
        if (event.type === 'flow' || event.type === 'ship') {
          const f = Math.min(1, age / 280);
          this.item(g, event.resource!, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, c * 0.14);
        } else if (event.type === 'courier-load' || event.type === 'courier-deliver') {
          const f = Math.min(1, age / 480),
            amount = event.amount || 1;
          for (let i = 0; i < amount; i++)
            this.item(
              g,
              event.resource!,
              a.x + (b.x - a.x) * f + (i - (amount - 1) / 2) * c * 0.2,
              a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * c * 0.28,
              c * 0.105
            );
        } else if (event.type === 'mine') {
          if (event.to) {
            const f = Math.min(1, age / 700);
            this.item(
              g,
              'ore',
              a.x + (b.x - a.x) * f,
              a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * c,
              c * 0.15
            );
          }
          for (let i = 0; i < 5; i++) {
            g.fillStyle(0xefc181, 1 - age / 750);
            g.fillRect(
              a.x + Math.cos(i * 2) * age * 0.04,
              a.y + Math.sin(i * 2) * age * 0.025 + age * age * 0.000045,
              3,
              3
            );
          }
        } else if (event.type === 'extend') {
          const f = Math.min(1, age / 650);
          g.lineStyle(Math.max(2, c * 0.08), 0xcbadff, 1 - f * 0.6);
          g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
          g.fillStyle(0xf4d59b, 1 - f);
          for (let i = 0; i < 5; i++)
            g.fillCircle(
              a.x + Math.cos(i * 1.7) * age * 0.025,
              a.y + Math.sin(i * 1.7) * age * 0.02,
              2
            );
        }
      }
    this.text(
      14,
      13,
      `${Math.floor(this.pan / c)
        .toString()
        .padStart(2, '0')} / SECTOR 07`,
      10,
      '#6c859a',
      0
    );
    if (model.paused) this.text(this.scale.width - 12, 13, 'PLANNING · PAUSED', 10, '#f2ca89', 1);
    else this.text(this.scale.width - 12, 13, 'LIVE', 10, '#82dccc', 1);
  }
  private courierPoint() {
    const courier = this.model!.state.courier;
    if (courier.phase === 'idle' || courier.route.length < 2)
      return { x: DOCK.x, y: DOCK.y - 0.72 };
    let f = courier.progress / courier.duration;
    if (courier.phase === 'returning') f = 1 - f;
    const distance = Math.max(
        0,
        Math.min(courier.route.length - 1, f * (courier.route.length - 1))
      ),
      index = Math.min(courier.route.length - 2, Math.floor(distance)),
      local = distance - index,
      a = courier.route[index],
      b = courier.route[index + 1];
    return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local - 0.48 };
  }
  private drawCourier(g: Phaser.GameObjects.Graphics, t: number) {
    const courier = this.model!.state.courier,
      world = this.courierPoint(),
      p = this.screen(world),
      c = this.cell,
      bob = this.model!.reduced ? 0 : Math.sin(t / 150) * c * 0.035;
    p.y += bob;
    if (courier.phase !== 'idle') {
      g.lineStyle(1, 0x82dccc, 0.22);
      const route = courier.phase === 'returning' ? [...courier.route].reverse() : courier.route;
      for (let i = 1; i < route.length; i++) {
        const a = this.screen({ x: route[i - 1].x, y: route[i - 1].y - 0.48 }),
          b = this.screen({ x: route[i].x, y: route[i].y - 0.48 });
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    g.fillStyle(0x67d3c7, 0.16);
    g.fillCircle(p.x, p.y, c * 0.34);
    g.fillStyle(0x172d39);
    g.fillRoundedRect(p.x - c * 0.24, p.y - c * 0.13, c * 0.48, c * 0.26, c * 0.08);
    g.lineStyle(2, 0x82dccc);
    g.strokeRoundedRect(p.x - c * 0.22, p.y - c * 0.12, c * 0.44, c * 0.24, c * 0.07);
    g.fillStyle(0x263f4d);
    g.fillCircle(p.x - c * 0.29, p.y - c * 0.02, c * 0.1);
    g.fillCircle(p.x + c * 0.29, p.y - c * 0.02, c * 0.1);
    g.lineStyle(2, 0xa9fff0, 0.85);
    g.lineBetween(p.x - c * 0.38, p.y - c * 0.09, p.x - c * 0.2, p.y - c * 0.09);
    g.lineBetween(p.x + c * 0.2, p.y - c * 0.09, p.x + c * 0.38, p.y - c * 0.09);
    g.fillStyle(0xf4c879);
    g.fillCircle(p.x, p.y - c * 0.02, c * 0.045);
    if (courier.phase !== 'idle') {
      g.fillStyle(0x7fd8ff, 0.65);
      g.fillTriangle(
        p.x - c * 0.12,
        p.y + c * 0.12,
        p.x - c * 0.04,
        p.y + c * 0.12,
        p.x - c * 0.08,
        p.y + c * 0.25
      );
      g.fillTriangle(
        p.x + c * 0.04,
        p.y + c * 0.12,
        p.x + c * 0.12,
        p.y + c * 0.12,
        p.x + c * 0.08,
        p.y + c * 0.25
      );
    }
    for (let i = 0; i < courier.cargo.length; i++)
      this.item(
        g,
        courier.cargo[i],
        p.x + (i - (courier.cargo.length - 1) / 2) * c * 0.18,
        p.y + c * 0.19,
        c * 0.08
      );
    if (this.model!.mode === 'transfer')
      this.text(p.x, p.y - c * 0.34, 'SERVICE DRONE', 8, '#9ff1df');
  }
  private drawMachine(g: Phaser.GameObjects.Graphics, m: Machine, t: number) {
    const p = this.screen(m),
      c = this.cell;
    if (m.kind === 'belt') {
      const vertical = m.direction % 2 === 0;
      g.fillStyle(0x344452);
      g.fillRoundedRect(
        p.x - c * (vertical ? 0.27 : 0.49),
        p.y - c * (vertical ? 0.49 : 0.27),
        c * (vertical ? 0.54 : 0.98),
        c * (vertical ? 0.98 : 0.54),
        3
      );
      g.lineStyle(2, 0x8a9dab, 0.65);
      const offset = (t / 120) % 8;
      for (let k = -1; k <= 1; k++) {
        const v = k * c * 0.25 + offset - 4;
        if (vertical) g.lineBetween(p.x - c * 0.18, p.y + v, p.x + c * 0.18, p.y + v);
        else g.lineBetween(p.x + v, p.y - c * 0.18, p.x + v, p.y + c * 0.18);
      }
      this.arrow(g, p.x, p.y, m.direction, 4, 0xa6bdca);
    } else {
      const color = m.kind === 'drill' ? 0xdcae68 : m.kind === 'smelter' ? 0xd9835a : 0x9f8ccb;
      g.fillStyle(0x0a1420);
      g.fillRoundedRect(p.x - c * 0.45, p.y - c * 0.4 + 3, c * 0.9, c * 0.85, 4);
      g.fillStyle(color);
      g.fillRoundedRect(p.x - c * 0.43, p.y - c * 0.44, c * 0.86, c * 0.82, 4);
      g.fillStyle(0x203242);
      g.fillRoundedRect(p.x - c * 0.3, p.y - c * 0.3, c * 0.6, c * 0.49, 3);
      if (m.kind === 'drill') {
        g.lineStyle(3, 0xefc985);
        g.strokeCircle(p.x, p.y - c * 0.05, c * 0.13);
      } else {
        const r = m.kind === 'smelter' ? 'plate' : 'part';
        if (m.progress) {
          g.fillStyle(
            m.kind === 'smelter' ? 0xffab51 : 0xb0a0f5,
            0.25 + (Math.sin(t / 180) + 1) * 0.12
          );
          g.fillCircle(p.x, p.y, c * 0.4);
        }
        this.item(g, r, p.x, p.y - c * 0.04, c * 0.17);
      }
      this.arrow(g, p.x - c * 0.43, p.y, 3, 4, 0xc5e7dc);
      if (m.kind !== 'drill') this.arrow(g, p.x + c * 0.43, p.y, 3, 4, 0x203242);
      g.fillStyle(0x263744);
      g.fillRect(p.x - c * 0.3, p.y + c * 0.24, c * 0.6, 3);
      if (m.progress) {
        g.fillStyle(0xf8ddb0);
        g.fillRect(
          p.x - c * 0.3,
          p.y + c * 0.24,
          c *
            0.6 *
            Math.min(
              1,
              m.progress /
                (m.kind === 'assembler' ||
                (m.kind === 'drill' &&
                  tileAt(this.model!.state, { x: m.head, y: m.y })?.kind === 'ore')
                  ? 30
                  : 20)
            ),
          3
        );
      }
    }
    for (let i = 0; i < Math.min(4, m.output.length); i++)
      this.item(
        g,
        m.output[i],
        p.x + (i - 1.5) * c * 0.16,
        p.y + (m.kind === 'belt' ? 0 : c * 0.4),
        c * 0.08
      );
  }
}
