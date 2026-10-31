/**
 * Web Audio API Transmitter Tone Generator & Telegraph Sound Engine
 * Features:
 * - Crisp 750 Hz sine-wave tone (replicating genuine telegraph straight-key)
 * - Exponential / linear attack (5ms) & decay (8ms) ramps to eliminate clicks/pops
 * - Authentic mechanical straight-key brass contact clack
 * - Pitch separation for Local Transmit (TX) vs Remote Receive (RX)
 * - Sound mute toggle & master volume
 * - Live AnalyserNode for audio waveform / oscilloscope visualization
 */

export class AudioEngine {
  constructor(options = {}) {
    this.txFrequency = options.txFrequency ?? 750; // Standard 750 Hz CW pitch
    this.rxFrequency = options.rxFrequency ?? 650; // Distinct pitch for peer
    this.volume = options.volume ?? 0.8;
    this.isMuted = options.isMuted ?? false;
    this.mechanicalClicks = options.mechanicalClicks ?? true;
    this.waveformType = options.waveformType ?? 'sine'; // 'sine', 'triangle', 'sawtooth'

    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;

    // Active tone instances
    this.activeTxTone = null;
    this.activeRxTone = null;
  }

  /**
   * Lazy initialization of AudioContext on first user interaction
   */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported on this browser.');
      return;
    }

    this.ctx = new AudioContextClass();

    // Master volume gain node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

    // Analyser node for oscilloscope waveform visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.02);
    }
  }

  setMute(mute) {
    this.isMuted = !!mute;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.volume, now + 0.02);
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMute(!this.isMuted);
  }

  setFrequency(freq, isRx = false) {
    const clamped = Math.max(200, Math.min(2000, freq));
    if (isRx) {
      this.rxFrequency = clamped;
      if (this.activeRxTone?.osc) {
        this.activeRxTone.osc.frequency.setValueAtTime(clamped, this.ctx.currentTime);
      }
    } else {
      this.txFrequency = clamped;
      if (this.activeTxTone?.osc) {
        this.activeTxTone.osc.frequency.setValueAtTime(clamped, this.ctx.currentTime);
      }
    }
  }

  setWaveform(type) {
    if (['sine', 'triangle', 'sawtooth'].includes(type)) {
      this.waveformType = type;
    }
  }

  /**
   * Play subtle mechanical clack of brass contacts
   */
  _playMechanicalClack(isClosing = true) {
    if (!this.mechanicalClicks || !this.ctx || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.004); // 4ms micro-transient
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate soft filtered click burst
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (bufferSize * 0.3));
        data[i] = ((Math.random() * 2 - 1) * 0.25) * decay;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = isClosing ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(isClosing ? 2200 : 3400, now);
      filter.Q.setValueAtTime(3.0, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.08, now);

      noise.connect(filter);
      filter.connect(clickGain);
      clickGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.005);
    } catch {
      // Audio transient error ignored
    }
  }

  /**
   * Start transmitter tone
   * @param {boolean} isRx - True if this tone is triggered by remote peer
   */
  startTone(isRx = false) {
    this.ensureContext();
    if (!this.ctx) return;

    // Trigger mechanical clack
    this._playMechanicalClack(true);

    const freq = isRx ? this.rxFrequency : this.txFrequency;
    const activeRef = isRx ? this.activeRxTone : this.activeTxTone;

    // If already active, sustain
    if (activeRef) return;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = this.waveformType;
    osc.frequency.setValueAtTime(freq, now);

    const gain = this.ctx.createGain();
    // 5ms smooth attack to prevent click/pop
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.005);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);

    const toneObj = { osc, gain, startTime: now };
    if (isRx) {
      this.activeRxTone = toneObj;
    } else {
      this.activeTxTone = toneObj;
    }
  }

  /**
   * Stop transmitter tone
   * @param {boolean} isRx - True if stopping remote tone
   */
  stopTone(isRx = false) {
    if (!this.ctx) return;

    const toneObj = isRx ? this.activeRxTone : this.activeTxTone;
    if (!toneObj) return;

    const now = this.ctx.currentTime;

    // 8ms smooth decay to silence
    toneObj.gain.gain.cancelScheduledValues(now);
    toneObj.gain.gain.setValueAtTime(toneObj.gain.gain.value, now);
    toneObj.gain.linearRampToValueAtTime(0.0001, now + 0.008);

    toneObj.osc.stop(now + 0.01);

    if (isRx) {
      this.activeRxTone = null;
    } else {
      this.activeTxTone = null;
    }

    // Trigger contact release clack
    this._playMechanicalClack(false);
  }

  /**
   * Play a single discrete Morse pulse (for auto-keying / preview)
   */
  playPulse(durationMs, isRx = false) {
    this.startTone(isRx);
    return new Promise(resolve => {
      setTimeout(() => {
        this.stopTone(isRx);
        resolve();
      }, durationMs);
    });
  }

  /**
   * Get audio waveform time-domain data for visualizer
   */
  getWaveformData(outputArray) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(outputArray);
    }
  }
}
