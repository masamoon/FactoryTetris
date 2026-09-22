import Phaser from 'phaser';
import {
  createRun,
  DEFINITIONS,
  LEVELS,
  PRODUCTS,
  TOOLS,
  geometry,
  transform,
} from '../game/content';
import {
  applyCommand,
  checkPlacement,
  foldedMachine,
  leaves,
  makeMachine,
  previewFold,
} from '../game/simulation';
import { loadSession, loadSettings, saveSession, SETTINGS_KEY } from '../game/persistence';
import type { Settings, StorageLike } from '../game/persistence';
import type { Command, Machine, Point, Session, Tool } from '../game/types';
import { BOARD_HEIGHT, BOARD_WIDTH, BoardScene } from '../view/BoardScene';
import { FactoryAudio } from '../view/audio';
import { pieceIcon, productIcon } from './icons';
import {
  guidance,
  incomingProduct,
  nextProduct,
  previewState,
  diversionWarnings,
  inputDetails,
  machineName,
  machineStatus,
} from './explain';
type Mode = 'place' | 'inspect' | 'move' | 'fold';
const button = (id: string, label: string, content = label, disabled = false, cls = '') =>
  `<button id="${id}" class="${cls}" aria-label="${label}" ${disabled ? 'disabled' : ''}>${content}</button>`;
