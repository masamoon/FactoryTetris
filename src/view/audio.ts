import type { Settings } from '../game/persistence';
import type { SimEvent } from '../game/types';

export class FactoryAudio {
  private context: AudioContext | null = null;
  constructor(private settings: () => Settings) {}
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch {
      /* Silent play remains available. */
    }
  }
  play(type: SimEvent['type'] | 'click') {
    const settings = this.settings(),
      ctx = this.context;
    if (!ctx || settings.muted || settings.volume === 0) return;
    const notes: Record<string, number[]> = {
      click: [380],
      place: [180, 280],
      work: [420],
      flow: [260],
      ship: [660, 880],
      milestone: [523, 659, 784, 1047],
      fold: [260, 390, 520, 780],
    };
    (notes[type] || [300]).forEach((frequency, i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        at = ctx.currentTime + i * 0.07;
      osc.type = type === 'place' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, at);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.82, at + 0.12);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(settings.volume * 0.12, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.18);
    });
  }
}
