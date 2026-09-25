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
  type Session,
  type Point,
  type Tool,
  type Direction,
} from './simulation';
import { beltPlacements } from './beltPath';
import { freshSession, parseSave, SAVE_KEY } from './persistence';
import { FactoryAudio } from '../view/audio';

type Mode = 'mine' | Tool | 'erase' | 'transfer';
const ICON: Record<Mode, string> = {
  mine: '⛏',
  drill: '▸',
  belt: '⇠',
  smelter: '♨',
  assembler: '⬡',
  erase: '×',
  transfer: '◇',
};
const TOOLBAR_MODES = ['mine', 'drill', 'belt', 'smelter', 'assembler', 'erase'] as const;
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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
      else if (raw) {
        this.message = 'Unreadable prototype save. A fresh outpost is ready.';
        this.messageUntil = performance.now() + 8000;
      }
      this.muted = localStorage.getItem('gridforge.asteroid.sound') !== 'on';
    } catch {
      this.saving = false;
    }
    this.lastObjective = objective(this.session.state).step;
    document.body.className = 'asteroid-app';
    document.querySelector('#app')!.innerHTML = `
      <header class="a-header">
        <div class="a-brand"><div><span class="a-mark">◈</span><strong>GRIDFORGE</strong><span class="a-edition">ASTEROID WORKS</span></div><div class="a-header-actions"><button id="a-sound" aria-label="Toggle sound"></button><button id="a-help" aria-label="How to play">?</button></div></div>
        <div class="a-stocks"><div><i class="a-mineral ore"></i><span>ORE</span><strong id="a-ore">0</strong></div><div><i class="a-mineral plate"></i><span>PLATES</span><strong id="a-plate">0</strong></div><div><i class="a-mineral part"></i><span>PARTS</span><strong id="a-part">0</strong></div></div>
        <div class="a-objective"><span id="a-step" class="a-step">01</span><div><h1 id="a-objective-title"></h1><p id="a-objective-detail"></p></div></div>
      </header>
      <main class="a-world"><div id="a-canvas"></div><div class="a-camera"><button id="a-left" aria-label="Pan left">←</button><button id="a-home">Dock</button><button id="a-right" aria-label="Pan right">→</button><span id="a-camera-hint">Drag to explore</span></div></main>
      <footer class="a-footer"><div id="a-context"></div><div class="a-tools">${TOOLBAR_MODES.map((k) => `<button id="a-tool-${k}" data-tool="${k}" aria-label="${k === 'mine' ? 'Mine terrain' : k === 'erase' ? 'Remove empty conveyor' : 'Build ' + NAMES[k]}"><span class="a-tool-icon">${ICON[k]}</span><b>${k === 'mine' ? 'Mine' : k === 'erase' ? 'Remove' : k === 'drill' ? 'Drill' : NAMES[k]}</b><small id="a-tool-cost-${k}">${k === 'mine' ? 'Hold rock' : k === 'erase' ? 'Empty belt' : costLabel(k, this.session.state)}</small></button>`).join('')}</div>
      <div class="a-bottom"><button id="a-pause">Pause</button><button id="a-undo">Undo build</button><span id="a-save">Saved locally</span><button id="a-reset">Restart</button></div></footer>
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
    this.bind('a-left', () => this.scene.panBy(-4));
    this.bind('a-right', () => this.scene.panBy(4));
    this.bind('a-home', () => this.scene.focus());
    this.bind('a-sound', () => {
      this.muted = !this.muted;
      try {
        localStorage.setItem('gridforge.asteroid.sound', this.muted ? 'off' : 'on');
      } catch {
        /* Audio preference is optional. */
      }
      this.render();
      this.audio.play('click');
    });
    this.bind('a-help', () => this.help());
    this.bind('a-pause', () => {
      if ((this.mode !== 'mine' && this.mode !== 'transfer') || this.preview) {
        this.mode = 'mine';
        this.preview = null;
        this.beltDrag = null;
        this.selected = null;
        this.paused = false;
      } else {
        if (this.mode === 'transfer') this.mode = 'mine';
        this.paused = !this.paused;
      }
      this.manual = null;
      this.scene.cancelPointer();
      this.render();
    });
    this.bind('a-undo', () => {
      this.manual = null;
      this.scene.cancelPointer();
      if (undo(this.session)) {
        if (this.mode === 'transfer') this.mode = 'mine';
        this.preview = null;
        this.beltDrag = null;
        this.selected = null;
        this.lastObjective = objective(this.session.state).step;
        this.notify('The last action and all later production were rewound.');
        this.save();
      }
      this.render();
    });
    this.bind('a-reset', () => this.restartModal());
    for (const k of TOOLBAR_MODES)
      this.bind(`a-tool-${k}`, () => {
        this.mode = k;
        this.preview = null;
        this.beltDrag = null;
        this.selected = null;
        this.manual = null;
        this.scene.cancelPointer();
        this.message = '';
        this.render();
      });
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
    new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector('#a-canvas')!;
        if (el.clientWidth !== this.game.scale.width || el.clientHeight !== this.game.scale.height)
          this.game.scale.resize(el.clientWidth, el.clientHeight);
      });
    }).observe(document.querySelector('#a-canvas')!);
    if (new URLSearchParams(location.search).has('test'))
      (window as unknown as { asteroid: AsteroidApp }).asteroid = this;
    this.render();
    this.save();
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
    if (this.message && now >= this.messageUntil) {
      this.message = '';
      this.render();
    } else if (advanced) this.render();
    requestAnimationFrame((time) => this.frame(time));
  }
  private notify(message: string) {
    this.message = message;
    this.messageUntil = performance.now() + 4500;
    document.getElementById('a-announcer')!.textContent = message;
  }
  private tap(p: Point) {
    if (this.modal) return;
    this.selected = null;
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
          this.notify('Choose a glowing machine for manual delivery.');
        }
        this.render();
        return;
      }
      const machine = machineAt(this.session.state, p);
      if (machine) {
        this.selected = p;
        this.manual = null;
        this.render();
        return;
      }
      if (this.paused) {
        this.notify('Resume to mine.');
        this.render();
        return;
      }
      const events: Parameters<AsteroidScene['emit']>[0] = [];
      const error = tapMine(this.session.state, p, events);
      if (error) {
        if (tileAt(this.session.state, p)) this.notify(error);
      } else this.scene.emit(events);
    } else {
      this.preview = p;
    }
    this.render();
  }
  private confirm() {
    if (!this.preview || this.mode === 'mine' || this.mode === 'transfer') return;
    const p = this.preview;
    const error =
      this.mode === 'erase'
        ? removeBelt(this.session, p)
        : build(this.session, this.mode, p, this.direction);
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
    // Remain in planning for a belt run; explicit Resume starts the whole factory.
    if (this.mode !== 'belt' && this.mode !== 'erase') {
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
    }
    this.render();
  }
  private extendSelectedDrill() {
    if (!this.selected) return;
    const drill = machineAt(this.session.state, this.selected);
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
        ? 'Extension reserved. The tender leaves after the pocket and return loads clear.'
        : 'Extension kit launched. The tender will install it automatically.'
    );
    this.save();
    this.render();
  }
  private previewFreshDrill() {
    const site =
      this.session.state.machines.filter((m) => m.kind === 'drill').length === 1
        ? FRESH_DRILL_SITE
        : THIRD_DRILL_SITE;
    this.mode = 'drill';
    this.preview = { ...site };
    this.selected = null;
    this.manual = null;
    this.scene.cancelPointer();
    this.scene.focus(site.x, site.y);
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
      `Service drone carrying ${amount} ${resource === 'plate' && amount !== 1 ? 'plates' : resource} to ${NAMES[machine.kind]}.`
    );
    this.save();
    this.render();
  }
  private dispatchToSelectedMachine() {
    if (!this.selected) return;
    const machine = machineAt(this.session.state, this.selected);
    if (!machine) return;
    this.dispatchToMachine(machine.id);
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
  private render() {
    const s = this.session.state,
      goal = objective(s);
    for (const r of ['ore', 'plate', 'part'] as const) this.setText(`a-${r}`, String(s.stock[r]));
    for (const tool of ['drill', 'belt', 'smelter', 'assembler'] as Tool[])
      this.setText(`a-tool-cost-${tool}`, costLabel(tool, s));
    this.setText('a-step', String(goal.step + 1).padStart(2, '0'));
    this.setText('a-objective-title', goal.title);
    this.setText('a-objective-detail', goal.detail);
    if (goal.step > this.lastObjective) {
      this.lastObjective = goal.step;
      this.audio.play('milestone');
    }
    this.setText('a-sound', this.muted ? '♪ off' : '♪ on');
    this.setText('a-pause', this.running() ? 'Ⅱ Pause' : '▶ Resume');
    this.setText('a-save', this.saving ? 'Auto-saved · local' : 'Save unavailable');
    this.setText(
      'a-camera-hint',
      this.mode === 'belt' ? 'Arrows pan while drawing' : 'Drag to explore'
    );
    (document.getElementById('a-undo') as HTMLButtonElement).disabled =
      !this.session.history.length;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
      const active = button.dataset.tool === this.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
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
    if (this.mode === 'transfer') {
      const targetText = transferTargets.length
        ? 'Tap a glowing processor. Its required cargo will leave collection now and arrive after the flight.'
        : 'No processor can accept available collection stock right now.';
      context = `<div class="a-hint a-transfer-hint"><span class="a-live-dot"></span><p><b>MANUAL DELIVERY</b><br>${targetText}</p><button id="a-cancel-transfer">Cancel</button></div>`;
    } else if (dragPlacements.length) {
      beltPreview = dragPlacements.map((p) => ({
        ...p,
        valid: !beltDragPlacementError(s, p),
      }));
      context = `<div class="a-preview ${dragError ? 'invalid' : ''}"><div><strong>${dragError ? escape(dragError) : `${dragPlacements.length} conveyor${dragPlacements.length === 1 ? '' : 's'} · Free`}</strong><small>${dragError ? 'Release to cancel this invalid route.' : 'Release to install as one undoable route. Drag order sets cargo direction.'}</small></div></div>`;
    } else if (this.preview && this.mode !== 'mine') {
      const existing = machineAt(s, this.preview);
      const surveyedPocket =
        this.mode === 'drill' ? s.pockets[`${this.preview.x + 8},${this.preview.y}`] || 0 : 0;
      const error =
        this.mode === 'erase'
          ? !existing || existing.kind !== 'belt'
            ? 'Choose an empty conveyor.'
            : existing.output.length
              ? 'Cargo inside · let the conveyor drain first.'
              : null
          : placementError(s, this.mode, this.preview);
      if (this.mode !== 'erase')
        preview = { ...this.preview, kind: this.mode, direction: this.direction, valid: !error };
      context = `<div class="a-preview ${error ? 'invalid' : ''}"><div><strong>${error ? escape(error) : this.mode === 'erase' ? 'Remove empty conveyor' : `${NAMES[this.mode]} · ${costLabel(this.mode, s)}`}</strong><small>${this.mode === 'drill' ? `Mines right · 8-square reach · ${surveyedPocket ? `${surveyedPocket} ore deep pocket at end` : 'no surveyed deep pocket'}` : this.mode === 'belt' ? 'Arrow sets cargo direction. Conveyors turn automatically at the next belt.' : this.mode === 'erase' ? 'Cargo is never discarded.' : 'Input on the RIGHT · output on the LEFT'}</small></div><div class="a-preview-actions">${this.mode === 'belt' ? '<button id="a-rotate" aria-label="Rotate conveyor">↻ Rotate</button>' : ''}<button id="a-confirm" class="a-primary" ${error ? 'disabled' : ''}>${this.mode === 'erase' ? 'Remove' : 'Build'}</button><button id="a-cancel" aria-label="Cancel preview">✕</button></div></div>`;
    } else if (this.selected && machineAt(s, this.selected)) {
      const m = machineAt(s, this.selected)!;
      if (m.kind === 'drill') {
        const extensionError = drillExtensionError(s, m),
          site =
            s.machines.filter((n) => n.kind === 'drill').length === 1
              ? FRESH_DRILL_SITE
              : THIRD_DRILL_SITE,
          freshError = placementError(s, 'drill', site),
          pocket = pocketRemaining(s, m);
        context = `<div class="a-inspect"><div><strong>${NAMES[m.kind]}</strong><p>${status(s, m)}</p><small>Deep pocket ${pocket} ore · output ${m.output.length}/8 · made ${m.made} · ${m.loads.reduce((n, l) => n + l.amount, 0)} returning</small><small class="a-choice-reason"><b>Extend 8 · 1 part:</b> ${escape(extensionError || 'reserve the next corridor; tender waits for pocket and loads to clear')}<br><b>New drill · ${costLabel('drill', s)}:</b> ${escape(freshError || 'requires a separate output route')}</small></div><div class="a-inspect-actions"><button id="a-extend-drill" class="a-primary" ${extensionError ? 'disabled' : ''}>Extend 8 · 1 part</button>${m.extension?.queued ? '<button id="a-cancel-extension">Cancel queued kit · refund part</button>' : ''}<button id="a-new-drill" ${freshError ? 'disabled' : ''}>New drill · ${costLabel('drill', s)}</button><button id="a-view-head">View head</button><button id="a-view-base">View base</button><button id="a-close-inspect" aria-label="Close inspection">✕</button></div></div>`;
      } else {
        const inputError = manualInputError(s, m),
          resource = processorInput(m)!,
          amount = manualInputAmount(m),
          reserved = reservedInput(s, m),
          resourceLabel = resource === 'plate' && amount !== 1 ? 'plates' : resource,
          inputLabel = amount
            ? `Load ${amount} ${resourceLabel}`
            : `Load ${resource === 'plate' ? 'plates' : resource}`;
        context = `<div class="a-inspect"><div><strong>${NAMES[m.kind]}</strong><p>${status(s, m)}</p><small>Input ${m.input.length}${reserved ? ` + ${reserved} incoming` : ''}/4 · output ${m.output.length}/4 · made ${m.made}</small><small class="a-choice-reason"><b>Manual delivery:</b> ${escape(inputError || 'Send the service drone from collection in a pinch; connect the right input to automate supply.')}</small></div><div class="a-inspect-actions"><button id="a-dispatch-machine" class="a-primary a-manual-input" ${inputError ? 'disabled' : ''}>${inputLabel.replace('Load', 'Send')}</button><button id="a-close-inspect" aria-label="Close inspection">✕</button></div></div>`;
      }
    } else {
      const text =
        this.message && performance.now() < this.messageUntil
          ? this.message
          : this.mode === 'mine'
            ? 'Hold exposed rock to mine. Tap a machine to inspect it.'
            : this.mode === 'erase'
              ? 'Choose an empty conveyor to remove it.'
              : this.mode === 'drill'
                ? 'Choose cleared space left of a rock face. The shaft grows right.'
                : this.mode === 'belt'
                  ? 'Drag from output toward destination to install a route. Tap for one belt. Use the camera arrows to explore.'
                  : `${NAMES[this.mode]}: ${this.mode === 'smelter' ? '2 ore → 1 plate' : '2 plates → 1 part'}. Feed from the right; collect on the left.`;
      context = `<div class="a-hint"><span class="a-live-dot ${this.running() ? '' : 'paused'}"></span><p>${escape(text)}</p>${this.mode === 'belt' ? `<button id="a-rotate">${['↑', '→', '↓', '←'][this.direction]} Rotate</button>` : ''}</div>`;
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
        if (!this.selected) return;
        const drill = machineAt(this.session.state, this.selected);
        if (!drill) return;
        const error = cancelQueuedExtension(this.session, drill.id);
        this.notify(error || 'Queued kit cancelled. One part returned to collection.');
        this.save();
        this.render();
      });
      this.bind('a-new-drill', () => this.previewFreshDrill());
      this.bind('a-dispatch-machine', () => this.dispatchToSelectedMachine());
      this.bind('a-view-head', () => {
        if (!this.selected) return;
        const drill = machineAt(this.session.state, this.selected);
        if (drill)
          this.scene.focus(
            drill.extension?.targetEnd ?? Math.min(drill.head, drillRailEnd(drill)),
            drill.y
          );
      });
      this.bind('a-view-base', () => {
        if (!this.selected) return;
        const drill = machineAt(this.session.state, this.selected);
        if (drill) this.scene.focus(drill.x, drill.y);
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
    });
  }
  private key(e: KeyboardEvent) {
    if ((e.target as HTMLElement).matches('input,textarea,select')) return;
    if (this.modal) {
      if (e.key === 'Escape') this.closeModal();
      return;
    }
    if (e.key === 'Escape') {
      this.preview = null;
      this.beltDrag = null;
      this.selected = null;
      this.mode = 'mine';
      this.scene.cancelPointer();
      this.render();
    } else if (e.key.toLowerCase() === 'r' && this.mode === 'belt') {
      this.direction = ((this.direction + 1) % 4) as Direction;
      this.render();
    } else if (e.key === 'Enter' && this.preview) this.confirm();
    else if (e.key === ' ') {
      e.preventDefault();
      document.getElementById('a-pause')!.click();
    } else if (e.key === 'ArrowLeft') this.scene.panBy(-2);
    else if (e.key === 'ArrowRight') this.scene.panBy(2);
  }
  private closeModal() {
    this.modal = false;
    document.getElementById('a-modal')!.innerHTML = '';
    this.render();
  }
  private showModal(content: string) {
    this.modal = true;
    this.manual = null;
    this.scene.cancelPointer();
    document.getElementById('a-modal')!.innerHTML =
      `<div class="a-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="a-dialog-title">${content}<button id="a-close-modal" class="a-primary">Back to the outpost</button></section></div>`;
    this.bind('a-close-modal', () => this.closeModal());
    this.render();
  }
  private help() {
    this.showModal(
      `<span class="a-kicker">FIELD MANUAL / 01</span><h2 id="a-dialog-title">From a handful of ore<br>to a working outpost.</h2><ol><li><b>Excavate.</b> Hold exposed blocks. Plain rock yields 2 ore and breaks in 1.2 seconds; gold veins yield 4. Drag elsewhere to pan.</li><li><b>Automate.</b> Spend 6 ore on a drill in clear space. It clears eight real squares to the right, then taps a visible finite deep pocket where one exists. Ore returns along its rail to the left output.</li><li><b>Connect.</b> Drag from an output toward its destination to install a free conveyor route. Tap for precise one-cell placement. The camera arrows pan while drawing.</li><li><b>Process.</b> Feed machines from the right. Smelter: 2 ore → 1 plate. Assembler: 2 plates → 1 part. For one real manual batch, drag from COLLECTION to a processor or tap its world FEED action. Tap the processor to inspect it.</li><li><b>Expand.</b> The second drill costs 2 ore; the third costs 8 ore. Each needs its own output route. Once a shaft clears, spend 1 part to queue an eight-cell extension on that base. Cancel a queued kit for a full refund, or wait for its old pocket and loads to clear before the tender moves.</li></ol><p>The drone and factory share the live clock: real cargo leaves storage at launch and enters the reserved machine slots only on arrival. Building pauses production. Resume after laying belts. Only empty belts can be replaced or removed. Drill rails reserve their full corridor, including a queued extension. Deep pockets are fixed deposits with visible remaining ore; building a drill never refills them.</p><p><b>Undo build</b> keeps up to 40 recent edits within this device’s save budget. It rewinds the whole outpost, including ore mined, courier deliveries and production earned since that build. Saves stay on this device; there is no offline production.</p><label class="a-check"><input type="checkbox" id="a-motion" ${this.reduced ? 'checked' : ''}> Reduced motion</label><a href="?mode=tiles">Open the earlier tile workshop</a>`
    );
    document.getElementById('a-motion')!.addEventListener('change', (e) => {
      this.reduced = (e.target as HTMLInputElement).checked;
      this.render();
    });
  }
  private restartModal() {
    this.showModal(
      '<span class="a-kicker">NEW EXPEDITION</span><h2 id="a-dialog-title">Start this outpost over?</h2><p>This clears this asteroid’s machinery, excavation and stock. The earlier tile workshop save is separate.</p><button id="a-do-reset" class="a-danger">Restart asteroid</button>'
    );
    this.bind('a-do-reset', () => {
      this.session = freshSession();
      this.mode = 'mine';
      this.paused = false;
      this.preview = null;
      this.selected = null;
      this.message = '';
      this.lastObjective = 0;
      this.scene.focus();
      this.closeModal();
      this.save();
    });
  }
}
