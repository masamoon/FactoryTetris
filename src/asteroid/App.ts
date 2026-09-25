import Phaser from 'phaser';
import { AsteroidScene, type SceneModel } from './Scene';
import {
  advance,
  beltDragPlacementError,
  beltPathError,
  build,
  buildBeltPath,
  cancelQueuedExtension,
  canMine,
  costFor,
  costLabel,
  dispatchCourier,
  drillExtensionError,
  drillRailEnd,
  DOCK,
  extendDrill,
  FRESH_DRILL_SITE,
  THIRD_DRILL_SITE,
  isDock,
  manualInputAmount,
  manualInputError,
  machineAt,
  MAX_DRILLS,
  NAMES,
  objective,
  placementError,
  pocketRemaining,
  processorInput,
  reservedInput,
  removeBelt,
  status,
  tapMine,
  tileAt,
  undo,
  STEP_MS,
  trimHistory,
  WORLD_H,
  WORLD_W,
  type Session,
  type State,
  type Point,
  type Resource,
  type Tool,
  type Direction,
} from './simulation';
import { beltPlacements } from './beltPath';
import { freshSession, parseSave, SAVE_KEY } from './persistence';
import { FactoryAudio } from '../view/audio';

type Mode = 'mine' | Tool | 'transfer';
const TOOLS: Tool[] = ['drill', 'belt', 'smelter', 'assembler'];
const LABEL: Record<Tool, string> = {
  drill: 'Drill',
  belt: 'Conveyor',
  smelter: 'Smelter',
  assembler: 'Assembler',
};
// Tool icons repeat the in-world machine art so a button visibly makes the thing it names.
const ICON: Record<Tool, string> = {
  drill:
    '<svg viewBox="0 0 26 24" aria-hidden="true"><rect x="1" y="3" width="17" height="17" rx="3" fill="#dcae68"/><rect x="4" y="6" width="11" height="10" rx="2" fill="#203242"/><circle cx="9.5" cy="11" r="2.6" fill="none" stroke="#efc985" stroke-width="1.8"/><path d="M19 6.5l6 5-6 5z" fill="#f0bd6d"/></svg>',
  belt: '<svg viewBox="0 0 26 24" aria-hidden="true"><rect x="1" y="7" width="24" height="10" rx="2" fill="#44586a"/><path d="M9 9l-3 3 3 3M15 9l-3 3 3 3M21 9l-3 3 3 3" stroke="#bcd2dc" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  smelter:
    '<svg viewBox="0 0 26 24" aria-hidden="true"><rect x="4" y="3" width="18" height="18" rx="3" fill="#d9835a"/><rect x="7" y="6" width="12" height="11" rx="2" fill="#203242"/><rect x="9" y="10" width="8" height="4" rx="1" fill="#82dccc"/></svg>',
  assembler:
    '<svg viewBox="0 0 26 24" aria-hidden="true"><rect x="4" y="3" width="18" height="18" rx="3" fill="#9f8ccb"/><rect x="7" y="6" width="12" height="11" rx="2" fill="#203242"/><rect x="9.5" y="8" width="7" height="7" rx="1.5" fill="#cbadff"/><circle cx="13" cy="11.5" r="1.4" fill="#211e39"/></svg>',
};
// The tool the current objective asks for; its button glows once it is affordable.
const SUGGESTED: (Tool | null)[] = ['drill', 'drill', 'belt', 'smelter', 'assembler', null, null];
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const mineral = (r: Resource) => `<i class="a-mineral ${r}"></i>`;
const plural = (r: Resource, n: number) => (r === 'plate' && n !== 1 ? 'plates' : r);
const drillSite = (s: State) =>
  s.machines.filter((m) => m.kind === 'drill').length === 1 ? FRESH_DRILL_SITE : THIRD_DRILL_SITE;

