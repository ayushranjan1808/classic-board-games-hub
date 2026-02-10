class AudioService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
  
  isMuted() { return this.muted; }

  private async ensureContext() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async play(type: 'move' | 'capture' | 'win' | 'dice' | 'error' | 'bell' | 'check' | 'startup' | 'click') {
    if (this.muted || !this.ctx) return;
    await this.ensureContext();

    const t = this.ctx.currentTime;

    switch (type) {
      case 'startup': // Magical ascending sweep
        this.playTone(330, 'sine', 0.1, 0.1, t);
        this.playTone(440, 'sine', 0.1, 0.1, t + 0.1);
        this.playTone(554, 'sine', 0.1, 0.1, t + 0.2);
        this.playTone(659, 'sine', 0.4, 0.1, t + 0.3);
        this.playNote(880, t + 0.4, 0.6);
        break;

      case 'click': // Subtle UI click
        this.playTone(600, 'sine', 0.05, 0.05);
        break;

      case 'move': // High pop
        this.playTone(800, 'sine', 0.1, 0.1);
        break;

      case 'capture': // Crunch/Thud
        this.playTone(150, 'sawtooth', 0.15, 0.15);
        break;
      
      case 'check': // Warning buzz
        this.playTone(200, 'sawtooth', 0.3, 0.1);
        break;

      case 'dice': // Noise rattle
        this.playNoise(0.15);
        setTimeout(() => this.playNoise(0.1), 100);
        break;

      case 'win': // Fanfare
        this.playNote(523.25, t, 0.15); // C5
        this.playNote(659.25, t + 0.15, 0.15); // E5
        this.playNote(783.99, t + 0.3, 0.15); // G5
        this.playNote(1046.50, t + 0.45, 0.6); // C6
        break;
        
      case 'error': // Low buzz
        this.playTone(100, 'square', 0.2, 0.1);
        break;

      case 'bell': // Ding
        this.playTone(1200, 'sine', 1.5, 0.05);
        break;
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number, startTime?: number) {
    if (!this.ctx) return;
    const start = startTime || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq / 2, start + duration);
    
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  private playNote(freq: number, time: number, dur: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.linearRampToValueAtTime(0.01, time + dur);
      osc.start(time);
      osc.stop(time + dur);
  }

  private playNoise(duration: number) {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.15;
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
  }
}

export const audio = new AudioService();