import Phaser from 'phaser';
import { HEIGHT, PRODUCTS, WIDTH, definition, geometry } from '../game/content';
import { DELTAS, ownerOf, nextProduct } from '../game/simulation';
import type { Machine, Point, Resource, RunState, SimEvent } from '../game/types';

export const CELL = 48,
  LEFT = 32,
  TOP = 23,
  BOARD_WIDTH = 448,
  BOARD_HEIGHT = 478;
export interface BoardModel {
  state: RunState;
  selected: number | null;
  preview: Machine | null;
  ignored: number[];
  valid: boolean;
  hint: Machine | null;
}
export class BoardScene extends Phaser.Scene {
  private art!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private model: BoardModel | null = null;
  onCell: (point: Point, drag: boolean) => void = () => {};
  onCancel: () => void = () => {};
  isDragging = false;
  private down: Point | null = null;
  constructor() {
    super('Factory');
  }
  create() {
    this.art = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.down = { x: p.x, y: p.y };
      this.isDragging = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.down) return;
      if (Phaser.Math.Distance.Between(p.x, p.y, this.down.x, this.down.y) > 7) {
        this.isDragging = true;
        this.onCell(this.point(p.x, p.y - 38), true);
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.down) return;
      this.onCell(this.point(p.x, p.y - (this.isDragging ? 38 : 0)), this.isDragging);
      this.down = null;
      this.isDragging = false;
    });
    this.game.canvas.addEventListener('pointercancel', () => {
      this.down = null;
      this.isDragging = false;
      this.onCancel();
    });
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    if (this.model) this.draw(this.model);
  }
  point(x: number, y: number): Point {
    let col = Math.floor((x - LEFT) / CELL);
    if (this.model?.state.mirrored) col = WIDTH - 1 - col;
    return { x: col, y: Math.floor((y - TOP) / CELL) };
  }
  screen(p: Point): Point {
    return {
      x: LEFT + (this.model?.state.mirrored ? WIDTH - 1 - p.x : p.x) * CELL + CELL / 2,
      y: TOP + p.y * CELL + CELL / 2,
    };
  }
  private label(x: number, y: number, text: string, size = 11, color = '#9ab3ab', weight = false) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: `${size}px`,
        fontStyle: weight ? 'bold' : 'normal',
        color,
      })
      .setOrigin(0.5);
    this.texts.push(t);
    return t;
  }
  draw(model: BoardModel) {
    this.model = model;
    if (!this.art) return;
    const g = this.art;
    g.clear();
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    g.fillStyle(0x1e3832);
    g.fillRoundedRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT, 20);
    g.lineStyle(1, 0x557269, 0.5);
    g.strokeRoundedRect(5, 5, BOARD_WIDTH - 10, BOARD_HEIGHT - 10, 17);
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const p = this.screen({ x, y });
        g.fillStyle((x + y) % 2 ? 0x29463e : 0x2b493f);
        g.fillRoundedRect(p.x - 23, p.y - 23, 46, 46, 5);
        g.fillStyle(0x577469, 0.35);
        g.fillCircle(p.x, p.y, 1);
      }
    for (let x = 0; x < WIDTH; x++)
      if (!model.state.sources.some((s) => s.x === x && s.y < 0))
        this.label(this.screen({ x, y: 0 }).x, 12, String.fromCharCode(65 + x), 8);
    for (let y = 0; y < HEIGHT; y++)
      if (!model.state.sources.some((s) => s.y === y && s.x < 0))
        this.label(14, this.screen({ x: 0, y }).y, String(y + 1), 9);
    this.label(
      BOARD_WIDTH / 2,
      BOARD_HEIGHT - 11,
      'Tap a machine to see what it does',
      10,
      '#b9cbbd'
    );
    for (const p of model.state.blockers) {
      const s = this.screen(p);
      g.fillStyle(0x172e29);
      g.fillRoundedRect(s.x - 22, s.y - 22, 44, 44, 5);
      g.lineStyle(3, 0x476054, 0.55);
      for (let i = -12; i <= 12; i += 12)
        g.lineBetween(s.x + i - 7, s.y - 15, s.x + i + 7, s.y + 15);
    }
    for (const source of model.state.sources) {
      const p = this.screen(source);
      if (source.x < 0) {
        p.x = model.state.mirrored ? BOARD_WIDTH - 16 : 16;
      }
      if (source.y < 0) p.y = 12;
      if (source.x >= WIDTH) p.x = BOARD_WIDTH - 16;
      g.fillStyle(0x122b25);
      const radius = source.x < 0 || source.x >= WIDTH || source.y < 0 ? 12 : 19;
      g.fillCircle(p.x, p.y, radius);
      g.lineStyle(2, 0xbcaa7a);
      g.strokeCircle(p.x, p.y, radius - 2);
      this.resource(g, source.resource, p.x, p.y, 8);
      const label = this.label(
        source.y < 0 ? p.x + 38 : p.x,
        p.y + (source.y < 0 ? 0 : 23),
        PRODUCTS[source.resource].name.toUpperCase(),
        10,
        '#fff0c8',
        true
      );
      label.x = Phaser.Math.Clamp(label.x, 5 + label.width / 2, BOARD_WIDTH - 5 - label.width / 2);
      const direction = model.state.mirrored ? (4 - source.direction) % 4 : source.direction;
      const d = DELTAS[direction];
      this.arrow(g, p.x + d.x * radius, p.y + d.y * radius, direction, 0xf2d797, 4);
    }
    for (const m of model.state.machines)
      if (!model.ignored.includes(m.id)) this.machine(g, m, 1, model.selected === m.id);
    if (model.hint && !model.preview) {
      g.lineStyle(2, 0xf4d898, 0.6);
      for (const c of geometry(model.hint).cells) {
        const p = this.screen(c);
        g.strokeRoundedRect(p.x - 21, p.y - 21, 42, 42, 7);
      }
      const anchor = this.screen(geometry(model.hint).cells[0]);
      this.label(anchor.x, anchor.y, 'PLACE\nHERE', 13, '#f9e4ac', true);
    }
    if (model.preview) {
      this.machine(g, model.preview, 0.65, false);
      g.lineStyle(3, model.valid ? 0xd8f3b1 : 0xf29982);
      for (const c of geometry(model.preview).cells) {
        const p = this.screen(c);
        g.strokeRoundedRect(p.x - 22, p.y - 22, 44, 44, 6);
      }
    }
  }
  private machine(g: Phaser.GameObjects.Graphics, m: Machine, alpha: number, selected: boolean) {
    const def = definition(m),
      geo = geometry(m),
      set = new Set(geo.cells.map((c) => `${c.x},${c.y}`));
    for (const c of geo.cells) {
      const p = this.screen(c);
      g.fillStyle(0x102a23, alpha);
      g.fillRoundedRect(p.x - 22, p.y - 19, 44, 44, 6);
      g.fillStyle(def.color, alpha);
      g.fillRoundedRect(p.x - 22, p.y - 23, 44, 44, 6);
      g.fillStyle(0xffffff, alpha * 0.16);
      g.fillRoundedRect(p.x - 19, p.y - 21, 38, 5, 2);
      g.fillStyle(0x183c32, alpha * 0.15);
      g.fillRoundedRect(p.x - 16, p.y - 14, 32, 27, 4);
      for (const delta of [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ])
        if (set.has(`${c.x + delta.x},${c.y + delta.y}`)) {
          const dd = this.model?.state.mirrored ? -delta.x : delta.x;
          g.fillStyle(def.color, alpha);
          g.fillRect(
            p.x + (dd < 0 ? -27 : dd ? 15 : -15),
            p.y + (delta.y ? 15 : -15),
            delta.y ? 30 : 12,
            delta.y ? 12 : 30
          );
        }
      if (selected) {
        g.lineStyle(2, 0xfff0ba, alpha);
        g.strokeRoundedRect(p.x - 22, p.y - 23, 44, 45, 6);
      }
    }
    const middle = geo.cells[Math.floor(geo.cells.length / 2)],
      center = this.screen(middle);
    if (m.kind === 'module') {
      g.fillStyle(0x304f43, alpha);
      g.fillRoundedRect(center.x - 15, center.y - 15, 30, 28, 7);
      g.lineStyle(2, 0xffe8a7, alpha);
      g.strokeRoundedRect(center.x - 15, center.y - 15, 30, 28, 7);
      const r = this.product(m);
      if (r) this.resource(g, r, center.x, center.y - 1, 9, alpha);
      g.fillStyle(0xffefbf, alpha);
      g.fillCircle(center.x + 12, center.y + 13, 3);
    } else if (m.kind === 'straight' || m.kind === 'elbow') {
      for (const c of geo.cells) {
        const p = this.screen(c);
        g.lineStyle(3, 0x31574e, alpha * 0.7);
        g.strokeRoundedRect(p.x - 12, p.y - 10, 24, 20, 4);
        g.lineBetween(p.x - 5, p.y - 7, p.x - 5, p.y + 7);
        g.lineBetween(p.x + 5, p.y - 7, p.x + 5, p.y + 7);
      }
    } else {
      g.fillStyle(0x24483c, alpha);
      g.fillRoundedRect(center.x - 15, center.y - 15, 30, 30, 7);
      g.lineStyle(2, 0xf9e5b6, alpha * 0.75);
      g.strokeRoundedRect(center.x - 15, center.y - 15, 30, 30, 7);
      const resource = this.product(m);
      if (resource) this.resource(g, resource, center.x, center.y, 10, alpha);
      const first = this.screen(geo.cells[0]);
      g.fillStyle(0xfff2c8, alpha * 0.8);
      g.fillCircle(first.x - 12, first.y - 13, 2);
      g.fillStyle(0x335444, alpha);
      g.fillCircle(first.x + 12, first.y - 13, 2);
    }
    for (const input of geo.inputs) {
      const p = this.screen(input),
        dir = this.model?.state.mirrored ? (4 - input.direction) % 4 : input.direction,
        d = DELTAS[dir];
      g.fillStyle(0x173b30, alpha);
      g.fillCircle(p.x + d.x * 20, p.y + d.y * 20, 7);
      this.arrow(g, p.x + d.x * 20, p.y + d.y * 20, (dir + 2) % 4, 0xffefd0, 4, alpha);
      if (input.resource !== 'any' && (selected || m.kind === 'module' || alpha < 1)) {
        this.resource(
          g,
          input.resource,
          p.x + d.x * 11 - d.y * 9,
          p.y + d.y * 11 + d.x * 9,
          4,
          alpha
        );
      }
    }
    const op = this.screen(geo.output),
      dir = this.model?.state.mirrored ? (4 - geo.output.direction) % 4 : geo.output.direction,
      d = DELTAS[dir];
    g.fillStyle(0xffedbc, alpha);
    g.fillCircle(op.x + d.x * 21, op.y + d.y * 21, 7);
    this.arrow(g, op.x + d.x * 21, op.y + d.y * 21, dir, 0x234337, 4, alpha);
    // A written name is the primary identity; the resource icon is supporting art.
    const rows = [...new Set(geo.cells.map((c) => c.y))]
      .map((y) => geo.cells.filter((c) => c.y === y))
      .sort((a, b) => b.length - a.length);
    const row = rows[0],
      points = row.map((c) => this.screen(c));
    const names = {
      punch: 'PUNCH',
      cutter: 'CUTTER',
      straight: 'BELT',
      elbow: 'BELT',
      module: 'FOLDED',
    };
    const name = this.label(
      points.reduce((n, p) => n + p.x, 0) / points.length,
      points[0].y + 14,
      names[m.kind],
      row.length === 1 ? 11 : 13,
      '#fff5dc',
      true
    );
    name.setBackgroundColor('#274637').setPadding(3, 1, 3, 1).setAlpha(alpha);
  }
  private product(m: Machine): Resource | null {
    if (!this.model) return null;
    const state = this.model.state;
    const machines = [
      ...state.machines.filter((n) => n.id !== m.id && !this.model!.ignored.includes(n.id)),
      m,
    ];
    return nextProduct({ ...state, machines }, m);
  }
  private arrow(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    direction: number,
    color: number,
    size: number,
    alpha = 1
  ) {
    const d = DELTAS[direction],
      side = { x: -d.y, y: d.x };
    g.fillStyle(color, alpha);
    g.fillTriangle(
      x + d.x * size,
      y + d.y * size,
      x - d.x * size + side.x * size,
      y - d.y * size + side.y * size,
      x - d.x * size - side.x * size,
      y - d.y * size - side.y * size
    );
  }
  private resource(
    g: Phaser.GameObjects.Graphics,
    r: Resource,
    x: number,
    y: number,
    size: number,
    alpha = 1
  ) {
    g.fillStyle(Number('0x' + PRODUCTS[r].color.slice(1)), alpha);
    g.beginPath();
    g.moveTo(x - size, y - size);
    if (r === 'clipped' || r === 'combined') {
      g.lineTo(x + size * 0.2, y - size);
      g.lineTo(x + size, y - size * 0.2);
    } else g.lineTo(x + size, y - size);
    g.lineTo(x + size, y + size);
    g.lineTo(x - size, y + size);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0xffedcd, alpha);
    g.strokePath();
    if (r === 'punched' || r === 'combined') {
      g.fillStyle(0x234337, alpha);
      g.fillCircle(x - size * 0.1, y + size * 0.1, size * 0.4);
    }
  }

  animate(
    events: SimEvent[],
    reduced: boolean,
    onSound: (type: SimEvent['type']) => void
  ): Promise<void> {
    if (!this.model || !events.length) return Promise.resolve();
    const state = this.model.state;
    if (reduced) {
      if (events.some((e) => e.type === 'fold')) onSound('fold');
      else if (events.some((e) => e.type === 'milestone')) onSound('milestone');
      else onSound('place');
      return Promise.resolve();
    }
    const ticks = events.flatMap((e) => (e.tick === undefined ? [] : [e.tick])),
      start = Math.min(...ticks);
    const findPoint = (id: number): Point => {
      const source = state.sources.find((s) => s.id === id);
      if (source) {
        const p = this.screen(source);
        if (source.x < 0) p.x = 16;
        if (source.x >= WIDTH) p.x = BOARD_WIDTH - 16;
        if (source.y < 0) p.y = 12;
        return p;
      }
      const owner = ownerOf(state, id);
      return this.screen(owner ? geometry(owner).output : { x: 0, y: 0 });
    };
    for (const [index, event] of events.entries()) {
      const delay = event.tick === undefined ? 0 : (event.tick - start) * 190;
      if (event.type === 'flow' && event.id !== undefined && event.to !== undefined) {
        const from = findPoint(event.id),
          to = findPoint(event.to);
        if (from.x === to.x && from.y === to.y) continue;
        const dot = this.add.graphics().setPosition(from.x, from.y).setAlpha(0);
        this.resource(dot, event.resource!, 0, 0, 7);
        this.tweens.add({
          targets: dot,
          x: to.x,
          y: to.y,
          alpha: 1,
          duration: 170,
          delay,
          onComplete: () => dot.destroy(),
        });
      }
      if (event.type === 'work' || event.type === 'ship') {
        const p = findPoint(event.id!);
        const ring = this.add
          .circle(p.x, p.y, 8)
          .setStrokeStyle(2, event.type === 'ship' ? 0xffedb1 : 0xbde0b5)
          .setAlpha(0);
        this.tweens.add({
          targets: ring,
          scale: 2,
          alpha: { from: 0.8, to: 0 },
          duration: 220,
          delay,
          onComplete: () => ring.destroy(),
        });
        if (index % 5 === 0) this.time.delayedCall(delay, () => onSound(event.type));
      }
      if (event.type === 'fold') {
        const to = findPoint(event.id!),
          from = this.screen(event.fromPoint || { x: 0, y: 0 });
        for (let i = 0; i < Math.min(event.amount || 4, 12); i++) {
          const square = this.add
            .rectangle(
              from.x + ((i % 3) - 1) * 15,
              from.y + Math.floor(i / 3) * 10,
              20,
              20,
              0xf2d495
            )
            .setStrokeStyle(2, 0xffefd0);
          this.tweens.add({
            targets: square,
            x: to.x,
            y: to.y,
            scale: 0.25,
            angle: 90,
            alpha: 0,
            duration: 500,
            delay: i * 25,
            ease: 'Back.In',
            onComplete: () => square.destroy(),
          });
        }
        onSound('fold');
      }
      if (event.type === 'milestone') this.time.delayedCall(delay, () => onSound('milestone'));
      if (event.type === 'place') onSound('place');
    }
    return new Promise((resolve) => this.time.delayedCall(ticks.length ? 850 : 650, resolve));
  }
}
