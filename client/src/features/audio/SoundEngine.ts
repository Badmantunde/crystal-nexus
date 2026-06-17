/** Lightweight procedural SFX — no asset files required. */
class SoundEngineImpl {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    this.muted = localStorage.getItem('cn-muted') === '1';
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('cn-muted', muted ? '1' : '0');
  }

  isMuted(): boolean {
    return this.muted;
  }

  private ensureCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.12,
    detune = 0,
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private chord(freqs: number[], duration: number, gain = 0.07): void {
    freqs.forEach((f, i) => this.tone(f, duration, 'triangle', gain, i * 4));
  }

  unlock(): void {
    this.ensureCtx();
  }

  playUi(): void {
    this.tone(880, 0.06, 'sine', 0.08);
  }

  playSwap(): void {
    this.tone(420, 0.05, 'triangle', 0.09);
    setTimeout(() => this.tone(520, 0.04, 'triangle', 0.07), 30);
  }

  playMatch(combo = 1): void {
    const base = 320 + Math.min(combo, 8) * 40;
    this.chord([base, base * 1.25, base * 1.5], 0.14, 0.06 + combo * 0.008);
  }

  playCombo(combo: number): void {
    if (combo < 2) return;
    this.tone(660 + combo * 35, 0.18, 'square', 0.06);
    setTimeout(() => this.tone(880 + combo * 20, 0.22, 'sine', 0.05), 60);
  }

  playRainbow(): void {
    const notes = [523, 659, 784, 988, 1175, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.14, 'triangle', 0.09, i * 3), i * 55);
    });
    setTimeout(() => this.chord([1047, 1319, 1568], 0.32, 0.1), 420);
  }

  playSpecial(): void {
    this.chord([523, 659, 784, 1047], 0.28, 0.08);
  }

  playCoin(): void {
    this.tone(1200, 0.05, 'sine', 0.07);
    setTimeout(() => this.tone(1500, 0.08, 'sine', 0.06), 45);
  }

  playWin(): void {
    [0, 90, 180, 270].forEach((delay, i) => {
      setTimeout(() => this.tone(440 + i * 110, 0.22, 'triangle', 0.09), delay);
    });
  }

  playLose(): void {
    this.tone(220, 0.25, 'sawtooth', 0.06);
    setTimeout(() => this.tone(165, 0.35, 'sawtooth', 0.05), 120);
  }

  playNearMiss(): void {
    this.tone(300, 0.12, 'triangle', 0.08);
    setTimeout(() => this.tone(280, 0.2, 'triangle', 0.06), 100);
  }
}

export const SoundEngine = new SoundEngineImpl();
