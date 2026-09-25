import Phaser from 'phaser';
import {
  WORLD_W,
  WORLD_H,
  DOCK,
  tileAt,
  canMine,
  hardness,
  pocketRemaining,
  tileYield,
  accessible as openSpace,
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
  /** Valid sites for the selected build tool, shown as a planning overlay. */
  siteHints: Point[];
}
const palette = { ore: 0xeac481, plate: 0x82dccc, part: 0xcbadff };
export class AsteroidScene extends Phaser.Scene {
  onTap: (p: Point) => void = () => {};
  onHold: (p: Point | null) => void = () => {};
  onPan: () => void = () => {};
  onBeltDrag: (path: Point[] | null, commit: boolean) => void = () => {};
  onFeed: (p: Point) => void = () => {};
  onTransferDrop: (p: Point) => void = () => {};
  /** Called after any camera pan or zoom so DOM controls can react. */
  onCamera: () => void = () => {};
  model: SceneModel | null = null;
  private art!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private labelsUsed = 0;
  private lastDraw = -1000;
  private drawDirty = true;
  private effects: { event: Event; born: number }[] = [];
  private pan = 0;
  private panY = 0;
  private laidOut = false;
  private insetsKnown = false;
  private explored = false;
  private insetTop = 0;
  private insetBottom = 0;
  private baseCell = 36;
  private zoom = 1;
  private pointers = new Map<number, { x: number; y: number }>();
  private ignored = new Set<number>();
  private pinch: { dist: number; cell: number; wx: number; wy: number } | null = null;
  private last: { x: number; y: number } | null = null;
  private down: {
    x: number;
    y: number;
    pan: number;
    panY: number;
    moved: boolean;
    cell: Point;
    time: number;
    dockDrag: boolean;
    feedAction: Point | null;
    mineable: boolean;
  } | null = null;
  private activePointer: number | null = null;
  private beltPath: Point[] | null = null;
  cell = 36;
  constructor() {
    super('Asteroid');
  }
  create() {
    this.art = this.add.graphics();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointers.set(p.id, { x: p.x, y: p.y });
      if (this.activePointer !== null || this.pinch) {
        // A second finger always becomes camera pinch/pan; the first gesture is abandoned.
        if (this.pointers.size === 2) this.startPinch();
        return;
      }
      this.activePointer = p.id;
      this.last = { x: p.x, y: p.y };
      const cell = this.point(p.x, p.y);
      const feedAction = this.model?.mode === 'mine' ? this.feedActionAt(p.x, p.y) : null;
      this.down = {
        x: p.x,
        y: p.y,
        pan: this.pan,
        panY: this.panY,
        moved: false,
        cell: feedAction || cell,
        time: this.time.now,
        dockDrag: this.model?.mode === 'mine' && cell.x === DOCK.x && cell.y === DOCK.y,
        feedAction,
        mineable:
          this.model?.mode === 'mine' && !!this.model.state && !canMine(this.model.state, cell),
      };
      this.drawDirty = true;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.pointers.has(p.id)) this.pointers.set(p.id, { x: p.x, y: p.y });
      if (this.pinch) {
        this.movePinch();
        return;
      }
      if (!this.down || p.id !== this.activePointer) return;
      this.last = { x: p.x, y: p.y };
      if (Math.abs(p.x - this.down.x) + Math.abs(p.y - this.down.y) > 9) {
        this.down.moved = true;
        this.explored = true;
        this.onHold(null);
        if (this.down.dockDrag || this.down.feedAction) {
          this.drawDirty = true;
        } else if (this.model?.mode === 'belt') {
          this.beltPath = extendBeltPath(this.beltPath || [this.down.cell], this.point(p.x, p.y));
          this.onBeltDrag(this.beltPath, false);
        } else {
          this.pan = this.clampPan(this.down.pan - (p.x - this.down.x));
          this.panY = this.clampPanY(this.down.panY - (p.y - this.down.y));
          this.cameraChanged();
        }
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.pointers.delete(p.id);
      if (this.pinch) {
        // Remaining fingers stay inert until lifted, so a pinch never ends in a tap or mine.
        this.pinch = null;
        for (const id of this.pointers.keys()) this.ignored.add(id);
        this.activePointer = null;
        this.down = null;
        return;
      }
      if (this.ignored.delete(p.id)) return;
      if (p.id !== this.activePointer) return;
      if (this.down?.feedAction) {
        if (!this.down.moved) this.onFeed(this.down.feedAction);
        this.cancelPointer();
        return;
      }
      if (this.down?.dockDrag && this.down.moved) {
        this.onTransferDrop(this.point(p.x, p.y));
        this.cancelPointer();
        return;
      }
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
        (this.time.now - this.down.time < 180 || this.model?.mode === 'belt' || this.down.dockDrag)
      )
        this.onTap(this.down.cell);
      else if (this.down?.moved) this.onPan();
      this.cancelPointer();
    });
    this.input.on(
      'wheel',
      (p: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
        this.explored = true;
        this.zoomAt(p.x, p.y, this.cell * (dy < 0 ? 1.12 : 1 / 1.12));
      }
    );
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => {
      this.pointers.delete(p.id);
      this.ignored.delete(p.id);
      this.pinch = null;
      this.cancelPointer();
    });
    this.game.canvas.addEventListener('pointercancel', () => {
      this.pointers.clear();
      this.ignored.clear();
      this.pinch = null;
      this.cancelPointer();
    });
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
    this.drawDirty = true;
  }
  private feedActionCenter(p: Point) {
    const at = this.screen(p);
    return { x: at.x, y: at.y - Math.max(26, this.cell * 0.95) };
  }
  private feedActionAt(x: number, y: number): Point | null {
    let closest: Point | null = null;
    let best = Infinity;
    for (const target of this.model?.transferTargets || []) {
      const at = this.feedActionCenter(target);
      const dx = Math.abs(x - at.x),
        dy = Math.abs(y - at.y);
      if (dx <= 26 && dy <= 22 && dx + dy < best) {
        closest = target;
        best = dx + dy;
      }
    }
    return closest;
  }
  private startPinch() {
    const [a, b] = [...this.pointers.values()];
    this.cancelPointer();
    this.explored = true;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    this.pinch = {
      dist: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)),
      cell: this.cell,
      wx: (mid.x + this.pan) / this.cell,
      wy: (mid.y + this.panY) / this.cell,
    };
  }
  private movePinch() {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b || !this.pinch) return;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      dist = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
    this.cell = this.clampCell((this.pinch.cell * dist) / this.pinch.dist);
    this.zoom = this.cell / this.baseCell;
    this.pan = this.clampPan(this.pinch.wx * this.cell - mid.x);
    this.panY = this.clampPanY(this.pinch.wy * this.cell - mid.y);
    this.cameraChanged();
  }
  private clampCell(value: number) {
    return Phaser.Math.Clamp(
      value,
      Math.max(18, this.baseCell * 0.6),
      Math.min(112, this.baseCell * 2.4)
    );
  }
  zoomAt(x: number, y: number, next: number) {
    const wx = (x + this.pan) / this.cell,
      wy = (y + this.panY) / this.cell;
    this.cell = this.clampCell(next);
    this.zoom = this.cell / this.baseCell;
    this.pan = this.clampPan(wx * this.cell - x);
    this.panY = this.clampPanY(wy * this.cell - y);
    this.cameraChanged();
  }
  zoomBy(factor: number) {
    this.explored = true;
    this.zoomAt(this.scale.width / 2, this.bandCenter(), this.cell * factor);
  }
  private cameraChanged() {
    this.drawDirty = true;
    this.onCamera();
  }
  private bandCenter() {
    return (this.insetTop + this.scale.height - this.insetBottom) / 2;
  }
  private layout() {
    const w = this.scale.width,
      h = this.scale.height;
    const focal = this.laidOut
      ? { x: (w / 2 + this.pan) / this.cell, y: (this.bandCenter() + this.panY) / this.cell }
      : null;
    // Fit roughly ten columns across a portrait phone: collection, a drill and its first face
    // share one frame. Short landscape screens fit the busy middle rows instead.
    this.baseCell = Phaser.Math.Clamp(Math.min(w / 10, (h - this.insetTop - 96) / 9), 22, 64);
    this.cell = this.clampCell(this.baseCell * this.zoom);
    this.laidOut = true;
    if (focal && this.explored) {
      this.pan = this.clampPan(focal.x * this.cell - w / 2);
      this.panY = this.clampPanY(focal.y * this.cell - this.bandCenter());
      this.cameraChanged();
    } else this.reframe();
  }
  /** Reserve screen space under the DOM HUD and dock; the world stays visible between them. */
  setInsets(top: number, bottom: number) {
    if (Math.abs(top - this.insetTop) < 1 && Math.abs(bottom - this.insetBottom) < 1) return;
    const first = !this.insetsKnown;
    this.insetTop = top;
    this.insetBottom = bottom;
    this.insetsKnown = true;
    if (!this.laidOut) return;
    // Only the first measurement reframes; later panel changes never jolt the camera or
    // cancel a held gesture. The world just stays clear of the new panel edges.
    if (first) this.layout();
    else {
      this.pan = this.clampPan(this.pan);
      this.panY = this.clampPanY(this.panY);
      this.cameraChanged();
    }
  }
  private clampPanY(value: number) {
    const lo = -this.insetTop - this.cell * 0.2,
      hi = WORLD_H * this.cell + this.cell * 0.2 + this.insetBottom - this.scale.height;
    // A world shorter than the band may rest anywhere inside it.
    return hi < lo ? Phaser.Math.Clamp(value, hi, lo) : Phaser.Math.Clamp(value, lo, hi);
  }
  private clampPan(value: number) {
    const lo = -this.cell * 0.4,
      hi = WORLD_W * this.cell - this.scale.width + this.cell * 0.4;
    return hi < lo ? (lo + hi) / 2 : Phaser.Math.Clamp(value, lo, hi);
  }
  panBy(cells: number, rows = 0) {
    this.explored = true;
    this.pan = this.clampPan(this.pan + cells * this.cell);
    this.panY = this.clampPanY(this.panY + rows * this.cell);
    this.cancelPointer();
    this.cameraChanged();
  }
  /** Centre a world cell in the visible band between the HUD and dock. */
  focus(x = 5, y = 6) {
    this.cancelPointer();
    this.frameCell(x, y);
  }
  private frameCell(x: number, y: number) {
    this.pan = this.clampPan((x + 0.5) * this.cell - this.scale.width / 2);
    this.panY = this.clampPanY((y + 0.5) * this.cell - this.bandCenter());
    this.cameraChanged();
  }
  /** Default framing: collection, the starter row and the first rock face at base zoom. */
  home() {
    this.cancelPointer();
    this.reframe();
  }
  private reframe() {
    this.explored = false;
    this.zoom = 1;
    this.cell = this.clampCell(this.baseCell);
    // Centre the whole asteroid height when it fits, otherwise the factory row.
    this.frameCell(
      5,
      WORLD_H * this.cell <= this.scale.height - this.insetTop - this.insetBottom ? 5.5 : 6
    );
  }
  /** True when collection is in view at roughly the default zoom. */
  atHome() {
    if (!this.laidOut) return true;
    const d = this.screen(DOCK);
    return (
      Math.abs(this.zoom - 1) < 0.15 &&
      d.x > 0 &&
      d.x < this.scale.width &&
      d.y > this.insetTop &&
      d.y < this.scale.height - this.insetBottom
    );
  }
  /** Pan the smallest distance that keeps a cell clear of the HUD and dock. */
  ensureVisible(p: Point) {
    if (!this.laidOut) return;
    const at = this.screen(p),
      margin = this.cell * 0.7;
    let dx = 0,
      dy = 0;
    if (at.x < margin) dx = at.x - margin;
    else if (at.x > this.scale.width - margin) dx = at.x - this.scale.width + margin;
    if (at.y < this.insetTop + margin) dy = at.y - this.insetTop - margin;
    else if (at.y > this.scale.height - this.insetBottom - margin)
      dy = at.y - this.scale.height + this.insetBottom + margin;
    if (!dx && !dy) return;
    this.pan = this.clampPan(this.pan + dx);
    this.panY = this.clampPanY(this.panY + dy);
    this.cameraChanged();
  }
  point(x: number, y: number): Point {
    return {
      x: Math.floor((x + this.pan) / this.cell),
      y: Math.floor((y + this.panY) / this.cell),
    };
  }
  screen(p: Point) {
    return {
      x: (p.x + 0.5) * this.cell - this.pan,
      y: (p.y + 0.5) * this.cell - this.panY,
    };
  }
  setModel(model: SceneModel) {
    this.model = model;
    this.drawDirty = true;
  }
  emit(events: Event[]) {
    for (const event of events) this.effects.push({ event, born: this.time.now });
    if (events.length) this.drawDirty = true;
  }
  private text(
    x: number,
    y: number,
    text: string,
    size = 11,
    color = '#94a6b5',
    origin = 0.5,
    alpha = 1
  ) {
    const index = this.labelsUsed++;
    let label = this.labels[index];
    if (!label) {
      label = this.add.text(x, y, text, {
        fontFamily: 'DM Sans, sans-serif',
        fontSize: size + 'px',
        color,
        fontStyle: 'bold',
      });
      this.labels.push(label);
    }
    label.setPosition(x, y).setOrigin(origin, 0.5).setAlpha(alpha).setVisible(true);
    if (label.text !== text) label.setText(text);
    if (label.style.fontSize !== size + 'px') label.setFontSize(size);
    if (label.style.color !== color) label.setColor(color);
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
    if (
      this.down &&
      !this.down.moved &&
      !this.down.dockDrag &&
      !this.down.feedAction &&
      this.time.now - this.down.time >= 180
    ) {
      if (this.model.mode === 'mine' && tileAt(this.model.state, this.down.cell))
        this.onHold(this.down.cell);
      else if (this.model.mode !== 'belt') {
        this.onTap(this.down.cell);
        this.down = null;
      }
    }
    this.edgeScroll();
    if (this.time.now - this.lastDraw < 32) return;
    if (!this.drawDirty && (this.model.paused || this.model.reduced) && !this.effects.length)
      return;
    this.lastDraw = this.time.now;
    this.drawDirty = false;
    this.draw();
  }
  /** While drawing a route near a screen edge, glide the camera so long routes need no buttons. */
  private edgeScroll() {
    if (!this.down?.moved || !this.beltPath || !this.last) return;
    const edge = 40,
      step = (this.cell * 7 * Math.min(50, this.game.loop.delta)) / 1000,
      { x, y } = this.last;
    let dx = 0,
      dy = 0;
    if (x < edge) dx = -step;
    else if (x > this.scale.width - edge) dx = step;
    if (y < this.insetTop + edge) dy = -step;
    else if (y > this.scale.height - this.insetBottom - edge) dy = step;
    if (!dx && !dy) return;
    const pan = this.clampPan(this.pan + dx),
      panY = this.clampPanY(this.panY + dy);
    if (pan === this.pan && panY === this.panY) return;
    this.pan = pan;
    this.panY = panY;
    this.beltPath = extendBeltPath(this.beltPath, this.point(x, y));
    this.onBeltDrag(this.beltPath, false);
    this.cameraChanged();
  }
  private draw() {
    const model = this.model!,
      s = model.state,
      g = this.art,
      c = this.cell,
      t = model.reduced ? 0 : model.paused ? s.tick * 100 : this.time.now;
    g.clear();
    this.labelsUsed = 0;
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
    const planetX = this.scale.width * 0.77 - this.pan * 0.08,
      planetY = this.insetTop + 40 - this.panY * 0.08;
    g.fillStyle(0x122738, 0.65);
    g.fillCircle(planetX, planetY, 53);
    g.fillStyle(0x080f1b);
    g.fillCircle(planetX - 16, planetY - 13, 49);
    const planning = model.mode !== 'mine' && model.mode !== 'transfer',
      accessible = planning ? openSpace(s) : new Set<number>(),
      startX = Math.max(0, Math.floor(this.pan / c) - 1),
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
          if (planning && accessible.has(y * WORLD_W + x)) {
            g.lineStyle(1, 0x5f8fa0, 0.28);
            g.strokeRect(p.x - c / 2 + 0.5, p.y - c / 2 + 0.5, c - 1, c - 1);
          }
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
    for (const [key, remaining] of Object.entries(s.pockets)) {
      if (!remaining) continue;
      const [x, y] = key.split(',').map(Number);
      if (s.machines.some((m) => m.kind === 'drill' && m.end === x && m.y === y)) continue;
      const p = this.screen({ x, y });
      if (p.x < -c || p.x > this.scale.width + c) continue;
      g.fillStyle(0xeac481, 0.18);
      g.fillCircle(p.x, p.y, c * 0.4);
      g.lineStyle(2, 0xf6d292, 0.9);
      g.strokeCircle(p.x, p.y, c * 0.34);
      this.item(g, 'ore', p.x, p.y, c * 0.12);
      this.text(p.x, p.y - c * 0.62, `${remaining} DEEP`, 10, '#ffe0a5');
    }
    if (this.down && !this.down.moved && this.down.mineable && model.mode === 'mine') {
      const tile = tileAt(s, this.down.cell);
      if (tile) {
        const target = this.screen(this.down.cell),
          progress = Math.min(100, Math.round((tile.work / hardness(tile)) * 100));
        g.lineStyle(2, 0xf7d997, 0.9);
        g.strokeRoundedRect(target.x - c * 0.47, target.y - c * 0.47, c * 0.94, c * 0.94, 5);
        this.text(target.x, target.y + c * 0.69, `${progress}%`, 10, '#ffe2a9');
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
    this.text(dock.x, dock.y + c * 0.7, 'COLLECTION', 10, '#8ddbc9');
    if (!s.machines.length) {
      const face = this.screen({ x: 8, y: 6 });
      if (tileAt(s, { x: 8, y: 6 })) {
        g.lineStyle(2, 0xf6c574, model.reduced ? 0.8 : 0.6 + Math.sin(t / 300) * 0.3);
        g.strokeRoundedRect(face.x - c * 0.45, face.y - c * 0.45, c * 0.9, c * 0.9, 4);
        this.text(face.x - c * 0.1, face.y - c * 0.72, 'HOLD TO MINE', 12, '#f4d6a1');
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
          this.item(g, 'ore', p.x, p.y - c * 0.02, c * 0.16);
        }
        const pocket = pocketRemaining(s, m);
        if (pocket) {
          const face = this.screen({ x: m.end, y: m.y });
          g.lineStyle(2, 0xeac481, 0.85);
          g.strokeCircle(face.x, face.y, c * 0.35);
          this.item(g, 'ore', face.x, face.y, c * 0.16);
          this.text(base.x, base.y + c * 0.72, `${pocket} ORE`, 10, '#f0ca8a');
          if (m.head > m.end) this.text(face.x, face.y - c * 0.64, `${pocket}`, 10, '#f0ca8a');
        }
        if (m.extension) {
          for (let x = m.end + 1; x <= m.extension.targetEnd; x++) {
            const p = this.screen({ x, y: m.y });
            g.lineStyle(1, 0xcbadff, x % 2 ? 0.45 : 0.8);
            g.strokeRoundedRect(p.x - c * 0.43, p.y - c * 0.25, c * 0.86, c * 0.5, 3);
          }
          if (m.extension.queued) {
            this.text(base.x, base.y - c * 0.72, 'KIT QUEUED', 9, '#e0c9ff');
          } else {
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
      }
    for (const m of s.machines) this.drawMachine(g, m, t);
    if (model.mode === 'transfer' || this.down?.dockDrag) {
      for (const target of model.transferTargets) {
        const p = this.screen(target),
          pulse = model.reduced ? 0.8 : 0.65 + Math.sin(t / 180) * 0.25;
        g.fillStyle(0x82dccc, 0.12);
        g.fillRoundedRect(p.x - c * 0.48, p.y - c * 0.48, c * 0.96, c * 0.96, 6);
        g.lineStyle(3, 0x82dccc, pulse);
        g.strokeRoundedRect(p.x - c * 0.48, p.y - c * 0.48, c * 0.96, c * 0.96, 6);
      }
    }
    if (model.mode === 'mine' && !this.down?.dockDrag) {
      for (const target of model.transferTargets) {
        const at = this.feedActionCenter(target);
        if (at.x < 22 || at.x > this.scale.width - 22 || at.y < 22 || at.y > this.scale.height - 22)
          continue;
        g.fillStyle(0x163c41, 0.96);
        g.fillRoundedRect(at.x - 25, at.y - 15, 50, 30, 9);
        g.lineStyle(2, 0x82dccc);
        g.strokeRoundedRect(at.x - 25, at.y - 15, 50, 30, 9);
        this.text(at.x, at.y, 'FEED', 11, '#baf4dc');
      }
    }
    this.drawCourier(g, t);
    if (!model.preview && !model.beltPreview.length)
      for (const hint of model.siteHints) {
        const p = this.screen(hint),
          pulse = model.reduced ? 0.75 : 0.5 + Math.sin(t / 260) * 0.3;
        g.fillStyle(0x89e3c3, 0.1);
        g.fillRoundedRect(p.x - c * 0.42, p.y - c * 0.42, c * 0.84, c * 0.84, 5);
        g.lineStyle(2, 0x89e3c3, pulse);
        g.strokeRoundedRect(p.x - c * 0.42, p.y - c * 0.42, c * 0.84, c * 0.84, 5);
        this.arrow(g, p.x + c * 0.08, p.y, 1, c * 0.12, 0x89e3c3);
      }
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
        e.event.type === 'mine' || e.event.type === 'extract'
          ? 750
          : e.event.type === 'ship'
            ? 900
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
          if (f < 1)
            this.item(g, event.resource!, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, c * 0.16);
          if (event.type === 'ship') {
            // Delivered cargo pops above collection so a silent viewer sees stock arrive.
            const rise = Math.min(1, age / 900);
            this.text(
              b.x,
              b.y - c * (0.7 + rise * 0.9),
              '+1',
              13,
              { ore: '#f3cf92', plate: '#a4eadc', part: '#dcc8ff' }[event.resource!],
              0.5,
              1 - rise
            );
          }
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
        } else if (event.type === 'mine' || event.type === 'extract') {
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
    for (let i = this.labelsUsed; i < this.labels.length; i++) this.labels[i].setVisible(false);
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
                  (m.head > m.end ||
                    tileAt(this.model!.state, { x: m.head, y: m.y })?.kind === 'ore'))
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
        p.x + (i - 1.5) * c * 0.2,
        p.y + (m.kind === 'belt' ? 0 : c * 0.4),
        c * (m.kind === 'belt' ? 0.11 : 0.09)
      );
  }
}