const PROGRESS_KEY = 'gridforge.tiles.progress.v2';
export class App {
  session: Session;
  settings: Settings;
  private storage: StorageLike;
  private available = true;
  private scene = new BoardScene();
  private audio: FactoryAudio;
  private game: Phaser.Game;
  private mode: Mode = 'place';
  private tool: Tool = 'punch';
  private selected: number | null = null;
  private rotation = 0;
  private position: Point | null = null;
  private busy = false;
  private message = '';
  private modalOpen = false;
  private messageTimer: ReturnType<typeof setTimeout> | undefined;
  private completed: number[] = [];
  constructor() {
    try {
      this.storage = localStorage;
    } catch {
      this.storage = {
        getItem: () => {
          throw new Error('Unavailable');
        },
        setItem: () => {
          throw new Error('Unavailable');
        },
      };
    }
    this.settings = loadSettings(this.storage);
    const saved = loadSession(this.storage);
    this.available = saved.available;
    this.session = saved.session || { state: createRun(0), undo: null };
    try {
      const p: unknown = JSON.parse(this.storage.getItem(PROGRESS_KEY) || '[]');
      if (Array.isArray(p))
        this.completed = p.filter((n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length);
    } catch {
      /* Progress is optional. */
    }
    this.audio = new FactoryAudio(() => this.settings);
    document.querySelector('#app')!.innerHTML =
      '<header id="header"></header><main id="playfield"><div id="board"></div></main><footer id="controls"></footer><div id="modal-root"></div><div id="announcer" class="sr-only" aria-live="polite"></div>';
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      parent: 'board',
      transparent: true,
      scene: [this.scene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 2 },
      audio: { noAudio: true },
    });
    this.scene.onCell = (p, d) => this.onCell(p, d);
    this.scene.onCancel = () => this.cancel();
    window.addEventListener('keydown', (e) => this.key(e));
    document.addEventListener('pointerdown', () => this.audio.unlock(), { passive: true });
    window.addEventListener('resize', () => this.game.scale.refresh());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
    });
    window.addEventListener('pagehide', () => this.save());
    this.save();
    this.render();
    if (saved.invalid) this.toast('Old or unreadable prototype save. Level 1 is ready.');
    if (new URLSearchParams(location.search).has('test'))
      (window as unknown as { factory: App }).factory = this;
  }
  private bind(id: string, fn: () => void) {
    document.getElementById(id)?.addEventListener('click', fn);
  }
  private save() {
    this.available = saveSession(this.storage, this.session) && this.available;
  }
  private saveSettings() {
    try {
      this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      this.available = false;
    }
  }
  private machine() {
    return this.session.state.machines.find((m) => m.id === this.selected);
  }
  private candidate(): { machine: Machine | null; ignored: number[]; error: string | null } {
    if (!this.position || this.mode === 'inspect')
      return { machine: null, ignored: [], error: null };
    const state = this.session.state;
    let m: Machine,
      ignored: number[] = [];
    if (this.mode === 'fold') {
      const fold = previewFold(state, this.selected!);
      if (fold.error) return { machine: null, ignored: [], error: fold.error };
      m = foldedMachine(state, fold, this.position.x, this.position.y, this.rotation);
      ignored = fold.ids;
    } else if (this.mode === 'move') {
      const original = this.machine();
      if (!original) return { machine: null, ignored: [], error: null };
      m = { ...original, ...this.position, rotation: this.rotation };
      ignored = [original.id];
    } else m = makeMachine(state, this.position.x, this.position.y, this.rotation, this.tool);
    return { machine: m, ignored, error: checkPlacement(state, m, ignored) };
  }
  private onCell(point: Point, drag: boolean) {
    if (this.busy || this.modalOpen) return;
    const state = this.session.state;
    if (!drag && this.mode !== 'fold' && this.mode !== 'move') {
      const source = state.sources.find((s) => s.x === point.x && s.y === point.y);
      if (source) {
        this.showModal(
          `<h1>${PRODUCTS[source.resource].name} supply</h1>${productIcon(source.resource, 56)}<p>Renewable ${PRODUCTS[source.resource].name.toLowerCase()} tiles enter here. They already have the features shown above. Connect a dark IN arrow to this supply arrow. Production advances when you place, move, recycle, or Run.</p>${button('close-modal', 'Back to factory')}`
        );
        return;
      }
      if (state.blockers.some((p) => p.x === point.x && p.y === point.y)) {
        this.showModal(
          `<h1>Blocked floor</h1><p>The striped squares are obstacles. Machines cannot go on them. Build around them.</p>${button('close-modal', 'Back to factory', 'Got it', false, 'primary')}`
        );
        return;
      }
      const machine = state.machines.find((m) =>
        geometry(m).cells.some((c) => c.x === point.x && c.y === point.y)
      );
      if (machine) {
        this.selected = machine.id;
        this.mode = 'inspect';
        this.position = null;
        this.render();
        return;
      }
    }
    if (state.status !== 'playing') return;
    if (this.mode === 'inspect') {
      this.mode = 'place';
      this.selected = null;
      this.rotation = 0;
    }
    this.position = point;
    this.render();
  }
  private cancel() {
    this.position = null;
    if (this.mode === 'inspect') this.selected = null;
    this.mode = this.machine() ? 'inspect' : 'place';
    this.render();
  }
  private rotate() {
    if (this.busy) return;
    this.rotation = (this.rotation + (this.session.state.mirrored ? 3 : 1)) % 4;
    this.render();
  }

  private async commit(command: Command) {
    if (this.busy) return;
    const r = applyCommand(this.session, command);
    if (r.error) {
      this.toast(r.error);
      return;
    }
    this.session = r.session;
    this.position = null;
    this.selected = null;
    this.mode = 'place';
    this.rotation = 0;
    this.message = '';
    clearTimeout(this.messageTimer);
    this.save();
    this.busy = true;
    this.render();
    document.querySelector('#announcer')!.textContent =
      `${this.session.state.actions} actions left.`;
    await this.scene.animate(r.events, this.settings.reducedMotion, (t) => this.audio.play(t));
    this.busy = false;
    this.render();
    if (this.session.state.status === 'won') {
      if (!this.completed.includes(this.session.state.level)) {
        this.completed.push(this.session.state.level);
        try {
          this.storage.setItem(PROGRESS_KEY, JSON.stringify(this.completed));
        } catch {
          this.available = false;
        }
      }
      this.results();
    } else if (this.session.state.status === 'lost') this.results();
  }
  private confirm() {
    const c = this.candidate();
    if (!c.machine || c.error) {
      if (c.error) this.toast(c.error);
      return;
    }
    const { x, y, rotation } = c.machine;
    if (this.mode === 'fold' || this.mode === 'move')
      void this.commit({ type: this.mode, id: this.selected!, x, y, rotation });
    else void this.commit({ type: 'place', kind: this.tool, x, y, rotation });
  }
  private selectTool(kind: Tool) {
    if (this.busy) return;
    this.tool = kind;
    this.mode = 'place';
    this.selected = null;
    this.position = null;
    this.rotation = 0;
    this.render();
  }
  private render() {
    const s = this.session.state,
      level = LEVELS[s.level],
      c = this.candidate();
    const opening =
      s.level === 0 && !s.machines.length && this.tool === 'punch' && s.status === 'playing';
    document.documentElement.dataset.motion = this.settings.reducedMotion ? 'reduced' : 'full';
    document.querySelector('#header')!.innerHTML =
      `<div class="brand-row"><a href="#" id="home" class="wordmark">GRIDFORGE <small>POC</small></a><div class="header-tools">${button('levels', 'Choose level', 'Levels')}${button('help', 'How to play', '?')}${button('menu', 'Settings', '☰')}</div></div><div class="order-row"><div class="order-copy"><div class="eyebrow">LEVEL ${s.level + 1} / ${LEVELS.length} · ${level.lesson}</div><div class="order-title">${level.name}</div></div><div class="action-counter ${s.actions <= 3 ? 'low' : ''}"><strong>${s.actions}</strong><span>ACTIONS LEFT</span></div></div><div class="manifest">${s.orders.map((o) => `<button class="order-item ${o.delivered === o.quantity ? 'done' : ''}" data-product="${o.resource}" aria-label="Order: ${PRODUCTS[o.resource].name}, ${o.delivered} of ${o.quantity}">${productIcon(o.resource, 34)}<span>${PRODUCTS[o.resource].name}<b>${o.delivered} / ${o.quantity}${o.delivered === o.quantity ? ' ✓' : ''}</b></span></button>`).join('')}</div><p class="level-guidance">${opening ? 'Punch selected. Preview a spot beside BLANK, then confirm your placement.' : guidance(s)}</p>`;
    this.bind('levels', () => this.levelMenu());
    this.bind('home', () => this.levelMenu());
    this.bind('help', () => this.help());
    this.bind('menu', () => this.menu());
    document.querySelectorAll<HTMLElement>('[data-product]').forEach(
      (el) =>
        (el.onclick = () => {
          const o = s.orders.find((o) => o.resource === el.dataset.product)!;
          this.showModal(
            `<h1>${PRODUCTS[o.resource].name} tiles</h1>${productIcon(o.resource, 110)}<p>Deliver ${o.quantity} tiles matching this exact silhouette. ${o.resource === 'combined' ? 'It needs both a round hole and a clipped corner.' : o.resource === 'punched' ? 'It needs a hole and four intact corners.' : 'It needs one clipped corner and no hole.'} Connected machinery takes tiles before delivery. After the quota is complete, surplus waits in the machine.</p>${button('close-modal', 'Back to factory')}`
          );
        })
    );
    let body = '';
    if (this.mode === 'inspect' && this.machine()) {
      const m = this.machine()!,
        f = previewFold(s, m.id),
        input = incomingProduct(s, m),
        out = nextProduct(s, m);
      const stored = leaves([m]).flatMap((n) => [
        ...n.inputs.flat(),
        ...n.output,
        ...(n.processing ? [n.processing] : []),
      ]);
      body = `<div class="inspect-title"><strong>${machineName(m)}</strong>${button('back-piece', 'Back to tools', '✕')}</div><div class="tile-equation"><span>${input ? productIcon(input, 28) : 'IN'}</span><b>→</b>${pieceIcon(m.kind, 30, m.rotation)}<b>→</b><span>${out ? productIcon(out, 28) : 'OUT'}</span><small>Next tile · stored work first</small></div><p class="status-line">${machineStatus(s, m)}</p><div class="stored">Inside: ${
        stored.length
          ? stored
              .slice(0, 12)
              .map((r) => productIcon(r, 17))
              .join('') + (stored.length > 12 ? ` +${stored.length - 12}` : '')
          : 'empty'
      }</div><div class="control-row">${button('move', 'Move machine', 'Move · 1', this.busy || s.status !== 'playing')}${button('fold', 'Fold factory', 'Fold · free', this.busy || s.status !== 'playing' || !!f.error, 'fold-button')}${button('recycle', 'Recycle machine', 'Recycle · 1', this.busy || s.status !== 'playing')}</div><p class="help-line">${f.error || `Fold ${f.ids.length} machine(s), recover ${f.saved} cells. Stored work is preserved.`}</p>`;
      document.querySelector('#controls')!.innerHTML = body;
      this.bind('back-piece', () => this.selectTool(this.tool));
      this.bind('move', () => {
        this.mode = 'move';
        this.rotation = m.rotation;
        this.position = { x: m.x, y: m.y };
        this.render();
      });
      this.bind('fold', () => {
        this.mode = 'fold';
        this.rotation = 0;
        this.position = { x: f.graph.machines[0].x, y: f.graph.machines[0].y };
        this.render();
      });
      this.bind('recycle', () =>
        this.showModal(
          `<h1>Recycle ${machineName(m)}?</h1><p>Uses one action. Removes this machine and <strong>${stored.length} stored or processing tiles</strong>.</p>${button('do-recycle', 'Confirm recycling', 'Recycle · 1 action', false, 'primary')}${button('close-modal', 'Keep machine')}`,
          () =>
            this.bind('do-recycle', () => {
              this.closeModal();
              void this.commit({ type: 'recycle', id: m.id });
            })
        )
      );
    } else if (s.status !== 'playing') {
      document.querySelector('#controls')!.innerHTML =
        `<div class="finished-copy"><strong>${s.status === 'won' ? 'Commission complete.' : 'Out of actions.'}</strong><p>${level.actions - s.actions} actions used · ${s.spaceRecovered} cells recovered</p></div><div class="control-row">${button('retry', 'Retry level', 'Retry')}${button('results', 'Show results', 'Results', false, 'primary')}${button('undo', 'Undo last command', 'Undo', !this.session.undo)}</div>`;
      this.bind('retry', () => this.startLevel(s.level));
      this.bind('results', () => this.results());
      this.bind('undo', () => void this.commit({ type: 'undo' }));
    } else {
      const special = this.mode === 'move' || this.mode === 'fold';
      body = `<div class="toolbox">${TOOLS.map((k) => button(`tool-${k}`, `Select ${DEFINITIONS[k].name}`, `${pieceIcon(k, 28)}<span>${DEFINITIONS[k].name}</span>`, this.busy || special, k === this.tool && !special ? 'chosen' : '')).join('')}</div>`;
      const demoState = c.machine ? previewState(s, c.machine, c.ignored) : s;
      const demoInput =
        (c.machine && incomingProduct(demoState, c.machine)) ||
        (s.sources.every((source) => source.resource === s.sources[0].resource)
          ? s.sources[0].resource
          : 'blank');
      const demoOutput =
        (c.machine && nextProduct(demoState, c.machine)) || transform(this.tool, demoInput);
      body += `<button id="current-piece" class="current-piece selected-tool" aria-label="Drag selected tool">${pieceIcon(this.tool, 30, this.rotation)}<strong>${special ? (this.mode === 'fold' ? 'Place folded factory' : 'Relocate machine') : DEFINITIONS[this.tool].name}</strong><span class="tile-equation">${productIcon(demoInput, 24)} → ${productIcon(demoOutput, 24)}</span><small>${special ? 'Choose a square' : 'Tap a square or drag'}</small></button>`;
      if (c.machine) {
        const ps = previewState(s, c.machine, c.ignored),
          input = incomingProduct(ps, c.machine),
          out = nextProduct(ps, c.machine);
        const warnings = diversionWarnings(s, c.machine, c.ignored);
        const connected = inputDetails(ps, c.machine).every((i) => i.connected);
        const foldInfo = this.mode === 'fold' ? previewFold(s, this.selected!) : null;
        body += `<div class="preview-info ${c.error ? 'invalid' : ''}">${c.error || `${connected ? '✓ Connected' : '! IN disconnected'}${input && out ? ` · ${productIcon(input, 20)} → ${productIcon(out, 20)}` : ''}${foldInfo ? ` · ${foldInfo.saved} cells freed` : ''}`}</div>${warnings.length ? `<p class="diversion" role="alert">${warnings.join(' ')}</p>` : ''}<div class="control-row">${button('rotate', 'Rotate piece', '↻ Rotate', this.busy)}${button('confirm', 'Confirm placement', this.mode === 'fold' ? 'Fold here' : this.mode === 'move' ? 'Move · 1' : 'Place · 1', this.busy || !!c.error, 'primary')}${button('cancel', 'Cancel placement', 'Cancel', this.busy)}</div>`;
      } else
        body += `<div class="control-row">${button('rotate', 'Rotate piece', '↻ Rotate', this.busy)}${button('run', opening ? 'Preview punch placement' : 'Run factory', opening ? 'Place a Punch' : '▶ Run · 1 action', this.busy, 'primary')}${button('undo', 'Undo last command', '↶ Undo', this.busy || !this.session.undo)}</div>`;
      body += `<p class="help-line" role="status">${this.message || (!this.available ? 'Resume unavailable — storage is blocked.' : this.busy ? 'Factory running…' : special ? 'Check connections before confirming. Rotation changes ports, not tiles.' : 'Each paid action runs 4 ticks. Thinking and folding are free.')}</p>`;
      document.querySelector('#controls')!.innerHTML = body;
      for (const k of TOOLS) this.bind(`tool-${k}`, () => this.selectTool(k));
      this.bindPieceDrag();
      this.bind('rotate', () => this.rotate());
      this.bind('confirm', () => this.confirm());
      this.bind('cancel', () => this.cancel());
      this.bind('run', () => {
        if (opening) {
          this.position = { x: 0, y: 2 };
          this.rotation = 0;
          this.render();
        } else void this.commit({ type: 'run' });
      });
      this.bind('undo', () => void this.commit({ type: 'undo' }));
    }
    this.scene.draw({
      state: s,
      selected: this.selected,
      preview: c.machine,
      ignored: c.ignored,
      valid: !c.error,
      hint: null,
    });
    this.game.scale.refresh();
    document
      .querySelector('#board')!
      .setAttribute('aria-label', `Factory board, 8 columns, 9 rows. ${s.actions} actions left.`);
  }
  private bindPieceDrag() {
    document.getElementById('current-piece')?.addEventListener('pointerdown', (event) => {
      if (this.busy || this.modalOpen) return;
      const origin = { x: event.clientX, y: event.clientY };
      let dragging = false;
      const move = (pointer: PointerEvent) => {
        if (pointer.pointerId !== event.pointerId) return;
        if (!dragging && Math.hypot(pointer.clientX - origin.x, pointer.clientY - origin.y) < 8)
          return;
        dragging = true;
        pointer.preventDefault();
        const canvas = this.game.canvas.getBoundingClientRect();
        this.mode = 'place';
        this.selected = null;
        this.position = this.scene.point(
          ((pointer.clientX - canvas.left) / canvas.width) * BOARD_WIDTH,
          ((pointer.clientY - canvas.top) / canvas.height) * BOARD_HEIGHT - 38
        );
        this.render();
      };
      const end = (pointer: PointerEvent) => {
        if (pointer.pointerId !== event.pointerId) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        if (pointer.type === 'pointercancel') this.cancel();
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    });
  }
  private toast(text: string) {
    this.message = text;
    clearTimeout(this.messageTimer);
    this.render();
    this.messageTimer = setTimeout(() => {
      this.message = '';
      this.render();
    }, 4200);
  }
  private showModal(content: string, after?: () => void) {
    this.modalOpen = true;
    const root = document.querySelector('#modal-root')!;
    root.innerHTML = `<div class="modal-scrim"><section class="modal" role="dialog" aria-modal="true" aria-label="Gridforge menu">${content}</section></div>`;
    this.bind('close-modal', () => this.closeModal());
    after?.();
    const panel = root.querySelector<HTMLElement>('.modal')!;
    const title = panel.querySelector('h1');
    if (title) {
      title.id = 'dialog-title';
      panel.removeAttribute('aria-label');
      panel.setAttribute('aria-labelledby', title.id);
    }
    panel.tabIndex = -1;
    panel.focus({ preventScroll: true });
    panel.scrollTop = 0;
  }
  private closeModal() {
    document.querySelector('#modal-root')!.innerHTML = '';
    this.modalOpen = false;
  }

  private startLevel(level: number) {
    if (this.busy) return;
    this.closeModal();
    clearTimeout(this.messageTimer);
    this.message = '';
    this.session = { state: createRun(level), undo: null };
    this.mode = 'place';
    this.selected = null;
    this.position = null;
    this.rotation = 0;
    this.tool = level === 1 ? 'straight' : 'punch';
    this.save();
    this.render();
  }
  private levelMenu() {
    if (this.busy) return;
    this.showModal(
      `<div class="eyebrow">${LEVELS.length} FACTORY EXPERIMENTS</div><h1>Choose a commission</h1><p>All levels are open for this prototype. Selecting a level starts it fresh. Your current factory is saved when you close this menu.</p><div class="level-list">${LEVELS.map((l, i) => button(`level-${i}`, `Play level ${i + 1}: ${l.name}`, `<b>${i + 1}. ${l.name} ${this.completed.includes(i) ? '✓' : ''}</b><small>${l.lesson} · ${l.actions} actions</small>`)).join('')}</div>${button('close-modal', 'Continue current factory', 'Continue factory')}`,
      () => LEVELS.forEach((_, i) => this.bind(`level-${i}`, () => this.startLevel(i)))
    );
  }
  private menu() {
    if (this.busy) return;
    this.showModal(
      `<h1>Workshop settings</h1><div class="settings"><label><input id="muted" type="checkbox" ${this.settings.muted ? 'checked' : ''}> Mute sounds</label><label>Volume <input id="volume" type="range" min="0" max="1" step="0.05" value="${this.settings.volume}"></label><label><input id="motion" type="checkbox" ${this.settings.reducedMotion ? 'checked' : ''}> Reduced motion</label></div><p>${this.available ? 'Factory saved automatically. No offline production.' : 'Resume unavailable: storage is blocked.'}</p>${button('close-modal', 'Back to factory')}`,
      () => {
        document.querySelector<HTMLInputElement>('#muted')!.onchange = (e) => {
          this.settings.muted = (e.target as HTMLInputElement).checked;
          this.saveSettings();
        };
        document.querySelector<HTMLInputElement>('#volume')!.oninput = (e) => {
          this.settings.volume = Number((e.target as HTMLInputElement).value);
          this.saveSettings();
        };
        document.querySelector<HTMLInputElement>('#motion')!.onchange = (e) => {
          this.settings.reducedMotion = (e.target as HTMLInputElement).checked;
          this.saveSettings();
          this.render();
        };
      }
    );
  }
  private help() {
    if (this.busy) return;
    this.showModal(
      `<h1>Small tools. Visible changes.</h1><div class="material-key">${Object.keys(PRODUCTS)
        .map(
          (r) =>
            `<span>${productIcon(r as keyof typeof PRODUCTS, 44)}<strong>${PRODUCTS[r as keyof typeof PRODUCTS].name}</strong></span>`
        )
        .join(
          ''
        )}</div><p><b>Punch</b> makes a hole. <b>Cutter</b> clips a corner. Both keep the other change. Belts carry tiles unchanged.</p><p><b>Connect pale OUT to dark IN.</b> Tiles ship automatically from unconnected outputs when they exactly match an unfinished order. Connected tools take priority. Surplus waits in a buffer.</p><p><b>Choose a tool → tap a square → confirm.</b> Each placement, move, recycling, or Run costs one action and advances four ticks. Rotation and thinking are free. Rotating a machine changes its connections, not the product.</p><p><b>Fold after 3 products leave a machine.</b> Tap it, choose Fold, then choose a new square. The upstream group fits into one cell, with its original work preserved. Check its connections. Undo restores the last command.</p><p>Keyboard: arrows position · R rotate · Enter place · Space run · Z undo · Escape cancel.</p>${button('close-modal', 'Back to factory', 'Let’s build', false, 'primary')}`
    );
  }
  private results() {
    const s = this.session.state,
      l = LEVELS[s.level];
    this.showModal(
      `<div class="eyebrow">LEVEL ${s.level + 1} · ${l.name}</div><h1>${s.status === 'won' ? 'Commission complete.' : 'Out of actions.'}</h1><div class="result-stats"><div><strong>${s.orders.filter((o) => o.delivered === o.quantity).length}/${s.orders.length}</strong><span>PRODUCTS</span></div><div><strong>${l.actions - s.actions}</strong><span>ACTIONS USED</span></div><div><strong>${s.spaceRecovered}</strong><span>CELLS FREED</span></div></div><p>${s.status === 'won' ? (s.level === LEVELS.length - 1 ? 'You completed the final commission. Try another arrangement, or revisit a level.' : 'Your factory did the job. The next commission explores a different idea.') : 'A full floor can still produce. Try a different arrangement, or undo your latest command.'}</p><div class="modal-actions">${s.status === 'won' && s.level < LEVELS.length - 1 ? button('next', 'Next level', 'Next commission →', false, 'primary') : ''}${button('retry', 'Retry level', 'Retry this level')}${button('all-levels', 'Choose level', 'All commissions')}${button('result-undo', 'Undo last command', 'Undo', !this.session.undo)}${button('close-modal', 'Inspect factory', 'Inspect factory')}</div>`,
      () => {
        this.bind('next', () => this.startLevel(s.level + 1));
        this.bind('retry', () => this.startLevel(s.level));
        this.bind('all-levels', () => this.levelMenu());
        this.bind('result-undo', () => {
          this.closeModal();
          void this.commit({ type: 'undo' });
        });
      }
    );
  }
  private key(event: KeyboardEvent) {
    if (this.modalOpen) {
      if (event.key === 'Escape') this.closeModal();
      if (event.key === 'Tab') {
        const focusables = [
          ...document.querySelectorAll<HTMLElement>('.modal button,.modal input'),
        ].filter((e) => !e.hasAttribute('disabled'));
        const first = focusables[0],
          last = focusables.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      return;
    }
    if (this.busy || event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      (event.target as HTMLElement)?.matches('input,button,a') &&
      ['Enter', ' '].includes(event.key)
    )
      return;
    const key = event.key.toLowerCase();
    if (
      [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
        'enter',
        'r',
        'h',
        'z',
        'escape',
      ].includes(key)
    )
      event.preventDefault();
    if (key === 'r') this.rotate();
    else if (key === 'z') void this.commit({ type: 'undo' });
    else if (key === ' ') void this.commit({ type: 'run' });
    else if (key === 'enter') this.confirm();
    else if (key === 'escape') {
      if (this.position || this.selected) this.cancel();
      else this.menu();
    } else if (key.startsWith('arrow')) {
      if (this.mode === 'inspect') {
        this.mode = 'place';
        this.selected = null;
      }
      const p = this.position || { x: 0, y: 0 };
      const dx = key === 'arrowleft' ? -1 : key === 'arrowright' ? 1 : 0;
      this.position = {
        x: Math.max(0, Math.min(7, p.x + dx * (this.session.state.mirrored ? -1 : 1))),
        y: Math.max(0, Math.min(8, p.y + (key === 'arrowup' ? -1 : key === 'arrowdown' ? 1 : 0))),
      };
      this.render();
    }
  }
}