export class AsteroidApp {
  session: Session = freshSession();
  scene = new AsteroidScene();
  private mode: Mode = 'mine';
  private direction: Direction = 3;
  private preview: Point | null = null;
  private beltDrag: Point[] | null = null;
  private selected: Point | null = null;
  private manual: Point | null = null;
  private paused = false;
  private modal = false;
  private saving = true;
  private saveTimer = 0;
  private lastSavedTick = -1;
  private last = performance.now();
  private accumulator = 0;
  private message = '';
  private messageUntil = 0;
  private contextHTML = '';
  private lastObjective = 0;
  private goalOpenUntil = 0;
  private shown: Record<Resource, number> = { ore: 0, plate: 0, part: 0 };
  private hintKey = '';
  private hints: Point[] = [];
  private muted = true;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private audio = new FactoryAudio(() => ({
    muted: this.muted,
    reducedMotion: this.reduced,
    volume: 0.3,
    introduced: true,
  }));
  private game: Phaser.Game;
  constructor() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const loaded = parseSave(raw);
      if (loaded) this.session = loaded;
      else if (raw) this.notify('Unreadable save. A fresh outpost is ready.', 8000);
      this.muted = localStorage.getItem('gridforge.asteroid.sound') !== 'on';
    } catch {
      this.saving = false;
    }
    this.lastObjective = objective(this.session.state).step;
    this.shown = { ...this.session.state.stock };
    this.goalOpenUntil = performance.now() + 7000;
    document.body.className = 'asteroid-app';
    document.querySelector('#app')!.innerHTML = `
      <main class="a-world"><div id="a-canvas"></div></main>
      <header class="a-hud" id="a-hud">
        <div class="a-hud-row">
          <div class="a-stocks">${(['ore', 'plate', 'part'] as Resource[]).map((r) => `<div class="a-stock" id="a-stock-${r}">${mineral(r)}<strong id="a-${r}">0</strong><span class="a-sr">${r === 'ore' ? 'ore' : r + 's'}</span></div>`).join('')}</div>
          <button id="a-resume" class="a-pill" hidden>▶ Resume</button>
          <button id="a-menu" class="a-round" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
        <button id="a-goal" class="a-goal" aria-expanded="false"><span id="a-step" class="a-step">1</span><span class="a-goal-text"><b id="a-objective-title"></b><small id="a-objective-detail"></small></span></button>
      </header>
      <div id="a-toast" class="a-toast" role="status"></div>
      <button id="a-home" class="a-round a-home" aria-label="Recenter on collection" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" stroke-width="2"/></svg></button>
      <footer class="a-dock" id="a-dock">
        <div id="a-context"></div>
        <div class="a-tools" id="a-tools">
          <button id="a-undo" class="a-undo" aria-label="Undo last build"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5L4 10l5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a6 6 0 010 12h-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
          ${TOOLS.map((k) => `<button id="a-tool-${k}" data-tool="${k}" aria-label="Build ${NAMES[k]}"><span class="a-ticon">${ICON[k]}</span><b>${LABEL[k]}</b><small id="a-tool-cost-${k}"></small></button>`).join('')}
        </div>
      </footer>
      <div id="a-modal"></div><div id="a-announcer" class="a-sr" aria-live="polite"></div>`;
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'a-canvas',
      backgroundColor: '#080f1b',
      scene: [this.scene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: document.querySelector('#a-canvas')!.clientWidth,
        height: document.querySelector('#a-canvas')!.clientHeight,
      },
      render: { antialias: true, roundPixels: true },
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    this.scene.onTap = (p) => this.tap(p);
    this.scene.onHold = (p) => {
      this.manual =
        this.running() && this.mode === 'mine' && p && !canMine(this.session.state, p) ? p : null;
    };
    this.scene.onPan = () => {
      this.manual = null;
    };
    this.scene.onCamera = () => {
      const home = document.getElementById('a-home')!,
        hidden = this.scene.atHome();
      if (home.hidden !== hidden) home.hidden = hidden;
    };
    this.scene.onBeltDrag = (path, commit) => this.dragBelts(path, commit);
    this.scene.onFeed = (p) => {
      const machine = machineAt(this.session.state, p);
      if (machine) this.dispatchToMachine(machine.id);
    };
    this.scene.onTransferDrop = (p) => {
      const machine = machineAt(this.session.state, p);
      if (machine && !manualInputError(this.session.state, machine))
        this.dispatchToMachine(machine.id);
      else {
        this.notify('Drop on a processor that can accept a batch.');
        this.render();
      }
    };
    this.bind('a-home', () => this.scene.home());
    this.bind('a-menu', () => this.menu());
    this.bind('a-resume', () => this.togglePause());
    this.bind('a-goal', () => {
      this.goalOpenUntil = this.goalOpen() ? 0 : performance.now() + 10000;
      this.render();
    });
    this.bind('a-undo', () => this.undo());
    for (const k of TOOLS) this.bind(`a-tool-${k}`, () => this.selectTool(k));
    document.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.manual = null;
      this.scene.cancelPointer();
      this.accumulator = 0;
      this.last = performance.now();
      if (document.hidden) this.save();
      this.render();
    });
    window.addEventListener('pagehide', () => this.save());
    window.addEventListener('blur', () => {
      this.manual = null;
      this.scene.cancelPointer();
    });
    window.addEventListener('keydown', (e) => this.key(e));
    const canvas = document.querySelector('#a-canvas')!;
    new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (
          canvas.clientWidth !== this.game.scale.width ||
          canvas.clientHeight !== this.game.scale.height
        )
          this.game.scale.resize(canvas.clientWidth, canvas.clientHeight);
        this.updateInsets();
      });
    }).observe(canvas);
    // The HUD and dock float over a full-screen world; the scene keeps content between them.
    const chrome = new ResizeObserver(() => this.updateInsets());
    chrome.observe(document.getElementById('a-hud')!);
    chrome.observe(document.getElementById('a-dock')!);
    if (new URLSearchParams(location.search).has('test'))
      (window as unknown as { asteroid: AsteroidApp }).asteroid = this;
    this.render();
    this.save();
    if (!this.saving) this.notify('Saving is unavailable on this device.', 6000);
    requestAnimationFrame((now) => this.frame(now));
  }
  private bind(id: string, fn: () => void) {
    document.getElementById(id)?.addEventListener('click', fn);
  }
  private running() {
    return (
      !this.paused &&
      (this.mode === 'mine' || this.mode === 'transfer') &&
      !this.modal &&
      !document.hidden
    );
  }
  private planning() {
    return this.mode !== 'mine' && this.mode !== 'transfer';
  }
  private goalOpen() {
    return performance.now() < this.goalOpenUntil;
  }
  private updateInsets() {
    const hud = document.getElementById('a-hud')!.getBoundingClientRect(),
      dock = document.getElementById('a-dock')!.getBoundingClientRect(),
      canvas = document.getElementById('a-canvas')!.getBoundingClientRect(),
      bottom = Math.max(0, canvas.bottom - dock.top);
    (document.getElementById('app') as HTMLElement).style.setProperty('--dock-h', `${bottom}px`);
    this.scene.setInsets(Math.max(0, hud.bottom - canvas.top), bottom);
    const focus = this.selected || this.preview;
    if (focus) this.scene.ensureVisible(focus);
    this.scene.onCamera();
  }
  private frame(now: number) {
    const delta = Math.min(250, now - this.last);
    this.last = now;
    let advanced = false;
    if (this.running()) {
      this.accumulator += delta;
      while (this.accumulator >= STEP_MS) {
        const events = advance(this.session.state, this.manual);
        advanced = true;
        this.scene.emit(events);
        if (events.some((e) => e.type === 'mine')) this.audio.play('work');
        if (events.some((e) => e.type === 'ship') && this.session.state.tick % 9 === 0)
          this.audio.play('ship');
        this.accumulator -= STEP_MS;
      }
    } else this.accumulator = 0;
    if (now - this.saveTimer > 1000 && this.session.state.tick !== this.lastSavedTick) {
      this.saveTimer = now;
      this.save();
    }
    const goal = document.getElementById('a-goal')!;
    if (this.message && now >= this.messageUntil) {
      this.message = '';
      this.render();
    } else if (advanced || goal.classList.contains('open') !== this.goalOpen()) this.render();
    requestAnimationFrame((time) => this.frame(time));
  }
  private notify(message: string, duration = 3800) {
    this.message = message;
    this.messageUntil = performance.now() + duration;
    const announcer = document.getElementById('a-announcer');
    if (announcer) announcer.textContent = message;
  }
  private resetTransient() {
    this.preview = null;
    this.beltDrag = null;
    this.selected = null;
    this.manual = null;
    this.scene.cancelPointer();
  }
  private selectTool(tool: Tool) {
    const leaving = this.mode === tool;
    this.resetTransient();
    this.message = '';
    // Tapping the active tool again returns to live mining, like the Done button.
    this.mode = leaving ? 'mine' : tool;
    if (leaving) this.paused = false;
    this.render();
  }
  private exitPlanning() {
    this.resetTransient();
    this.mode = 'mine';
    this.paused = false;
    this.render();
  }
  private togglePause() {
    if (this.planning()) return this.exitPlanning();
    if (this.mode === 'transfer') this.mode = 'mine';
    this.paused = !this.paused;
    this.manual = null;
    this.scene.cancelPointer();
    this.render();
  }
  private undo() {
    this.manual = null;
    this.scene.cancelPointer();
    if (undo(this.session)) {
      if (this.mode === 'transfer') this.mode = 'mine';
      this.preview = null;
      this.beltDrag = null;
      this.selected = null;
      this.lastObjective = objective(this.session.state).step;
      this.shown = { ...this.session.state.stock };
      this.notify('Rewound the last build and all production since.');
      this.save();
    }
    this.render();
  }
  private tap(p: Point) {
    if (this.modal) return;
    if (this.mode === 'transfer') {
      if (isDock(p)) {
        this.mode = 'mine';
        this.notify('Manual delivery cancelled.');
      } else {
        const machine = machineAt(this.session.state, p);
        if (machine) this.dispatchToMachine(machine.id);
        else this.notify('Tap a glowing smelter or assembler.');
      }
      this.render();
      return;
    }
    if (this.mode === 'mine') {
      this.selected = null;
      if (isDock(p)) {
        if (this.session.state.courier.phase !== 'idle') {
          this.notify(
            this.session.state.courier.phase === 'outbound'
              ? 'The service drone is making a delivery.'
              : 'The service drone is returning to collection.'
          );
        } else {
          this.mode = 'transfer';
          this.manual = null;
          this.scene.cancelPointer();
        }
        this.render();
        return;
      }
      const machine = machineAt(this.session.state, p);
      if (machine) {
        this.selected = p;
        this.manual = null;
        this.render();
        this.scene.ensureVisible(p);
        return;
      }
      if (this.paused) {
        this.notify('Paused. Tap Resume to mine.');
        this.render();
        return;
      }
      const events: Parameters<AsteroidScene['emit']>[0] = [];
      const error = tapMine(this.session.state, p, events);
      if (error) {
        if (tileAt(this.session.state, p)) this.notify(error);
      } else this.scene.emit(events);
    } else if (this.preview && this.preview.x === p.x && this.preview.y === p.y) {
      // A second tap on the ghost builds it, keeping the thumb on the world.
      this.confirm();
      return;
    } else {
      this.preview = p;
      this.render();
      this.scene.ensureVisible(p);
      return;
    }
    this.render();
  }
  private confirm() {
    if (!this.preview || !this.planning()) return;
    const tool = this.mode as Tool,
      p = this.preview,
      error = build(this.session, tool, p, this.direction);
    if (error) {
      this.notify(error);
      this.render();
      return;
    }
    this.audio.play('place');
    this.scene.emit([{ type: 'build', from: p }]);
    this.preview = null;
    this.message = '';
    this.save();
    // Single conveyors stay in planning for precise runs; machines go straight back to live.
    if (tool !== 'belt') {
      this.mode = 'mine';
      this.paused = false;
    }
    this.render();
  }
  private dragBelts(path: Point[] | null, commit: boolean) {
    if (this.modal || this.mode !== 'belt') return;
    if (!path) {
      if (this.beltDrag) {
        this.beltDrag = null;
        this.render();
      }
      return;
    }
    this.preview = null;
    this.beltDrag = path;
    if (!commit) {
      this.render();
      return;
    }
    const placements = beltPlacements(path, this.direction),
      changed = placements.filter((p) => !machineAt(this.session.state, p)),
      error = buildBeltPath(this.session, placements);
    this.beltDrag = null;
    if (error) this.notify(error);
    else if (changed.length) {
      this.message = '';
      this.audio.play('place');
      this.scene.emit(changed.map((from) => ({ type: 'build' as const, from })));
      this.save();
      // A drawn route is usually complete: resume the clock so cargo moves immediately.
      this.mode = 'mine';
      this.paused = false;
    }
    this.render();
  }
  private selectedMachine() {
    return this.selected ? machineAt(this.session.state, this.selected) : undefined;
  }
  private extendSelectedDrill() {
    const drill = this.selectedMachine();
    if (!drill) return;
    const error = extendDrill(this.session, drill.id);
    if (error) {
      this.notify(error);
      this.render();
      return;
    }
    this.audio.play('place');
    this.notify(
      drill.extension?.queued
        ? 'Kit reserved. The tender leaves once the pocket and loads clear.'
        : 'Extension kit launched. The tender installs it automatically.'
    );
    this.save();
    this.render();
  }
  private previewFreshDrill() {
    const site = drillSite(this.session.state);
    this.resetTransient();
    this.mode = 'drill';
    this.preview = { ...site };
    this.scene.focus(site.x, site.y);
    this.render();
  }
  private rotateSelectedBelt() {
    const belt = this.selectedMachine();
    if (!belt || belt.kind !== 'belt') return;
    const error = build(
      this.session,
      'belt',
      { x: belt.x, y: belt.y },
      ((belt.direction + 1) % 4) as Direction
    );
    if (error) this.notify(error);
    else {
      this.audio.play('place');
      this.save();
    }
    this.render();
  }
  private removeSelectedBelt() {
    if (!this.selected) return;
    const error = removeBelt(this.session, this.selected);
    if (error) this.notify(error);
    else {
      this.audio.play('click');
      this.selected = null;
      this.save();
    }
    this.render();
  }
  private dispatchToMachine(id: number) {
    const machine = this.session.state.machines.find((m) => m.id === id);
    if (!machine) return;
    const resource = processorInput(machine),
      amount = manualInputAmount(machine),
      error = dispatchCourier(this.session, machine.id);
    if (error || !resource) {
      this.notify(error || 'Choose a smelter or assembler.');
      this.render();
      return;
    }
    this.mode = 'mine';
    this.selected = null;
    this.audio.play('place');
    this.scene.emit([
      {
        type: 'courier-load',
        from: { ...DOCK },
        to: { x: DOCK.x, y: DOCK.y - 0.72 },
        resource,
        amount,
      },
    ]);
    this.notify(
      `Drone carrying ${amount} ${plural(resource, amount)} to the ${NAMES[machine.kind]}.`
    );
    this.save();
    this.render();
  }
  private save() {
    try {
      localStorage.setItem(SAVE_KEY, trimHistory(this.session));
      this.lastSavedTick = this.session.state.tick;
      this.saving = true;
    } catch {
      this.saving = false;
    }
  }
  private setText(id: string, value: string) {
    const el = document.getElementById(id)!;
    if (el.textContent !== value) el.textContent = value;
  }
  private setHTML(id: string, value: string) {
    const el = document.getElementById(id)!;
    if (el.dataset.html !== value) {
      el.dataset.html = value;
      el.innerHTML = value;
    }
  }
  private costHTML(tool: Tool, s: State) {
    if (tool === 'drill' && s.machines.filter((m) => m.kind === 'drill').length >= MAX_DRILLS)
      return 'max';
    const entries = Object.entries(costFor(s, tool)) as [Resource, number][];
    return entries.length ? entries.map(([r, n]) => `${mineral(r)}${n}`).join(' ') : 'free';
  }
  private affordable(tool: Tool, s: State) {
    if (tool === 'drill' && s.machines.filter((m) => m.kind === 'drill').length >= MAX_DRILLS)
      return false;
    const cost = costFor(s, tool);
    return (['ore', 'plate', 'part'] as Resource[]).every((r) => s.stock[r] >= (cost[r] || 0));
  }
  /** Valid build sites worth pointing at: drill faces, or empty conveyors a processor can join. */
  private siteHints(s: State): Point[] {
    if (this.mode !== 'drill' && this.mode !== 'smelter' && this.mode !== 'assembler') return [];
    const key = `${this.mode}:${s.tick}:${s.machines.length}:${s.stock.ore}:${s.stock.plate}:${s.mined}`;
    if (key === this.hintKey) return this.hints;
    const hints: Point[] = [];
    if (this.mode === 'drill') {
      const sites: Point[] = [];
      for (let y = 0; y < WORLD_H; y++)
        for (let x = 0; x < WORLD_W - 1; x++)
          if (!tileAt(s, { x, y }) && !placementError(s, 'drill', { x, y })) sites.push({ x, y });
      // Prefer the few sites whose shaft ends in a surveyed pocket, else faces touching rock.
      const surveyed = sites.filter((p) => s.pockets[`${p.x + 8},${p.y}`]);
      hints.push(
        ...(surveyed.length ? surveyed : sites.filter((p) => tileAt(s, { x: p.x + 1, y: p.y })))
      );
    } else
      for (const m of s.machines)
        if (m.kind === 'belt' && !placementError(s, this.mode, m)) hints.push({ x: m.x, y: m.y });
    this.hintKey = key;
    this.hints = hints;
    return hints;
  }
  private render() {
    const s = this.session.state,
      goal = objective(s),
      now = performance.now();
    // Resources: plates and parts appear once they matter; every increase gives a small bump.
    for (const r of ['ore', 'plate', 'part'] as Resource[]) {
      this.setText(`a-${r}`, String(s.stock[r]));
      const box = document.getElementById(`a-stock-${r}`)!,
        visible =
          r === 'ore' ||
          s.stock[r] > 0 ||
          s.delivered[r] > 0 ||
          s.machines.some((m) => m.kind === (r === 'plate' ? 'smelter' : 'assembler'));
      if (box.hidden === visible) box.hidden = !visible;
      if (s.stock[r] > this.shown[r] && !this.reduced) {
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
      }
    }
    this.shown = { ...s.stock };
    this.setText('a-step', String(goal.step + 1));
    this.setText('a-objective-title', goal.title);
    this.setText('a-objective-detail', goal.detail);
    const goalEl = document.getElementById('a-goal')!;
    if (goal.step > this.lastObjective) {
      this.lastObjective = goal.step;
      this.goalOpenUntil = now + 7000;
      this.audio.play('milestone');
      if (!this.reduced) {
        goalEl.classList.remove('advance');
        void goalEl.offsetWidth;
        goalEl.classList.add('advance');
      }
    }
    goalEl.classList.toggle('open', this.goalOpen());
    goalEl.setAttribute('aria-expanded', String(this.goalOpen()));
    const resume = document.getElementById('a-resume')!;
    if (resume.hidden === (this.paused && !this.planning()))
      resume.hidden = !(this.paused && !this.planning());
    // Tools stay hidden until the first block breaks, so the opening frame is only the world.
    const tools = document.getElementById('a-tools')!,
      toolsVisible =
        (s.mined > 0 ||
          s.machines.length > 0 ||
          s.stock.ore + s.stock.plate + s.stock.part > 0 ||
          this.session.history.length > 0) &&
        !this.selectedMachine() &&
        this.mode !== 'transfer';
    if (tools.hidden === toolsVisible) tools.hidden = !toolsVisible;
    const undoButton = document.getElementById('a-undo') as HTMLButtonElement;
    undoButton.disabled = !this.session.history.length;
    const suggested = this.mode === 'mine' ? SUGGESTED[goal.step] : null;
    for (const tool of TOOLS) {
      this.setHTML(`a-tool-cost-${tool}`, this.costHTML(tool, s));
      const button = document.getElementById(`a-tool-${tool}`)!,
        active = tool === this.mode,
        ready = this.affordable(tool, s);
      button.classList.toggle('active', active);
      button.classList.toggle('short', !ready && !active);
      button.classList.toggle('suggest', ready && tool === suggested);
      button.setAttribute('aria-pressed', String(active));
    }
    const toast = document.getElementById('a-toast')!,
      toastText = this.message && now < this.messageUntil ? this.message : '';
    if (toast.textContent !== toastText) toast.textContent = toastText;
    toast.classList.toggle('show', !!toastText);

    let context = '',
      preview: SceneModel['preview'] = null,
      beltPreview: SceneModel['beltPreview'] = [],
      transferTargets: SceneModel['transferTargets'] = [];
    const dragPlacements = this.beltDrag ? beltPlacements(this.beltDrag, this.direction) : [],
      dragError = dragPlacements.length ? beltPathError(s, dragPlacements) : null;
    if (this.mode === 'transfer' || this.mode === 'mine')
      transferTargets = s.machines
        .filter((m) => processorInput(m) && !manualInputError(s, m))
        .map((m) => ({ x: m.x, y: m.y }));
    const selected = this.selectedMachine();
    if (this.mode === 'transfer') {
      context = `<div class="a-bar a-live"><span class="a-live-dot"></span><p><b>Manual delivery</b><small>${transferTargets.length ? 'Tap a glowing processor. The drone carries real stock from collection.' : 'No processor can take collection stock right now.'}</small></p><button id="a-cancel-transfer">Cancel</button></div>`;
    } else if (dragPlacements.length) {
      beltPreview = dragPlacements.map((p) => ({
        ...p,
        valid: !beltDragPlacementError(s, p),
      }));
      context = `<div class="a-bar ${dragError ? 'invalid' : ''}"><p><b>${dragError ? escape(dragError) : `${dragPlacements.length} conveyor${dragPlacements.length === 1 ? '' : 's'} · free`}</b><small>${dragError ? 'Release to cancel this route.' : 'Release to build. Cargo flows the way you drag.'}</small></p></div>`;
    } else if (this.preview && this.planning()) {
      const tool = this.mode as Tool,
        surveyedPocket =
          tool === 'drill' ? s.pockets[`${this.preview.x + 8},${this.preview.y}`] || 0 : 0,
        error = placementError(s, tool, this.preview);
      preview = { ...this.preview, kind: tool, direction: this.direction, valid: !error };
      const detail =
        tool === 'drill'
          ? `Digs 8 squares right${surveyedPocket ? ` · ${surveyedPocket} ore deep pocket at end` : ''}`
          : tool === 'belt'
            ? 'Tap again to build · arrow sets direction'
            : 'Input right · output left · tap again to build';
      context = `<div class="a-bar ${error ? 'invalid' : ''}"><span class="a-bar-icon">${ICON[tool]}</span><p><b>${error ? escape(error) : `${NAMES[tool]} · ${costLabel(tool, s)}`}</b><small>${escape(detail)}</small></p>${tool === 'belt' ? `<button id="a-rotate" class="a-square" aria-label="Rotate conveyor">${['↑', '→', '↓', '←'][this.direction]}</button>` : ''}<button id="a-cancel" class="a-square" aria-label="Cancel preview">✕</button><button id="a-confirm" class="a-primary" ${error ? 'disabled' : ''}>Build</button></div>`;
    } else if (selected) {
      context = this.inspectorHTML(s, selected);
    } else if (this.planning()) {
      const tool = this.mode as Tool,
        hint =
          tool === 'drill'
            ? this.siteHints(s).length
              ? 'Tap a glowing face. The shaft digs right.'
              : this.affordable(tool, s)
                ? 'Clear space beside rock first.'
                : `Need ${costLabel(tool, s)}. Mine more rock.`
            : tool === 'belt'
              ? 'Drag from an output to its destination.'
              : this.affordable(tool, s)
                ? 'Tap a conveyor or clear square. Feeds from the right.'
                : `Need ${costLabel(tool, s)} in collection.`;
      context = `<div class="a-bar a-planning"><span class="a-bar-icon">${ICON[tool]}</span><p><b>${NAMES[tool]} <span class="a-paused">⏸ time stopped</span></b><small>${escape(hint)}</small></p>${tool === 'belt' ? `<button id="a-rotate" class="a-square" aria-label="Rotate conveyor">${['↑', '→', '↓', '←'][this.direction]}</button>` : ''}<button id="a-done" class="a-primary">Done</button></div>`;
    }
    const el = document.getElementById('a-context')!;
    if (this.contextHTML !== context) {
      this.contextHTML = context;
      el.innerHTML = context;
      this.bind('a-confirm', () => this.confirm());
      this.bind('a-cancel', () => {
        this.preview = null;
        this.render();
      });
      this.bind('a-done', () => this.exitPlanning());
      this.bind('a-cancel-transfer', () => {
        this.mode = 'mine';
        this.render();
      });
      this.bind('a-rotate', () => {
        this.direction = ((this.direction + 1) % 4) as Direction;
        this.render();
      });
      this.bind('a-close-inspect', () => {
        this.selected = null;
        this.render();
      });
      this.bind('a-extend-drill', () => this.extendSelectedDrill());
      this.bind('a-cancel-extension', () => {
        const drill = this.selectedMachine();
        if (!drill) return;
        const error = cancelQueuedExtension(this.session, drill.id);
        this.notify(error || 'Queued kit cancelled. One part returned.');
        this.save();
        this.render();
      });
      this.bind('a-new-drill', () => this.previewFreshDrill());
      this.bind('a-dispatch-machine', () => {
        const machine = this.selectedMachine();
        if (machine) this.dispatchToMachine(machine.id);
      });
      this.bind('a-rotate-belt', () => this.rotateSelectedBelt());
      this.bind('a-remove-belt', () => this.removeSelectedBelt());
      this.bind('a-view-head', () => {
        const drill = this.selectedMachine();
        if (drill)
          this.scene.focus(
            drill.extension?.targetEnd ?? Math.min(drill.head, drillRailEnd(drill)),
            drill.y
          );
      });
    }
    this.scene.setModel({
      state: s,
      mode: this.mode,
      paused: !this.running(),
      reduced: this.reduced,
      preview,
      beltPreview,
      selected: this.selected,
      transferTargets,
      siteHints: this.siteHints(s),
    });
  }
  private inspectorHTML(s: State, m: NonNullable<ReturnType<AsteroidApp['selectedMachine']>>) {
    const header = (extra = '') =>
      `<header><strong>${NAMES[m.kind]}</strong>${extra}<button id="a-close-inspect" class="a-square" aria-label="Close inspection">✕</button></header><p class="a-status">${escape(status(s, m))}</p>`;
    if (m.kind === 'drill') {
      const extensionError = drillExtensionError(s, m),
        freshError = placementError(s, 'drill', drillSite(s)),
        returning = m.loads.reduce((n, l) => n + l.amount, 0);
      return `<div class="a-card">${header('<button id="a-view-head" class="a-ghost">View head →</button>')}<div class="a-meters"><span>Pocket <b>${pocketRemaining(s, m)}</b></span><span>Output <b>${m.output.length}/8</b></span><span>Returning <b>${returning}</b></span></div><div class="a-actions"><button id="a-extend-drill" class="a-primary" ${extensionError ? 'disabled' : ''}><b>Extend 8</b><small>${mineral('part')}1</small></button>${m.extension?.queued ? `<button id="a-cancel-extension"><b>Cancel kit</b><small>refund ${mineral('part')}1</small></button>` : ''}<button id="a-new-drill" ${freshError ? 'disabled' : ''}><b>New drill</b><small>${this.costHTML('drill', s)}</small></button></div><p class="a-reason"><b>Extend:</b> ${escape(extensionError || 'the tender installs it once this pocket and its loads clear.')}${freshError ? `<br><b>New drill:</b> ${escape(freshError)}` : ''}</p></div>`;
    }
    if (m.kind === 'belt') {
      const busy = m.output.length > 0;
      return `<div class="a-card">${header()}<div class="a-actions"><button id="a-rotate-belt" ${busy ? 'disabled' : ''}><b>↻ Rotate</b></button><button id="a-remove-belt" ${busy ? 'disabled' : ''}><b>Remove</b></button></div>${busy ? '<p class="a-reason">Cargo inside · let it drain first. Cargo is never discarded.</p>' : ''}</div>`;
    }
    const inputError = manualInputError(s, m),
      resource = processorInput(m)!,
      amount = manualInputAmount(m),
      reserved = reservedInput(s, m),
      label = amount
        ? `Send ${amount} ${plural(resource, amount)}`
        : `Send ${resource === 'plate' ? 'plates' : resource}`;
    return `<div class="a-card">${header()}<div class="a-meters"><span>Input <b>${m.input.length}${reserved ? `+${reserved}` : ''}/4</b></span><span>Output <b>${m.output.length}/4</b></span><span>Made <b>${m.made}</b></span></div><div class="a-actions"><button id="a-dispatch-machine" class="a-primary" ${inputError ? 'disabled' : ''}>${label}</button></div><p class="a-reason">${escape(inputError || 'The drone flies one batch from collection. Belts into the right side automate supply.')}</p></div>`;
  }
  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement).matches('input,textarea,select')) return;
    if (this.modal) {
      if (e.key === 'Escape') this.closeModal();
      return;
    }
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') this.exitPlanning();
    else if (k === 'r' && this.mode === 'belt') {
      this.direction = ((this.direction + 1) % 4) as Direction;
      this.render();
    } else if (e.key === 'Enter' && this.preview) this.confirm();
    else if (e.key === ' ') {
      e.preventDefault();
      this.togglePause();
    } else if (/^[1-4]$/.test(e.key)) this.selectTool(TOOLS[Number(e.key) - 1]);
    else if (k === 'z' && (e.ctrlKey || e.metaKey)) this.undo();
    else if (e.key === 'ArrowLeft') this.scene.panBy(-2);
    else if (e.key === 'ArrowRight') this.scene.panBy(2);
    else if (e.key === 'ArrowUp') this.scene.panBy(0, -2);
    else if (e.key === 'ArrowDown') this.scene.panBy(0, 2);
    else if (e.key === '+' || e.key === '=') this.scene.zoomBy(1.2);
    else if (e.key === '-') this.scene.zoomBy(1 / 1.2);
    else if (k === 'h') this.scene.home();
  }
  private closeModal() {
    this.modal = false;
    document.getElementById('a-modal')!.innerHTML = '';
    this.render();
  }
  private showModal(content: string, close = 'Back to the outpost') {
    this.modal = true;
    this.manual = null;
    this.scene.cancelPointer();
    document.getElementById('a-modal')!.innerHTML =
      `<div class="a-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="a-dialog-title">${content}<button id="a-close-modal" class="a-primary">${close}</button></section></div>`;
    this.bind('a-close-modal', () => this.closeModal());
    this.render();
  }
  private menu() {
    const paused = this.paused && !this.planning();
    this.showModal(
      `<span class="a-kicker">GRIDFORGE · ASTEROID WORKS</span><h2 id="a-dialog-title">Outpost</h2><div class="a-menu"><button id="a-pause">${paused ? '▶ Resume' : '⏸ Pause'}</button><button id="a-help">How to play</button><button id="a-sound">Sound · ${this.muted ? 'off' : 'on'}</button><label class="a-check"><input type="checkbox" id="a-motion" ${this.reduced ? 'checked' : ''}> Reduced motion</label><button id="a-reset" class="a-danger">Restart outpost</button></div><p id="a-save" class="a-save">${this.saving ? 'Auto-saved on this device' : 'Save unavailable'}</p><p class="a-keys">Pinch or scroll to zoom · two fingers pan while building · keys 1–4, Space, Ctrl+Z</p><a href="?mode=tiles">Open the earlier tile workshop</a>`,
      'Back to the outpost'
    );
    this.bind('a-pause', () => {
      this.closeModal();
      this.togglePause();
    });
    this.bind('a-help', () => this.help());
    this.bind('a-sound', () => {
      this.muted = !this.muted;
      try {
        localStorage.setItem('gridforge.asteroid.sound', this.muted ? 'off' : 'on');
      } catch {
        /* Audio preference is optional. */
      }
      this.setText('a-sound', `Sound · ${this.muted ? 'off' : 'on'}`);
      this.audio.play('click');
    });
    document.getElementById('a-motion')!.addEventListener('change', (e) => {
      this.reduced = (e.target as HTMLInputElement).checked;
      this.render();
    });
    this.bind('a-reset', () => this.restartModal());
  }
  private help() {
    this.showModal(
      `<span class="a-kicker">FIELD MANUAL</span><h2 id="a-dialog-title">From a handful of ore<br>to a working outpost.</h2><ol><li><b>Excavate.</b> Hold an exposed block. Rock gives 2 ore in 1.2 s; gold veins give 4.</li><li><b>Automate.</b> A drill (6 ore) digs eight squares right, then taps any finite deep pocket. Ore rides its rail back to the left output.</li><li><b>Connect.</b> Pick Conveyor and drag from an output to COLLECTION. Cargo flows the way you drag. Tap a belt to rotate or remove it.</li><li><b>Process.</b> Machines take input on the right and output on the left. Smelter: 2 ore → 1 plate. Assembler: 2 plates → 1 part. Tap FEED for one drone delivery.</li><li><b>Expand.</b> A second drill costs 2 ore, a third 8. Once a shaft clears, tap its drill to spend 1 part on an eight-square extension.</li></ol><p>Time stops while you plan. Drag to look around, pinch to zoom; the target button returns to collection. Undo rewinds the last build and everything produced since. Saves stay on this device; there is no offline production.</p>`
    );
  }
  private restartModal() {
    this.showModal(
      '<span class="a-kicker">NEW EXPEDITION</span><h2 id="a-dialog-title">Start this outpost over?</h2><p>This clears this asteroid’s machinery, excavation and stock. The earlier tile workshop save is separate.</p><button id="a-do-reset" class="a-danger">Restart asteroid</button>',
      'Keep playing'
    );
    this.bind('a-do-reset', () => {
      this.session = freshSession();
      this.mode = 'mine';
      this.paused = false;
      this.resetTransient();
      this.message = '';
      this.lastObjective = 0;
      this.shown = { ...this.session.state.stock };
      this.goalOpenUntil = performance.now() + 7000;
      this.scene.home();
      this.closeModal();
      this.save();
    });
  }
}
