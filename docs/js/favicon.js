/**
 * Dynamic 32x32 Canvas Favicon Generator & Tab Chrome Animator
 * Updates browser tab icon in real time via canvas.toDataURL()
 */

export class FaviconEngine {
  constructor(options = {}) {
    this.mode = options.mode || 'lamp'; // 'lamp', 'needle', 'radar', 'stealth'
    this.size = 32;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false });

    this.linkElement = document.getElementById('dynamic-favicon');
    if (!this.linkElement) {
      this.linkElement = document.createElement('link');
      this.linkElement.id = 'dynamic-favicon';
      this.linkElement.rel = 'icon';
      this.linkElement.type = 'image/png';
      document.head.appendChild(this.linkElement);
    }

    // State tracking
    this.isKeyDown = false;
    this.isRx = false;
    this.pulsePhase = 0;
    this.needleAngle = -45; // resting galvanometer angle in degrees
    this.targetNeedleAngle = -45;
    this.animFrameId = null;
    this.lastRenderTime = 0;

    // Render initial state
    this.render();
  }

  setMode(mode) {
    if (['lamp', 'needle', 'radar', 'stealth'].includes(mode)) {
      this.mode = mode;
      this.render();
    }
  }

  setKeyState(isDown, isRx = false) {
    if (this.isKeyDown === isDown && this.isRx === isRx) return;
    this.isKeyDown = isDown;
    this.isRx = isRx;

    if (isDown) {
      this.pulsePhase = 0;
      this.targetNeedleAngle = 45; // kick to full scale
      this._startAnimation();
    } else {
      this.targetNeedleAngle = -45; // return to rest
      // Run animation briefly to settle needle/fade glow
      this._startAnimation();
    }
  }

  _startAnimation() {
    if (this.animFrameId) return;

    const animate = (time) => {
      this.animFrameId = requestAnimationFrame(animate);

      // Advance pulse phase
      this.pulsePhase = (this.pulsePhase + 0.15) % (Math.PI * 2);

      // Smooth needle interpolation with slight spring overshoot
      const diff = this.targetNeedleAngle - this.needleAngle;
      this.needleAngle += diff * 0.35;

      this.render();

      // If key is up and needle settled and glow faded, stop animation loop to conserve battery
      if (!this.isKeyDown && Math.abs(diff) < 0.5) {
        this.needleAngle = this.targetNeedleAngle;
        this.render();
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  render() {
    const ctx = this.ctx;
    const w = this.size;
    const h = this.size;

    ctx.clearRect(0, 0, w, h);

    switch (this.mode) {
      case 'needle':
        this._renderGalvanometer(ctx, w, h);
        break;
      case 'radar':
        this._renderRadar(ctx, w, h);
        break;
      case 'stealth':
        this._renderStealth(ctx, w, h);
        break;
      case 'lamp':
      default:
        this._renderLamp(ctx, w, h);
        break;
    }

    // Push canvas buffer to <link rel="icon">
    try {
      this.linkElement.href = this.canvas.toDataURL('image/png');
    } catch {
      // Ignored if backgrounded or throttling
    }
  }

  /**
   * Mode 1: High-Contrast Glowing Telegraph Signal Lamp
   */
  _renderLamp(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = 13;

    // Outer brass / gunmetal bezel ring
    const bezelGrad = ctx.createLinearGradient(0, 0, w, h);
    bezelGrad.addColorStop(0, '#5a6270');
    bezelGrad.addColorStop(0.5, '#252932');
    bezelGrad.addColorStop(1, '#111419');

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = bezelGrad;
    ctx.fill();

    // Inner bezel groove
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0d12';
    ctx.fill();

    if (this.isKeyDown) {
      const isRx = this.isRx;
      const coreColor = isRx ? '#00f5d4' : '#ffb703';
      const glowColor = isRx ? 'rgba(0, 245, 212, 0.65)' : 'rgba(255, 183, 3, 0.75)';
      const flareColor = isRx ? 'rgba(160, 255, 245, 0.95)' : '#ffffff';

      // Outer radiation aura
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Glowing lens core
      const lensGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, radius);
      lensGrad.addColorStop(0, flareColor);
      lensGrad.addColorStop(0.3, coreColor);
      lensGrad.addColorStop(0.85, isRx ? '#0d9488' : '#e85d04');
      lensGrad.addColorStop(1, isRx ? '#042f2e' : '#6a040f');

      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.fillStyle = lensGrad;
      ctx.fill();

      // Incandescent filament spark
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      // Idle unlit pilot lamp
      const idleGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, radius);
      idleGrad.addColorStop(0, '#374151');
      idleGrad.addColorStop(0.6, '#1f2937');
      idleGrad.addColorStop(1, '#111827');

      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.fillStyle = idleGrad;
      ctx.fill();

      // Subtle glass specular highlight
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }
  }

  /**
   * Mode 2: Vintage Galvanometer Dial Needle
   */
  _renderGalvanometer(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2 + 5;
    const r = 13;

    // Meter background face
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#1e242e';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scale ticks
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    [-40, -20, 0, 20, 40].forEach(deg => {
      const rad = (deg - 90) * (Math.PI / 180);
      const x1 = cx + Math.cos(rad) * (r - 2);
      const y1 = cy + Math.sin(rad) * (r - 2);
      const x2 = cx + Math.cos(rad) * (r - 5);
      const y2 = cy + Math.sin(rad) * (r - 5);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Needle pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb703';
    ctx.fill();

    // Deflected needle
    const needleRad = (this.needleAngle - 90) * (Math.PI / 180);
    const nx = cx + Math.cos(needleRad) * (r - 1);
    const ny = cy + Math.sin(needleRad) * (r - 1);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = this.isKeyDown ? (this.isRx ? '#00f5d4' : '#ef4444') : '#f8fafc';
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  /**
   * Mode 3: Radar / Radio Wave Antenna
   */
  _renderRadar(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;

    // Dark radar screen
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#051b14';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Antenna tower center
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = this.isKeyDown ? '#34d399' : '#059669';
    ctx.fill();

    if (this.isKeyDown) {
      // Expanding wave pulse
      const waveRadius = 4 + (this.pulsePhase / (Math.PI * 2)) * 10;
      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.strokeStyle = this.isRx ? 'rgba(0, 245, 212, 0.8)' : 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /**
   * Mode 4: Covert Spreadsheet Grid (Stealth Mode Icon)
   */
  _renderStealth(ctx, w, h) {
    // Green corporate spreadsheet icon background (like Excel)
    ctx.fillStyle = '#107c41';
    ctx.fillRect(2, 2, 28, 28);

    // White grid lines
    ctx.fillStyle = '#ffffff';
    // Border
    ctx.strokeRect(3, 3, 26, 26);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    // Grid cells
    ctx.fillRect(6, 6, 9, 7);
    ctx.fillRect(17, 6, 9, 7);
    ctx.fillRect(6, 15, 9, 7);
    ctx.fillRect(17, 15, 9, 7);

    // Covert 2x2 corner indicator dot that flashes during key presses
    if (this.isKeyDown) {
      ctx.fillStyle = this.isRx ? '#00ffff' : '#ffeb3b';
      ctx.fillRect(24, 24, 6, 6);
    }
  }
}
