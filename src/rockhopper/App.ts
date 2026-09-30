import {
  BELT_TIER_MAX,
  beltCapacity,
  CELL,
  DT,
  SMELTER_RADIUS,
  HUB_RADIUS,
  LASER_POWER,
  ORES,
  SLOTS,
  TRACTOR_MAX,
  DOCKS_MAX,
} from './config';
import { Renderer, formatNumber, type Overlay } from './render';
import {
  beltsNear,
  beltEnds as beltEndsOf,
  byId,
  canSplice,
  canTarget,
  crossingsOf,
  sameTarget,
  dockPos,
  drills,
  inputsOf,
  inputCap,
  freshState,
  hubCost,
  machinePos,
  nearestRim,
  spliceLanesBlocked,
  targetWhy,
  priceOf,
  sellValue,
  slotVisible,
  smelters,
  smelterSpotWhy,
  rimPos,
  step,
  unlockCost,
  upgradeCost,
  widenPrice,
  type HubUpgrade,
  applyCommand,
  type CommandName,
  type LoggedCommand,
  type Machine,
  type Point,
  type State,
  type Target,
} from './sim';
import {
  deserialize,
  LEGACY_SAVE_KEY,
  loadSettings,
  SAVE_KEY,
  saveSettings,
  serialize,
  type Settings,
} from './save';
import { Sfx } from './audio';
import { COIN_SVG, drawChunk, drawDrill, drawSmelter } from './sprites';

type Hit =
  | { kind: 'rock'; slot: number }
  | { kind: 'machine'; id: number }
  | { kind: 'hub' }
  | { kind: 'locked'; slot: number }
  | { kind: 'empty' };

type Gesture =
  | { type: 'mine'; slot: number }
  | { type: 'machine'; id: number; x0: number; y0: number; t0: number; dragging: boolean }
  | { type: 'tap'; hit: Hit; x0: number; y0: number; t0: number; panning: boolean }
  | { type: 'place'; x0: number; y0: number; t0: number }
  | {
      type: 'tray';
      kind: 'drill' | 'smelter';
      x0: number;
      y0: number;
      dragging: boolean;
      button: HTMLElement;
    }
  | { type: 'pinch'; d0: number; z0: number; mx: number; my: number }
  | { type: 'none' };

const pt = (p: Point) => ({ x: p.x, y: p.y });
const feedsId = (m: Machine, id: number) =>
  !!m.out && m.out.to.kind !== 'dock' && m.out.to.id === id;

/** Why a smelter can't go into this belt, in a few words for the drop label. */
function spliceRefusal(s: State, owner: Machine, mover: Machine | null, q: Point): string {
  if (mover?.out) return 'already linked';
  if (owner.kind === 'smelter' || owner.out?.to.kind === 'smelter') return 'already smelted';
  if (mover && inputsOf(s, mover.id).length >= inputCap(mover)) return 'inputs full';
  if (s.crossings && spliceLanesBlocked(s, owner, mover?.kind === 'smelter' ? mover : null, q))
    return 'belt blocked';
  return 'no room here';
}
const splice = (p: object) => ('splice' in p ? (p.splice as number) : null);

type Bubble = { kind: 'machine'; id: number } | { kind: 'hub' } | { kind: 'locked'; slot: number };

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

