class AudioEngine {
  ctx: AudioContext | null = null;
  muted = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextCtor) {
         this.ctx = new AudioContextCtor();
      }
    }
  }

  setMuted(m: boolean) {
      this.muted = m;
  }

  playJump() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    const t = this.ctx.currentTime;
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.start();
    osc.stop(t + 0.1);
  }

  playCorrect() {
    if (this.muted || !this.ctx) return;
    const playNote = (freq: number, startTime: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
    };
    const t = this.ctx.currentTime;
    playNote(440, t); 
    playNote(554.37, t + 0.1); 
    playNote(659.25, t + 0.2); 
    playNote(880, t + 0.3); 
  }

  playWrong() {
    if (this.muted || !this.ctx) return;
    this.playMarioDeath();
  }

  playMarioDeath() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Quick custom sequence of retro square-wave notes: High, Middle, Low, then rapid slide-down
    const playSquare = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.005, start + duration);
        osc.start(start);
        osc.stop(start + duration);
    };

    // Traditional arcade-style staccato sequence:
    playSquare(493.88, t, 0.08);        // B4
    playSquare(587.33, t + 0.09, 0.08); // D5
    playSquare(659.25, t + 0.18, 0.08); // E5
    playSquare(783.99, t + 0.27, 0.12); // G5 

    // Slide down portion (Sad collapse)
    const slideOsc = this.ctx.createOscillator();
    const slideGain = this.ctx.createGain();
    slideOsc.type = 'sawtooth';
    slideOsc.frequency.setValueAtTime(450, t + 0.42);
    slideOsc.frequency.linearRampToValueAtTime(100, t + 1.0);
    
    slideOsc.connect(slideGain);
    slideGain.connect(this.ctx.destination);
    
    slideGain.gain.setValueAtTime(0.08, t + 0.42);
    slideGain.gain.linearRampToValueAtTime(0.001, t + 1.0);
    
    slideOsc.start(t + 0.42);
    slideOsc.stop(t + 1.0);
  }

  playCoin() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
    };
    // Classic 2-tone jump arpeggio for coin collects
    playNote(987.77, t, 0.08);          // B5
    playNote(1318.51, t + 0.08, 0.25);  // E6
  }
}

export const audio = new AudioEngine();
