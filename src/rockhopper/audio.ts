import type { SimEvent } from './sim';

/** Tiny synthesized sound set, unlocked by the first gesture and rate-limited per voice. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private last = new Map<string, number>();
  muted = false;

  unlock() {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    } catch {
      /* Silent play is fine. */
    }
  }

  private tone(
    voice: string,
    freq: number,
    opts: { type?: OscillatorType; dur?: number; gain?: number; slide?: number; gap?: number } = {}
  ) {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - (this.last.get(voice) ?? -1) < (opts.gap ?? 0.04)) return;
    this.last.set(voice, now);
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    const dur = opts.dur ?? 0.09;
    osc.type = opts.type ?? 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * (opts.slide ?? 0.7)), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(opts.gain ?? 0.06, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  events(events: SimEvent[]) {
    for (const e of events) {
      if (e.type === 'break') {
        if (e.by === 'laser')
          this.tone('break', 520 + e.ore * 90 + Math.random() * 60, {
            type: 'square',
            gain: 0.025,
            dur: 0.05,
          });
        else if (e.by === 'drill')
          this.tone('dbreak', 300 + e.ore * 60, {
            type: 'triangle',
            gain: 0.02,
            dur: 0.05,
            gap: 0.08,
          });
      } else if (e.type === 'deliver') {
        this.tone('coin', e.bar ? 1320 : 880 + Math.min(600, e.value * 20), {
          type: 'sine',
          gain: 0.035,
          dur: 0.07,
          slide: 1.3,
          gap: 0.05,
        });
      } else if (e.type === 'crumble')
        this.tone('boom', 140, { type: 'sawtooth', gain: 0.06, dur: 0.35, slide: 0.4, gap: 0.2 });
      else if (e.type === 'arrive')
        this.tone('arrive', 220, { type: 'sine', gain: 0.05, dur: 0.25, slide: 1.8, gap: 0.2 });
      else if (e.type === 'smelt')
        this.tone('smelt', 660, { type: 'sine', gain: 0.02, dur: 0.06, slide: 1.1, gap: 0.1 });
      else if (e.type === 'build' || e.type === 'move') {
        this.tone('build', 180, { type: 'square', gain: 0.05, dur: 0.12, slide: 0.5, gap: 0 });
        this.tone('build2', 360, { type: 'triangle', gain: 0.04, dur: 0.1, slide: 1.5, gap: 0 });
      } else if (e.type === 'upgrade' || e.type === 'hub')
        this.tone('up', 520, { type: 'triangle', gain: 0.05, dur: 0.16, slide: 2, gap: 0 });
      else if (e.type === 'unlock')
        this.tone('unlock', 392, { type: 'triangle', gain: 0.06, dur: 0.4, slide: 2, gap: 0 });
      else if (e.type === 'sell')
        this.tone('sell', 300, { type: 'triangle', gain: 0.05, dur: 0.15, slide: 0.6, gap: 0 });
      else if (e.type === 'route')
        this.tone('route', 740, { type: 'sine', gain: 0.03, dur: 0.07, slide: 1.2, gap: 0.05 });
    }
  }

  tap() {
    this.tone('tap', 600, { type: 'sine', gain: 0.03, dur: 0.05, slide: 1.1 });
  }

  deny() {
    this.tone('deny', 200, { type: 'square', gain: 0.035, dur: 0.12, slide: 0.8 });
  }
}