export class RockhopperApp {
  state: State;
  readonly renderer: Renderer;
  private sfx = new Sfx();
  private settings: Settings;
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private creditsEl: HTMLElement;
  private counterEl: HTMLElement;
  private tray: HTMLElement;
  private tools: Record<'drill' | 'smelter', { button: HTMLButtonElement; price: HTMLElement }>;
  private bubbleEl: HTMLElement;
  private menuEl: HTMLElement;
  private bubble: Bubble | null = null;
  private bubbleKey = '';
  private bubbleRefresh: () => void = () => {};
  private overlay: Overlay = {
    finger: null,
    placing: null,
    reroute: null,
    selected: null,
    trayDrill: null,
    hintHold: false,
    hintDrag: false,
    hintJoin: null,
    hintSplice: null,
    hintCross: null,
    notice: null,
    reducedMotion: false,
  };
  /** Tutorial state for the logistics hands (splice, join, recovery) and the crossing label. */
  private taught = { splice: false, join: false, cross: false };
  /** Seconds a crossing has kept bundles waiting, and the crossing label has been shown. */
  private crossHot = 0;
  private crossShown = 0;
  private crossKey: string | null = null;
  /** Seconds left on the notice that a save from before crossings now has them. */
  private noticeLeft = 0;
  /** Seconds the splice hand has been shown; it gives up after a while. */
  private spliceHintShown = 0;
  private armed: { kind: 'drill' | 'smelter'; moving?: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: Gesture = { type: 'none' };
  private acc = 0;
  private last = performance.now();
  private shown = 0;
  private bump = 0;
  private paused = false;
  private lastSave = 0;
  private seenAffordable = new Set<string>();
  private insetTop = 84;
  private insetBottom = 130;

  constructor(mount = document.getElementById('app')!) {
    const params = new URLSearchParams(location.search);
    this.settings = loadSettings();
    this.sfx.muted = this.settings.muted;
    this.overlay.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Capture mode (disclosed in clips): shows real touch points, hides the tutorial hands.
    this.clipMode = params.has('clip');
    const seed = Number(params.get('seed') ?? 1) || 1;
    let loaded: State | null = null;
    if (!params.has('fresh')) {
      try {
        // Undo the logistics experiment's save: the untouched v1 save is migrated again.
        if (params.get('restore') === 'pre-logistics') {
          localStorage.removeItem(SAVE_KEY);
          // Once only: a refresh must not throw away the progress made since.
          params.delete('restore');
          const q = params.toString();
          history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
        }
        const text = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY);
        if (text) loaded = deserialize(text);
      } catch {
        loaded = null;
      }
    }
    this.state = loaded ?? freshState(seed);
    this.shown = this.state.credits;

    this.root = el('div', 'rh');
    this.canvas = el('canvas', 'rh-canvas');
    this.canvas.setAttribute('aria-label', 'Asteroid field. Hold a rock to mine it.');
    this.canvas.setAttribute('role', 'img');
    const top = el('div', 'rh-top');
    this.counterEl = el('div', 'rh-counter');
    this.counterEl.setAttribute('role', 'status');
    this.counterEl.innerHTML = `<span class="rh-coin">${COIN_SVG}</span>`;
    this.creditsEl = el('span', 'rh-credits', '0');
    this.counterEl.append(this.creditsEl);
    const menuBtn = el(
      'button',
      'rh-round rh-menu-btn',
      '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="2.4"/><circle cx="10" cy="10" r="2.4"/><circle cx="16" cy="10" r="2.4"/></svg>'
    );
    menuBtn.setAttribute('aria-label', 'Menu');
    menuBtn.addEventListener('click', () => this.toggleMenu());
    top.append(this.counterEl, menuBtn);

    this.tray = el('div', 'rh-tray');
    this.tools = {
      drill: this.makeTool('drill', 'Drill: drag onto an asteroid'),
      smelter: this.makeTool('smelter', 'Smelter: drag into open space'),
    };
    this.tray.append(
      this.tools.drill.button.parentElement!,
      this.tools.smelter.button.parentElement!
    );

    this.bubbleEl = el('div', 'rh-bubble');
    this.bubbleEl.hidden = true;
    this.menuEl = this.makeMenu();

    this.root.append(this.canvas, top, this.tray, this.bubbleEl, this.menuEl);
    mount.replaceChildren(this.root);
    this.renderer = new Renderer(this.canvas);

    this.bindInput();
    if (this.clipMode) this.showTouches();
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endGesture();
        this.save();
      }
      this.last = performance.now();
      this.acc = 0;
    });
    addEventListener('pagehide', () => this.save());
    // A lost pointerup (app switch, notification) must never leave the laser firing.
    addEventListener('blur', () => this.endGesture());
    (window as unknown as { __rockhopper: unknown }).__rockhopper = this;
    void document.fonts?.load('20px "Lilita One"').catch(() => {});
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------ DOM

  private makeTool(kind: 'drill' | 'smelter', label: string) {
    const wrap = el('div', 'rh-tool-wrap');
    const button = el('button', 'rh-tool');
    button.setAttribute('aria-label', label);
    button.dataset.kind = kind;
    const icon = el('canvas', 'rh-tool-icon');
    icon.width = 104;
    icon.height = 104;
    const c = icon.getContext('2d')!;
    if (kind === 'drill') {
      c.translate(52, 52);
      c.rotate(Math.PI);
      c.translate(-30, -36);
      c.scale(0.6, 0.6);
      drawDrill(c);
    } else {
      c.translate(10, 8);
      c.scale(0.62, 0.62);
      drawSmelter(c);
    }
    button.append(icon);
    const price = el('div', 'rh-price', `${COIN_SVG}<span>10</span>`);
    wrap.append(button, price);
    return { button, price };
  }

  private makeMenu() {
    const menu = el('div', 'rh-menu');
    menu.hidden = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Menu');
    const card = el('div', 'rh-menu-card');
    const title = el('div', 'rh-menu-title', 'Paused');
    const sound = el('button', 'rh-pill');
    const setSound = () => (sound.textContent = this.settings.muted ? 'Sound: off' : 'Sound: on');
    setSound();
    sound.addEventListener('click', () => {
      this.settings.muted = !this.settings.muted;
      this.sfx.muted = this.settings.muted;
      saveSettings(this.settings);
      setSound();
    });
    // The crossings experiment can be switched off for comparison; the save remembers it.
    const cross = el('button', 'rh-pill');
    const setCross = () =>
      (cross.textContent = this.state.crossings ? 'Belt crossings: on' : 'Belt crossings: off');
    setCross();
    cross.addEventListener('click', () => {
      this.cmd('setCrossings', !this.state.crossings);
      this.save();
      setCross();
    });
    this.syncCrossingsButton = setCross;
    const restart = el('button', 'rh-pill rh-danger rh-hold', '<span>Hold to restart</span>');
    this.holdButton(restart, 1000, () => {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* ignore */
      }
      this.state = freshState(this.state.seed);
      this.commandLog.length = 0;
      this.shown = 0;
      this.renderer.resetView();
      this.closeBubble();
      this.toggleMenu(false);
      this.save();
    });
    const resume = el('button', 'rh-pill rh-go', 'Resume');
    resume.addEventListener('click', () => this.toggleMenu(false));
    const classic = el(
      'div',
      'rh-menu-foot',
      'Older prototypes: <a href="?mode=works">Asteroid Works</a> · <a href="?mode=tiles">Tile workshop</a>'
    );
    card.append(title, resume, sound, cross, restart, classic);
    menu.append(card);
    menu.addEventListener('pointerdown', (e) => {
      if (e.target === menu) this.toggleMenu(false);
    });
    return menu;
  }

  private syncCrossingsButton: () => void = () => {};

  private toggleMenu(open = this.menuEl.hidden) {
    this.menuEl.hidden = !open;
    if (open) this.syncCrossingsButton();
    this.paused = open;
    if (open) {
      this.endGesture();
      this.save();
    }
  }

  /** A button that fires after being held for `ms`, showing a fill. */
  private holdButton(b: HTMLElement, ms: number, fire: () => void) {
    let start = 0,
      raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      b.style.setProperty('--p', String(p));
      if (p >= 1) {
        stop();
        fire();
      } else raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      start = 0;
      b.style.setProperty('--p', '0');
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      start = performance.now();
      raf = requestAnimationFrame(tick);
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointerleave', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fire();
      }
    });
  }

  private resize() {
    const w = this.root.clientWidth || innerWidth,
      h = this.root.clientHeight || innerHeight;
    this.renderer.resize(w, h, devicePixelRatio || 1);
    this.insetTop = 84;
    // offsetTop ignores the tray's slide-in transform.
    this.insetBottom = Math.max(110, h - this.tray.offsetTop + 8);
    this.renderer.insetTop = this.insetTop;
    this.renderer.insetBottom = this.insetBottom;
  }

  // ------------------------------------------------------------ input

  private local(e: PointerEvent | { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private hit(p: Point): Hit {
    const z = this.renderer.cam.z;
    const s = this.state;
    for (let i = 0; i < SLOTS.length; i++) {
      const d = SLOTS[i];
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (s.slots[i].unlocked && s.slots[i].rock && dist < d.r * CELL * 0.98)
        return { kind: 'rock', slot: i };
    }
    let best: Hit | null = null,
      bestD = Infinity;
    for (const m of s.machines) {
      const q = machinePos(m);
      const reach = Math.max(m.kind === 'drill' ? 18 : 28, 24 / z);
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist < reach && dist < bestD) {
        bestD = dist;
        best = { kind: 'machine', id: m.id };
      }
    }
    if (best) return best;
    if (Math.hypot(p.x, p.y) < HUB_RADIUS + 10) return { kind: 'hub' };
    for (let i = 0; i < SLOTS.length; i++) {
      const d = SLOTS[i];
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (s.slots[i].unlocked && s.slots[i].rock && dist < d.r * CELL * 1.08 + 8)
        return { kind: 'rock', slot: i };
      if (!s.slots[i].unlocked && slotVisible(s, i) && dist < d.r * CELL + 16)
        return { kind: 'locked', slot: i };
    }
    return { kind: 'empty' };
  }

  private bindInput() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    cv.addEventListener('pointerup', (e) => this.onUp(e));
    cv.addEventListener('pointercancel', (e) => this.onUp(e, true));
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.renderer.userZoom = Math.max(
          0.6,
          Math.min(2.2, this.renderer.userZoom * Math.exp(-e.deltaY * 0.0015))
        );
      },
      { passive: false }
    );
    for (const kind of ['drill', 'smelter'] as const) {
      const b = this.tools[kind].button;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.sfx.unlock();
        b.setPointerCapture(e.pointerId);
        const p = this.local(e);
        this.gesture = { type: 'tray', kind, x0: p.x, y0: p.y, dragging: false, button: b };
      });
      b.addEventListener('pointermove', (e) => {
        const g = this.gesture;
        if (g.type !== 'tray' || g.kind !== kind) return;
        const p = this.local(e);
        if (!g.dragging && Math.hypot(p.x - g.x0, p.y - g.y0) > 12) {
          g.dragging = true;
          this.armed = null;
          this.closeBubble();
        }
        if (g.dragging) {
          this.preview(kind, p, undefined);
          if (kind === 'smelter') this.taught.splice = true;
        }
      });
      const finish = (e: PointerEvent, cancel: boolean) => {
        const g = this.gesture;
        if (g.type !== 'tray' || g.kind !== kind) return;
        this.gesture = { type: 'none' };
        const p = this.local(e);
        if (g.dragging) {
          const overTray = p.y > this.renderer.h - this.insetBottom + 10;
          if (!cancel && !overTray) this.place(kind, p, undefined);
          this.overlay.placing = null;
        } else if (!cancel) {
          this.armed =
            this.armed?.kind === kind && this.armed.moving === undefined ? null : { kind };
          this.overlay.placing = this.armed ? { kind, at: null } : null;
          this.closeBubble();
          this.sfx.tap();
        }
      };
      b.addEventListener('pointerup', (e) => finish(e, false));
      b.addEventListener('pointercancel', (e) => finish(e, true));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.armed = this.armed?.kind === kind ? null : { kind };
          this.overlay.placing = this.armed ? { kind, at: null } : null;
        }
      });
    }
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeBubble();
        this.armed = null;
        this.overlay.placing = null;
        if (!this.menuEl.hidden) this.toggleMenu(false);
      }
    });
  }

  private onDown(e: PointerEvent) {
    e.preventDefault();
    this.sfx.unlock();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 2) {
      this.endGesture();
      const [a, b] = [...this.pointers.values()];
      this.gesture = {
        type: 'pinch',
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z0: this.renderer.userZoom,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
      return;
    }
    if (this.pointers.size > 2) return;
    const w = this.renderer.toWorld(p.x, p.y);
    if (this.armed) {
      this.gesture = { type: 'place', x0: p.x, y0: p.y, t0: performance.now() };
      this.preview(this.armed.kind, p, this.armed.moving);
      return;
    }
    const tag = this.renderer.tags.find(
      (t) => p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h
    );
    const hit: Hit = tag ? { kind: 'locked', slot: tag.slot } : this.hit(w);
    if (hit.kind === 'rock') {
      this.closeBubble();
      this.gesture = { type: 'mine', slot: hit.slot };
      this.cmd('setLaser', hit.slot, w);
      this.overlay.finger = w;
    } else if (hit.kind === 'machine') {
      this.gesture = {
        type: 'machine',
        id: hit.id,
        x0: p.x,
        y0: p.y,
        t0: performance.now(),
        dragging: false,
      };
    } else {
      this.gesture = { type: 'tap', hit, x0: p.x, y0: p.y, t0: performance.now(), panning: false };
    }
  }

  private onMove(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    const prev = this.pointers.get(e.pointerId)!;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    const g = this.gesture;
    const w = this.renderer.toWorld(p.x, p.y);
    if (g.type === 'pinch') {
      const [a, b] = [...this.pointers.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.renderer.userZoom = Math.max(0.6, Math.min(2.2, g.z0 * (d / g.d0)));
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      this.renderer.panBy(mx - g.mx, my - g.my);
      g.mx = mx;
      g.my = my;
    } else if (g.type === 'mine') {
      // Sweeping onto another rock moves the laser with the finger.
      const over = this.hit(w);
      if (over.kind === 'rock') g.slot = over.slot;
      this.cmd('setLaser', g.slot, w);
      this.overlay.finger = w;
    } else if (g.type === 'machine') {
      if (!g.dragging && Math.hypot(p.x - g.x0, p.y - g.y0) > 10) {
        g.dragging = true;
        this.closeBubble();
      }
      if (g.dragging) {
        const snap = this.snapOrRefuse(g.id, p);
        this.overlay.reroute = { id: g.id, at: w, target: snap.target, refused: snap.refused };
      }
    } else if (g.type === 'tap') {
      if (!g.panning && Math.hypot(p.x - g.x0, p.y - g.y0) > 10) g.panning = true;
      if (g.panning) this.renderer.panBy(p.x - prev.x, p.y - prev.y);
    } else if (g.type === 'place' && this.armed) {
      this.preview(this.armed.kind, p, this.armed.moving);
    }
  }

  private onUp(e: PointerEvent, cancel = false) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    const p = this.local(e);
    if (g.type === 'pinch') {
      if (this.pointers.size === 0) this.gesture = { type: 'none' };
      return;
    }
    this.gesture = { type: 'none' };
    if (cancel) {
      this.endGesture(g);
      return;
    }
    if (g.type === 'mine') {
      this.cmd('clearLaser');
      this.overlay.finger = null;
    } else if (g.type === 'machine') {
      if (g.dragging) {
        const { target, refused } = this.snapOrRefuse(g.id, p);
        if (target) {
          if (this.cmd('route', g.id, target) !== true) this.sfx.deny();
          else if (target.kind !== 'dock') this.taught.join = true;
        } else if (refused) this.sfx.deny();
        this.overlay.reroute = null;
      } else if (performance.now() - g.t0 < 300) this.openBubble({ kind: 'machine', id: g.id });
    } else if (g.type === 'tap' && !g.panning && performance.now() - g.t0 < 300) {
      if (g.hit.kind === 'hub') this.openBubble({ kind: 'hub' });
      else if (g.hit.kind === 'locked') this.openBubble({ kind: 'locked', slot: g.hit.slot });
      else this.closeBubble();
    } else if (g.type === 'place' && this.armed) {
      const done = this.place(this.armed.kind, p, this.armed.moving);
      if (done) {
        this.armed = null;
        this.overlay.placing = null;
      } else
        this.overlay.placing = {
          kind: this.overlay.placing?.kind ?? 'drill',
          at: null,
          moving: this.overlay.placing?.moving,
        };
    }
  }

  private endGesture(g: Gesture = this.gesture) {
    if (g.type === 'mine') this.cmd('clearLaser');
    if (g.type === 'tray') this.overlay.placing = null;
    this.overlay.finger = null;
    this.overlay.reroute = null;
    this.gesture = { type: 'none' };
  }

  /** Nearest valid output target within reach of the finger. */
  private snapTarget(id: number, screen: Point): Target | null {
    return this.snapOrRefuse(id, screen).target;
  }

  /**
   * The nearest target within reach of the finger, or, when the nearest one is refused because
   * its belt would run under a machine, that refusal (so a drop there says why, instead of
   * silently snapping elsewhere or doing nothing).
   */
  private snapOrRefuse(
    id: number,
    screen: Point
  ): { target: Target | null; refused: (Point & { why: string }) | null } {
    const m = byId(this.state, id);
    if (!m) return { target: null, refused: null };
    const w = this.renderer.toWorld(screen.x, screen.y);
    const reach = 40 / this.renderer.cam.z;
    let best: Target | null = null,
      bestD = reach,
      refused: (Point & { why: string }) | null = null,
      refusedD = reach;
    const consider = (t: Target, q: Point, extra = 0) => {
      const same = m.out && sameTarget(m.out.to, t);
      const d = Math.hypot(q.x - w.x, q.y - w.y) - extra;
      if (!same && !canTarget(this.state, m, t)) {
        if (d < refusedD && targetWhy(this.state, m, t) === 'belt blocked') {
          refusedD = d;
          refused = { x: q.x, y: q.y, why: 'belt blocked' };
        }
        return;
      }
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    };
    for (let i = 0; i < this.state.docks; i++) consider({ kind: 'dock', index: i }, dockPos(i));
    // Machines are big targets: a smelter, or a drill acting as a junction.
    for (const x of this.state.machines)
      consider({ kind: x.kind, id: x.id } as Target, machinePos(x), x.kind === 'smelter' ? 12 : 4);
    if (!best && Math.hypot(w.x, w.y) < HUB_RADIUS + 20) {
      // Dropped on the hub body: take the nearest free dock.
      let bd = Infinity;
      for (let i = 0; i < this.state.docks; i++) {
        const t: Target = { kind: 'dock', index: i };
        if (!canTarget(this.state, m, t)) continue;
        const q = dockPos(i);
        const d = Math.hypot(q.x - w.x, q.y - w.y);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
    }
    if (refused && refusedD < bestD) return { target: null, refused };
    return { target: best, refused: null };
  }

  private placeSpot(kind: 'drill' | 'smelter', screen: Point, moving?: number) {
    const z = this.renderer.cam.z;
    if (kind === 'drill') {
      const w = this.renderer.toWorld(screen.x, screen.y - 30);
      // Anywhere on a rock's rim: the ghost follows the finger around it, and slides at most one
      // drill's width to clear a neighbour. A full rock or a crowded spot refuses with a reason.
      const rim = nearestRim(this.state, w, Math.max(90, 70 / z), moving);
      if (!rim) return { at: { ...w, ok: false, angle: 0 }, sock: null };
      const q = rimPos(rim.slot, rim.angle);
      const at = {
        ...q,
        ok: !rim.why,
        angle: rim.angle + Math.PI / 2,
        why: rim.why || undefined,
        slot: rim.slot,
      };
      return { at, sock: rim.why ? null : rim };
    }
    const w = this.renderer.toWorld(screen.x, screen.y - 56);
    // Dropped on a belt, a smelter goes into that line: the crosshair snaps onto the belt when
    // within 12 px. A second belt right at the snap point (a crossing) refuses the drop.
    const sm = moving === undefined ? null : byId(this.state, moving);
    const mover = sm?.kind === 'smelter' ? sm : null;
    const near = beltsNear(this.state, w, Math.max(8, 12 / z)).filter(
      (b) =>
        b.id !== moving &&
        !(mover && this.state.machines.some((x) => x.id === b.id && feedsId(x, mover.id)))
    );
    // Slide along the belt under the crosshair (at most a smelter's width) to the nearest spot
    // with room, a long enough feed and no crossing: the player picks the line, the game finds
    // the footing. A smelter never lands on a belt it isn't part of: that drop is refused.
    const reach = SMELTER_RADIUS * 2;
    let why = '';
    for (const hit of near) {
      const owner = byId(this.state, hit.id)!;
      if (!canSplice(this.state, owner, mover, hit.q, true)) {
        why ||= spliceRefusal(this.state, owner, mover, hit.q);
        continue;
      }
      const e = beltEndsOf(this.state, owner)!;
      const len = Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) || 1;
      for (let d = 0; d <= reach; d += 2) {
        for (const dir of d ? [1, -1] : [1]) {
          const t = hit.t + (dir * d) / len;
          if (t < 0 || t > 1) continue;
          const q = { x: e.a.x + (e.b.x - e.a.x) * t, y: e.a.y + (e.b.y - e.a.y) * t };
          const spot = smelterSpotWhy(this.state, q, moving, hit.id);
          if (spot || !canSplice(this.state, owner, mover, q)) {
            why ||= spot || spliceRefusal(this.state, owner, mover, q);
            continue;
          }
          const crossing = beltsNear(this.state, q, Math.max(3, 4 / z)).some(
            (b) => b.id !== hit.id && b.id !== moving
          );
          if (crossing) {
            why = 'crossing';
            continue;
          }
          return { at: { ...q, ok: true, splice: hit.id }, sock: null };
        }
      }
    }
    if (near.length)
      return { at: { ...near[0].q, ok: false, splice: near[0].id, why }, sock: null };
    const lone = smelterSpotWhy(this.state, w, moving);
    return { at: { ...w, ok: !lone, why: lone || undefined }, sock: null };
  }

  private preview(kind: 'drill' | 'smelter', screen: Point, moving?: number) {
    this.overlay.placing = { kind, at: this.placeSpot(kind, screen, moving).at, moving };
  }

  private place(kind: 'drill' | 'smelter', screen: Point, moving?: number): boolean {
    const spot = this.placeSpot(kind, screen, moving);
    let r: true | string = 'blocked';
    if (moving !== undefined) {
      if (kind === 'drill' && spot.sock)
        r = this.cmd('moveDrill', moving, spot.sock.slot, spot.sock.angle);
      else if (kind === 'smelter' && spot.at.ok)
        r = this.cmd('moveSmelter', moving, pt(spot.at), splice(spot.at));
    } else if (kind === 'drill' && spot.sock)
      r = this.cmd('buildDrill', spot.sock.slot, spot.sock.angle);
    else if (kind === 'smelter' && spot.at.ok)
      r = this.cmd('buildSmelter', pt(spot.at), splice(spot.at));
    if (r !== true) {
      this.sfx.deny();
      if (r === 'credits') this.flashCounter();
      return false;
    }
    if (kind === 'smelter') {
      this.taught.splice = true;
      const sm = moving ?? this.state.machines[this.state.machines.length - 1]?.id;
      const m = sm === undefined ? null : byId(this.state, sm);
      // A standalone smelter with nothing to do: show dragging a drill onto it, once.
      if (m && !m.out && !inputsOf(this.state, m.id).length && !this.recovered) {
        this.recoverFor = m.id;
      }
    }
    this.save();
    return true;
  }

  private recoverFor: number | null = null;
  private recovered = false;

  private flashCounter() {
    this.counterEl.classList.remove('rh-deny');
    void this.counterEl.offsetWidth;
    this.counterEl.classList.add('rh-deny');
  }

  // ------------------------------------------------------------ bubbles

  private openBubble(b: Bubble) {
    this.bubble = b;
    this.bubbleKey = '';
    this.overlay.selected = b.kind === 'machine' ? b.id : b.kind === 'hub' ? 'hub' : null;
    this.sfx.tap();
    this.renderBubble();
  }

  private closeBubble() {
    this.bubble = null;
    this.overlay.selected = null;
    this.bubbleEl.hidden = true;
  }

  private bubbleAnchor(): Point | null {
    const b = this.bubble;
    if (!b) return null;
    if (b.kind === 'hub') return { x: 0, y: -HUB_RADIUS };
    if (b.kind === 'locked')
      return { x: SLOTS[b.slot].x, y: SLOTS[b.slot].y - SLOTS[b.slot].r * CELL };
    const m = byId(this.state, b.id);
    return m ? machinePos(m) : null;
  }

  private renderBubble() {
    const b = this.bubble;
    const s = this.state;
    if (!b) return;
    const cost = (n: number | null) =>
      n === null ? 'MAX' : `${COIN_SVG}<b>${formatNumber(n)}</b>`;
    let key = '';
    let build: () => void = () => {};
    if (b.kind === 'machine') {
      const m = byId(s, b.id);
      if (!m) return this.closeBubble();
      const c = upgradeCost(m);
      const wc = widenPrice(s, m);
      const limited = m.full && !!m.out;
      const crossing = m.cross && !!m.out;
      key = `m${m.id}:${m.level}:${c}:${m.tier}:${wc}:${limited}:${crossing}:${!!m.out}:${m.kind === 'smelter' && m.jam}`;
      build = () => {
        const up = el(
          'button',
          'rh-pill rh-go rh-stack',
          `<span class="rh-lv">Lv ${m.level}</span><span>${c === null ? 'MAX' : `Up ${cost(c)}`}</span>`
        );
        up.setAttribute(
          'aria-label',
          c === null ? 'Fully upgraded' : `Upgrade to level ${m.level + 1} for ${c}`
        );
        this.bubbleRefresh = () => {
          up.classList.toggle('rh-poor', c === null || this.state.credits < c);
          wide.classList.toggle('rh-poor', wc === null || this.state.credits < wc);
        };
        this.repeatButton(up, () => {
          const r = this.cmd('upgrade', m.id);
          if (r !== true) {
            if (r === 'credits') this.flashCounter();
            return false;
          }
          return true;
        });
        // Widen: the machine's own output belt, one tier (bigger bundles) at a time.
        const wide = el(
          'button',
          'rh-pill rh-go rh-stack rh-widen',
          `<span class="rh-lv">Belt ${m.tier}/${BELT_TIER_MAX}</span><span>${wc === null ? 'MAX' : `Widen ${cost(wc)}`}</span>`
        );
        wide.setAttribute(
          'aria-label',
          wc === null
            ? 'Belt fully widened'
            : `Widen belt to carry ${Math.round(beltCapacity(m.tier + 1))} per second for ${wc}`
        );
        this.repeatButton(wide, () => {
          const r = this.cmd('widen', m.id);
          if (r === 'credits') this.flashCounter();
          return r === true;
        });
        const move = el(
          'button',
          'rh-round rh-move',
          '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M11 2 V20 M2 11 H20 M11 2 L8 5 M11 2 L14 5 M11 20 L8 17 M11 20 L14 17 M2 11 L5 8 M2 11 L5 14 M20 11 L17 8 M20 11 L17 14"/></svg>'
        );
        move.setAttribute('aria-label', 'Move');
        move.title = 'Move';
        move.addEventListener('click', () => {
          this.armed = { kind: m.kind, moving: m.id };
          this.overlay.placing = { kind: m.kind, at: null, moving: m.id };
          this.closeBubble();
        });
        const sellB = el(
          'button',
          'rh-round rh-sell rh-hold',
          '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M4 7 H18 M8 7 V4 H14 V7 M6 7 L7 19 H15 L16 7"/></svg>'
        );
        sellB.setAttribute('aria-label', `Hold to sell for ${sellValue(m)}`);
        sellB.title = `Hold to sell (+${formatNumber(sellValue(m))})`;
        this.holdButton(sellB, 600, () => {
          this.cmd('sell', m.id);
          this.closeBubble();
          this.save();
        });
        const gap = el('span', 'rh-gap');
        const row = el('div', 'rh-row');
        row.append(up, wide, move, gap, sellB);
        const note = el(
          'div',
          'rh-note',
          !m.out
            ? 'No link: drag from it onto a drill, smelter or dock'
            : crossing
              ? '<b>Waits at a crossing</b>: untangle it, or widen'
              : limited
                ? '<b>Belt-limited</b>: widen the belt'
                : m.kind === 'smelter' && m.jam
                  ? '<b>Smelter-limited</b>: upgrade the smelter'
                  : ''
        );
        note.hidden = !note.innerHTML;
        this.bubbleEl.replaceChildren(note, row);
      };
    } else if (b.kind === 'hub') {
      const items: [HubUpgrade, string, string][] = [
        ['laser', 'Laser', `${s.laserLevel}/${LASER_POWER.length}`],
        ['docks', 'Docks', `${s.docks}/${DOCKS_MAX}`],
        ['tractor', 'Tractor', `${s.tractorLevel}/${TRACTOR_MAX}`],
      ];
      key = `hub:${items.map(([w]) => hubCost(s, w)).join(',')}`;
      build = () => {
        const buttons = items.map(([what, name, lv]) => {
          const c = hubCost(s, what);
          const btn = el(
            'button',
            'rh-pill rh-go rh-stack',
            `<span class="rh-lv">${name} ${lv}</span><span>${cost(c)}</span>`
          );
          btn.dataset.cost = String(c ?? Infinity);
          btn.setAttribute('aria-label', c === null ? `${name} maxed` : `Upgrade ${name} for ${c}`);
          this.repeatButton(btn, () => {
            const r = this.cmd('upgradeHub', what);
            if (r === 'credits') this.flashCounter();
            return r === true;
          });
          return btn;
        });
        this.bubbleEl.replaceChildren(...buttons);
        this.bubbleRefresh = () =>
          buttons.forEach((x) =>
            x.classList.toggle('rh-poor', this.state.credits < Number(x.dataset.cost))
          );
      };
    } else {
      const c = unlockCost(s, b.slot);
      if (c === null) return this.closeBubble();
      key = `lock${b.slot}`;
      build = () => {
        const def = SLOTS[b.slot];
        const chip = el('canvas', 'rh-chip');
        chip.width = 36;
        chip.height = 36;
        const cc = chip.getContext('2d')!;
        cc.translate(18, 18);
        drawChunk(cc, def.signature, 9);
        const btn = el('button', 'rh-pill rh-go', `Unlock ${cost(c)}`);
        btn.prepend(chip);
        btn.setAttribute(
          'aria-label',
          `Unlock this ${ORES[def.signature].name.toLowerCase()}-rich slot for ${c}`
        );
        this.bubbleRefresh = () => btn.classList.toggle('rh-poor', this.state.credits < c);
        btn.addEventListener('click', () => {
          const r = this.cmd('unlock', b.slot);
          if (r === true) {
            this.closeBubble();
            this.save();
          } else {
            this.sfx.deny();
            this.flashCounter();
          }
        });
        this.bubbleEl.replaceChildren(btn);
      };
    }
    if (key !== this.bubbleKey) {
      this.bubbleKey = key;
      build();
    }
    this.bubbleRefresh();
    this.bubbleEl.hidden = false;
    this.positionBubble();
  }

  private positionBubble() {
    const a = this.bubbleAnchor();
    if (!a || this.bubbleEl.hidden) return;
    let p = this.renderer.toScreen(a);
    const b = this.bubble;
    if (b?.kind === 'locked') {
      // Locked slots may be off-frame: anchor to the price tag actually drawn on screen.
      const tag = this.renderer.tags.find((t) => t.slot === b.slot);
      if (tag) p = { x: tag.x + tag.w / 2, y: tag.y + 6 };
    }
    const w = this.bubbleEl.offsetWidth,
      h = this.bubbleEl.offsetHeight;
    const x = Math.max(8, Math.min(this.renderer.w - w - 8, p.x - w / 2));
    let y = p.y - h - 30;
    if (y < this.insetTop) y = p.y + 44;
    y = Math.max(this.insetTop, Math.min(y, this.renderer.h - this.insetBottom - h));
    this.bubbleEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  /** Tap to buy once; hold to keep buying. `buy` returns false to stop. */
  private repeatButton(b: HTMLElement, buy: () => boolean) {
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      timer = 0;
    };
    const loop = (delay: number) => {
      timer = window.setTimeout(() => {
        if (buy()) loop(Math.max(70, delay * 0.8));
        else stop();
      }, delay);
    };
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!buy()) {
        this.sfx.deny();
        return;
      }
      loop(380);
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointerleave', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        buy();
      }
    });
  }

  // ------------------------------------------------------------ loop

  save() {
    try {
      localStorage.setItem(SAVE_KEY, serialize(this.state));
    } catch {
      /* Private mode: play on without saving. */
    }
    this.lastSave = performance.now();
  }

  private frame(now: number) {
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const s = this.state;
    if (!this.paused && !document.hidden) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= DT && n < 6) {
        step(s);
        this.renderer.consume(s, s.events, this.overlay.reducedMotion);
        this.sfx.events(s.events);
        this.haptics(s.events);
        s.events.length = 0;
        this.acc -= DT;
        n++;
      }
      if (n === 6) this.acc = 0;
    }
    // Build/sell/route events raised outside the tick.
    if (s.events.length) {
      this.renderer.consume(s, s.events, this.overlay.reducedMotion);
      this.sfx.events(s.events);
      s.events.length = 0;
    }
    this.updateHud(dt);
    this.renderer.draw(s, this.paused ? 0 : this.acc / DT, this.paused ? 0 : dt, this.overlay);
    if (this.bubble) this.renderBubble();
    if (now - this.lastSave > 5000) this.save();
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Every command applied this session, for the replay witness (see tools/rockhopper-clip.ts). */
  readonly commandLog: LoggedCommand[] = [];

  private cmd(name: CommandName, ...args: unknown[]): true | string {
    if (this.commandLog.length < 200000) this.commandLog.push([this.state.tick, name, args]);
    return (applyCommand(this.state, name, args) ?? true) as true | string;
  }

  private clipMode = false;
  private lastBuzz = 0;

  /** Light haptics on Android-class devices for the big beats only. */
  private haptics(events: State['events']) {
    if (!('vibrate' in navigator) || this.settings.muted) return;
    // Browsers refuse vibration before the first user gesture.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    if (activation && !activation.hasBeenActive) return;
    const now = performance.now();
    if (now - this.lastBuzz < 90) return;
    const big = events.find(
      (e) => e.type === 'crumble' || e.type === 'unlock' || e.type === 'build'
    );
    const laser = events.find((e) => e.type === 'break' && e.by === 'laser');
    if (big || laser) {
      this.lastBuzz = now;
      try {
        navigator.vibrate(big ? 18 : 6);
      } catch {
        /* Not supported. */
      }
    }
  }

  private updateHud(dt: number) {
    const s = this.state;
    const target = s.credits;
    if (target > this.shown + 0.5) this.bump = 1;
    this.shown += (target - this.shown) * Math.min(1, dt * 14);
    if (Math.abs(target - this.shown) < 0.5) this.shown = target;
    this.bump *= Math.exp(-dt * 12);
    this.creditsEl.textContent = formatNumber(Math.round(this.shown));
    this.counterEl.style.transform = `scale(${1 + this.bump * 0.08})`;

    const nDrills = drills(s).length;
    const showTray = s.earned > 0 || s.credits > 0 || s.machines.length > 0;
    this.tray.classList.toggle('rh-hidden', !showTray);
    const showSmelter = nDrills >= 3 || smelters(s).length > 0 || s.machines.some((m) => !m.out);
    this.tools.smelter.button.parentElement!.classList.toggle('rh-hidden', !showSmelter);
    for (const kind of ['drill', 'smelter'] as const) {
      const price = priceOf(s, kind);
      const t = this.tools[kind];
      const span = t.price.querySelector('span')!;
      const text = formatNumber(price);
      if (span.textContent !== text) span.textContent = text;
      const can = s.credits >= price;
      t.button.classList.toggle('rh-poor', !can);
      t.button.classList.toggle('rh-armed', this.armed?.kind === kind);
      const firstTime =
        can &&
        !this.seenAffordable.has(kind) &&
        (kind === 'drill' ? nDrills === 0 : smelters(s).length === 0 && showSmelter);
      t.button.classList.toggle(
        'rh-pulse',
        firstTime || (kind === 'smelter' && can && s.machines.some((m) => !m.out))
      );
      if (can && kind === 'drill' && nDrills > 0) this.seenAffordable.add(kind);
      if (can && kind === 'smelter' && smelters(s).length > 0) this.seenAffordable.add(kind);
    }
    const r = this.tools.drill.button.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    this.overlay.trayDrill = {
      x: r.left + r.width / 2 - cr.left,
      y: r.top + r.height / 2 - cr.top,
    };
    this.overlay.hintHold =
      s.stats.laserBroken < 3 &&
      nDrills === 0 &&
      !this.overlay.finger &&
      s.credits < priceOf(s, 'drill');
    this.overlay.hintDrag =
      nDrills === 0 &&
      s.credits >= priceOf(s, 'drill') &&
      !this.overlay.finger &&
      !this.overlay.placing &&
      showTray;
    this.logisticsHints(showSmelter, dt);
    this.crossingHints(dt);
    if (this.clipMode) {
      this.overlay.hintCross = null;
      this.overlay.hintHold = this.overlay.hintDrag = false;
      this.overlay.hintJoin = this.overlay.hintSplice = null;
    }
  }

  /**
   * The logistics hands. Splice: the first smelter, from the tray onto a drill's belt. Join: an
   * unlinked drill, dragged onto a neighbouring drill or smelter. Recovery: a standalone smelter
   * with nothing feeding it, with a drill dragged onto it.
   */
  private logisticsHints(showSmelter: boolean, dt: number) {
    const s = this.state;
    const o = this.overlay;
    const busy =
      !!o.finger || !!o.placing || !!o.reroute || !!this.bubble || this.gesture.type !== 'none';
    o.hintSplice = null;
    o.hintJoin = null;
    if (busy) return;
    const learned = s.machines.some((m) => m.out && m.out.to.kind !== 'dock');
    if (learned) this.taught.join = true;
    if (smelters(s).length) this.taught.splice = true;
    const smelterBtn = this.tools.smelter.button.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    if (
      !this.taught.splice &&
      this.spliceHintShown < 25 &&
      showSmelter &&
      s.credits >= priceOf(s, 'smelter') &&
      smelterBtn.width > 0
    ) {
      const line = drills(s).find((d) => d.out?.to.kind === 'dock');
      const e = line && beltEndsOf(s, line);
      if (e) this.spliceHintShown += dt;
      if (e)
        o.hintSplice = {
          from: {
            x: smelterBtn.left + smelterBtn.width / 2 - cr.left,
            y: smelterBtn.top + smelterBtn.height / 2 - cr.top,
          },
          to: { x: e.a.x + (e.b.x - e.a.x) * 0.45, y: e.a.y + (e.b.y - e.a.y) * 0.45 },
        };
      return;
    }
    const pair = (from: Machine, test: (x: Machine) => boolean) => {
      const p = machinePos(from);
      let best: Machine | null = null,
        bd = Infinity;
      for (const x of s.machines) {
        if (x === from || !test(x)) continue;
        if (!canTarget(s, from, { kind: x.kind, id: x.id } as Target)) continue;
        const q = machinePos(x);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bd) {
          bd = d;
          best = x;
        }
      }
      return best;
    };
    if (this.recoverFor !== null) {
      const sm = byId(s, this.recoverFor);
      if (!sm || inputsOf(s, sm.id).length) {
        this.recoverFor = null;
        this.recovered = true;
      } else {
        const at = machinePos(sm);
        const dist = (x: Machine) => Math.hypot(machinePos(x).x - at.x, machinePos(x).y - at.y);
        const feeder = drills(s)
          .filter((x) => canTarget(s, x, { kind: 'smelter', id: sm.id }))
          .sort((a, b) => dist(a) - dist(b))[0];
        if (feeder) o.hintJoin = { from: machinePos(feeder), to: at };
        return;
      }
    }
    if (!this.taught.join) {
      const lonely = drills(s).find((d) => !d.out);
      const to = lonely && pair(lonely, () => true);
      if (lonely && to) o.hintJoin = { from: machinePos(lonely), to: machinePos(to) };
    }
  }

  /**
   * Crossings, taught once: after a crossing has kept bundles waiting for 3 s, a label beside it
   * says why and what to do, for up to 20 s or until it clears. A save from before crossings says
   * once, under the counter, that they are new (and can be switched off in the menu).
   */
  private crossingHints(dt: number) {
    const s = this.state;
    const o = this.overlay;
    if (s.crossingsNotice) {
      this.noticeLeft = 8;
      s.crossingsNotice = undefined;
    }
    this.noticeLeft = Math.max(0, this.noticeLeft - dt);
    o.notice =
      this.noticeLeft > 0 && s.crossings
        ? 'New: crossed belts take turns (menu to switch off)'
        : null;
    o.hintCross = null;
    if (this.taught.cross || !s.crossings) return;
    const x = crossingsOf(s);
    // Keep ringing the same plate while it stays hot, so the ring doesn't hop between plates.
    let hot: { x: number; y: number; key: string } | null =
      x.plates.find((p) => p.key === this.crossKey && (x.heat.get(p.key) ?? 0) > 0.35) ?? null;
    let best = 0.5;
    if (!hot)
      for (const p of x.plates) {
        const h = x.heat.get(p.key) ?? 0;
        if (h > best) {
          best = h;
          hot = p;
        }
      }
    this.crossKey = hot?.key ?? null;
    if (!hot) {
      this.crossHot = 0;
      if (this.crossShown > 0) this.taught.cross = true;
      return;
    }
    this.crossHot += dt;
    if (this.crossHot < 3) return;
    this.crossShown += dt;
    if (this.crossShown > 20) this.taught.cross = true;
    else if (!this.bubble && !o.placing) o.hintCross = { x: hot.x, y: hot.y };
  }

  /** Draw a dot under every real pointer, so captured clips show what the player did. */
  private showTouches() {
    const dots = new Map<number, HTMLElement>();
    const at = (e: PointerEvent) => {
      let dot = dots.get(e.pointerId);
      if (!dot) {
        dot = el('div', 'rh-touch');
        this.root.append(dot);
        dots.set(e.pointerId, dot);
      }
      const r = this.root.getBoundingClientRect();
      dot.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    };
    const up = (e: PointerEvent) => {
      dots.get(e.pointerId)?.remove();
      dots.delete(e.pointerId);
    };
    this.root.addEventListener('pointerdown', at, { capture: true });
    this.root.addEventListener('pointermove', (e) => dots.has(e.pointerId) && at(e), {
      capture: true,
    });
    this.root.addEventListener('pointerup', up, { capture: true });
    this.root.addEventListener('pointercancel', up, { capture: true });
  }
}
