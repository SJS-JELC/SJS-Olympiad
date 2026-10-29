/** A single locally generated alarm; browser audio permission is best-effort. */
class BreachSiren {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  private locked = false;
  private listening = false;
  private resuming: Promise<void> | null = null;

  /** Call synchronously from the entry gesture, without awaiting before fullscreen. */
  prepare(): void {
    this.listen();
    this.ensureContext();
    this.resume();
    this.start();
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (!locked) {
      this.stop();
      return;
    }
    this.listen();
    this.ensureContext();
    this.start();
    this.resume();
  }

  dispose(): void {
    this.locked = false;
    this.stop();
    if (this.listening && typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.onInteraction, true);
      window.removeEventListener('keydown', this.onInteraction, true);
      window.removeEventListener('focus', this.onReturn);
      document.removeEventListener('visibilitychange', this.onReturn);
    }
    this.listening = false;
    const context = this.context;
    this.context = null;
    this.buffer = null;
    this.resuming = null;
    if (context) {
      context.removeEventListener('statechange', this.onStateChange);
      void context.close().catch(() => undefined);
    }
  }

  private listen(): void {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('pointerdown', this.onInteraction, true);
    window.addEventListener('keydown', this.onInteraction, true);
    window.addEventListener('focus', this.onReturn);
    document.addEventListener('visibilitychange', this.onReturn);
  }

  private readonly onInteraction = (): void => {
    if (this.locked) this.prepare();
  };

  private readonly onReturn = (): void => {
    if (this.locked && document.visibilityState === 'visible') this.prepare();
  };

  private readonly onStateChange = (): void => {
    if (this.locked) {
      this.start();
      this.resume();
    }
  };

  private ensureContext(): void {
    if (this.context || typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    try {
      this.context = new AudioContextConstructor();
      this.context.addEventListener('statechange', this.onStateChange);
    } catch {
      // Missing or unavailable audio must never block the security transition.
    }
  }

  private resume(): void {
    const context = this.context;
    if (!context || context.state === 'running' || context.state === 'closed') return;
    try {
      // A policy-blocked resume can stay pending. A later gesture must retry it.
      const pending = context.resume();
      this.resuming = pending;
      void pending.catch(() => undefined).finally(() => {
        if (this.resuming === pending) this.resuming = null;
      });
    } catch {
      // Retry on the next user gesture or foreground event.
    }
  }

  private start(): void {
    const context = this.context;
    if (!this.locked || !context || context.state === 'closed' || this.source) return;
    let source: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    try {
      // One looping buffer needs no timers, including while the page is hidden.
      if (!this.buffer) {
        const toneLength = Math.round(context.sampleRate * 0.65);
        const buffer = context.createBuffer(1, toneLength * 2, context.sampleRate);
        const samples = buffer.getChannelData(0);
        const fadeLength = Math.round(context.sampleRate * 0.012);
        for (let index = 0; index < samples.length; index += 1) {
          const position = index % toneLength;
          const frequency = index < toneLength ? 660 : 880;
          const envelope = Math.min(1, position / fadeLength, (toneLength - 1 - position) / fadeLength);
          samples[index] = Math.sin(2 * Math.PI * frequency * position / context.sampleRate) * envelope;
        }
        this.buffer = buffer;
      }
      source = context.createBufferSource();
      gain = context.createGain();
      source.buffer = this.buffer;
      source.loop = true;
      gain.gain.value = 0.12;
      source.connect(gain);
      gain.connect(context.destination);
      source.start();
      this.source = source;
      this.gain = gain;
    } catch {
      source?.disconnect();
      gain?.disconnect();
    }
  }

  private stop(): void {
    const source = this.source;
    this.source = null;
    if (source) {
      try { source.stop(); } catch { /* Already stopped. */ }
      source.disconnect();
    }
    this.gain?.disconnect();
    this.gain = null;
  }
}

export const breachSiren = new BreachSiren();
