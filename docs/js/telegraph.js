/**
 * Telegraph Straight-Key Component & Tactile Input Controller
 * Controls mechanical key animation, contact sparks, duration gauge, and event bindings
 */

export class TelegraphKey {
  constructor(containerElement, morseEngine, options = {}) {
    this.container = containerElement;
    this.engine = morseEngine;
    this.onPress = options.onPress || null;
    this.onRelease = options.onRelease || null;

    this.isPressed = false;
    this.isRemotePressed = false;
    this.pressStartTime = 0;
    this.animFrameId = null;

    this.leverElement = null;
    this.contactElement = null;
    this.gaugeBarElement = null;
    this.gaugeStatusElement = null;
    this.sparkCanvas = null;
    this.sparkCtx = null;
    this.sparks = [];

    this._renderDOM();
    this._bindEvents();
    this._startSparkLoop();
  }

  _renderDOM() {
    this.container.innerHTML = `
      <div class="telegraph-unit">
        <!-- Duration Timing Bar -->
        <div class="timing-meter-container">
          <div class="timing-meter-header">
            <span class="timing-label">KEY DURATION: <strong id="timing-status">READY</strong></span>
            <span class="timing-zones">
              <span class="zone-tag zone-dot">&lt;200ms DOT [•]</span>
              <span class="zone-tag zone-dash">&ge;200ms DASH [—]</span>
            </span>
          </div>
          <div class="timing-bar-track">
            <div class="timing-bar-fill" id="timing-bar-fill"></div>
            <div class="timing-bar-marker" style="left: 40%;" title="200ms Threshold"></div>
          </div>
        </div>

        <!-- Mechanical Straight-Key Apparatus -->
        <div class="key-stage" id="key-stage" role="button" tabindex="0" aria-label="Telegraph Straight Key. Hold Spacebar or tap to transmit Morse code.">
          <canvas class="spark-canvas" id="spark-canvas" width="400" height="220"></canvas>
          
          <svg class="telegraph-svg" viewBox="0 0 500 240" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="brass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffe082" />
                <stop offset="40%" stop-color="#ffb300" />
                <stop offset="80%" stop-color="#ff8f00" />
                <stop offset="100%" stop-color="#c67100" />
              </linearGradient>
              <linearGradient id="iron-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#374151" />
                <stop offset="50%" stop-color="#1f2937" />
                <stop offset="100%" stop-color="#111827" />
              </linearGradient>
              <linearGradient id="wood-base" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#3e2723" />
                <stop offset="30%" stop-color="#4e342e" />
                <stop offset="80%" stop-color="#2d1d1a" />
                <stop offset="100%" stop-color="#1b1110" />
              </linearGradient>
              <linearGradient id="knob-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#2a2e39" />
                <stop offset="50%" stop-color="#131720" />
                <stop offset="100%" stop-color="#090b0e" />
              </linearGradient>
              <filter id="contact-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <!-- Mahogany Plinth Wood Base with Beveled Edge -->
            <rect x="20" y="180" width="460" height="42" rx="6" fill="url(#wood-base)" stroke="#5d4037" stroke-width="2" />
            <rect x="25" y="184" width="450" height="6" rx="2" fill="rgba(255,255,255,0.07)" />
            <!-- Polished Brass Corner Screws -->
            <circle cx="35" cy="192" r="4" fill="url(#brass-grad)" stroke="#8d6e63" />
            <circle cx="465" cy="192" r="4" fill="url(#brass-grad)" stroke="#8d6e63" />
            <circle cx="35" cy="212" r="4" fill="url(#brass-grad)" stroke="#8d6e63" />
            <circle cx="465" cy="212" r="4" fill="url(#brass-grad)" stroke="#8d6e63" />

            <!-- Cast Iron Bed Plate -->
            <rect x="50" y="165" width="400" height="20" rx="4" fill="url(#iron-grad)" stroke="#4b5563" stroke-width="1.5" />

            <!-- Front Platinum Anvil / Lower Contact Pillar -->
            <rect x="110" y="130" width="22" height="36" rx="2" fill="url(#brass-grad)" stroke="#b45309" />
            <rect x="113" y="124" width="16" height="7" rx="1" fill="#e2e8f0" stroke="#94a3b8" />
            <!-- Electric Contact Point Spark Target -->
            <circle id="contact-point" cx="121" cy="123" r="5" fill="#f8fafc" opacity="0.3" filter="url(#contact-glow)" />

            <!-- Rear Spring Adjusting Pillar & Tension Spring -->
            <rect x="360" y="115" width="18" height="52" rx="2" fill="url(#brass-grad)" stroke="#b45309" />
            <circle cx="369" cy="110" r="12" fill="url(#brass-grad)" stroke="#92400e" stroke-width="2" />
            <!-- Spring coils -->
            <path d="M 364,130 Q 374,134 364,138 Q 374,142 364,146 Q 374,150 364,154" fill="none" stroke="#d97706" stroke-width="2.5" />

            <!-- Central Fulcrum Trunnion Brackets -->
            <rect x="235" y="118" width="30" height="49" rx="3" fill="url(#brass-grad)" stroke="#92400e" stroke-width="2" />
            <circle cx="250" cy="130" r="8" fill="url(#iron-grad)" stroke="url(#brass-grad)" stroke-width="2" />
            <circle cx="250" cy="130" r="3" fill="#fbbf24" />

            <!-- Pivoting Brass Lever Arm Group (rotates around fulcrum x=250, y=130) -->
            <g id="lever-arm" class="lever-arm">
              <!-- Brass Key Beam -->
              <rect x="80" y="125" width="300" height="10" rx="2" fill="url(#brass-grad)" stroke="#92400e" stroke-width="1.5" />
              
              <!-- Upper Hammer Contact Stud -->
              <rect x="113" y="134" width="16" height="7" rx="1" fill="#e2e8f0" stroke="#94a3b8" />
              <!-- Top Knurled Gap Adjuster Screw -->
              <rect x="115" y="105" width="12" height="21" fill="url(#brass-grad)" stroke="#92400e" />
              <circle cx="121" cy="102" r="10" fill="url(#brass-grad)" stroke="#b45309" stroke-width="1.5" />

              <!-- Rear Arm Stop Thumb-Screw -->
              <rect x="345" y="105" width="12" height="21" fill="url(#brass-grad)" stroke="#92400e" />
              <circle cx="351" cy="102" r="9" fill="url(#brass-grad)" stroke="#b45309" />

              <!-- Telegraph Finger Knob (Vulcanite Hard Rubber) -->
              <path d="M 68,127 C 68,90 85,75 88,68 C 91,62 105,62 108,68 C 111,75 128,90 128,127 Z" fill="url(#knob-grad)" stroke="#374151" stroke-width="2" />
              <!-- Finger Grip Top Disc -->
              <ellipse cx="98" cy="65" rx="24" ry="10" fill="url(#knob-grad)" stroke="#4b5563" stroke-width="1.8" />
              <ellipse cx="98" cy="64" rx="20" ry="7" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
              <!-- Shaft collar -->
              <rect x="91" y="122" width="14" height="6" fill="url(#brass-grad)" stroke="#b45309" />
            </g>
          </svg>
        </div>

        <!-- Key Instructions & Quick Tap Buttons -->
        <div class="key-controls-row">
          <div class="key-hint">
            <kbd>SPACEBAR</kbd> or <strong>Hold / Tap Key</strong>
          </div>
          <div class="quick-paddles">
            <button type="button" class="btn btn-paddle" id="btn-dot-paddle" title="Send discrete dot (•)">
              <span class="paddle-sym">•</span> DOT
            </button>
            <button type="button" class="btn btn-paddle" id="btn-dash-paddle" title="Send discrete dash (—)">
              <span class="paddle-sym">—</span> DASH
            </button>
          </div>
        </div>
      </div>
    `;

    this.leverElement = this.container.querySelector('#lever-arm');
    this.contactElement = this.container.querySelector('#contact-point');
    this.gaugeBarElement = this.container.querySelector('#timing-bar-fill');
    this.gaugeStatusElement = this.container.querySelector('#timing-status');
    this.sparkCanvas = this.container.querySelector('#spark-canvas');
    this.sparkCtx = this.sparkCanvas.getContext('2d');
  }

  _bindEvents() {
    const keyStage = this.container.querySelector('#key-stage');

    // Pointer events on physical key
    const onDown = (e) => {
      e.preventDefault();
      this.pressDown();
    };

    const onUp = (e) => {
      e.preventDefault();
      this.pressUp();
    };

    keyStage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Prevent context menu on touch hold
    keyStage.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard Spacebar listener with auto-repeat suppression
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in an input, textarea, or contenteditable cell
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !this.isPressed) {
          this.pressDown();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        const isInput = activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable
        );
        if (isInput) return;

        e.preventDefault();
        if (this.isPressed) {
          this.pressUp();
        }
      }
    });

    // Quick Paddles for direct dot/dash tapping
    const dotBtn = this.container.querySelector('#btn-dot-paddle');
    const dashBtn = this.container.querySelector('#btn-dash-paddle');

    dotBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.tapDiscrete(120); // standard dot duration
    });

    dashBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.tapDiscrete(320); // standard dash duration
    });
  }

  pressDown() {
    if (this.isPressed) return;
    this.isPressed = true;
    this.pressStartTime = performance.now();

    this._applyLeverDepressed(true);
    this._createSparks(8);
    this._haptic(15);

    this.engine.pressDown();

    if (this.onPress) {
      this.onPress();
    }

    this._startGaugeTracking();
  }

  pressUp() {
    if (!this.isPressed) return;
    this.isPressed = false;

    this._applyLeverDepressed(false);
    this._stopGaugeTracking();

    this.engine.pressUp();

    if (this.onRelease) {
      this.onRelease();
    }
  }

  /**
   * Visually depress key when a remote peer presses their key
   */
  setRemotePress(isDown) {
    this.isRemotePressed = isDown;
    this._applyLeverDepressed(isDown || this.isPressed);
    if (isDown) {
      this._createSparks(6, true);
    }
  }

  _applyLeverDepressed(depressed) {
    if (depressed) {
      // Lever rotates 3.2 degrees around pivot (250, 130)
      this.leverElement.setAttribute('transform', 'rotate(3.2 250 130)');
      if (this.contactElement) {
        this.contactElement.setAttribute('opacity', '1');
        this.contactElement.setAttribute('r', '8');
      }
    } else {
      this.leverElement.removeAttribute('transform');
      if (this.contactElement) {
        this.contactElement.setAttribute('opacity', '0.2');
        this.contactElement.setAttribute('r', '5');
      }
    }
  }

  /**
   * Tap a discrete duration (dot or dash paddle)
   */
  async tapDiscrete(durationMs) {
    this.pressDown();
    await new Promise(resolve => setTimeout(resolve, durationMs));
    this.pressUp();
  }

  _startGaugeTracking() {
    const update = () => {
      if (!this.isPressed) return;
      const elapsed = performance.now() - this.pressStartTime;
      const pct = Math.min(100, (elapsed / 500) * 100);

      if (this.gaugeBarElement) {
        this.gaugeBarElement.style.width = `${pct}%`;
        if (elapsed < this.engine.dotThreshold) {
          this.gaugeBarElement.className = 'timing-bar-fill fill-dot';
          if (this.gaugeStatusElement) this.gaugeStatusElement.textContent = `DOT (•) ${Math.round(elapsed)}ms`;
        } else {
          this.gaugeBarElement.className = 'timing-bar-fill fill-dash';
          if (this.gaugeStatusElement) this.gaugeStatusElement.textContent = `DASH (—) ${Math.round(elapsed)}ms`;
        }
      }

      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }

  _stopGaugeTracking() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    setTimeout(() => {
      if (!this.isPressed && this.gaugeBarElement) {
        this.gaugeBarElement.style.width = '0%';
        if (this.gaugeStatusElement) this.gaugeStatusElement.textContent = 'READY';
      }
    }, 250);
  }

  _createSparks(count = 6, isRemote = false) {
    // Contact point coordinate mapped onto canvas
    const cx = 97;
    const cy = 105;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - (Math.PI * 0.5); // shoot upwards
      const speed = 1.5 + Math.random() * 4.5;
      this.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 2,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.05,
        color: isRemote ? '#00f5d4' : '#ffd166'
      });
    }
  }

  _startSparkLoop() {
    const render = () => {
      requestAnimationFrame(render);
      if (!this.sparkCtx) return;

      this.sparkCtx.clearRect(0, 0, this.sparkCanvas.width, this.sparkCanvas.height);

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const p = this.sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.life -= p.decay;

        if (p.life <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }

        this.sparkCtx.beginPath();
        this.sparkCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.sparkCtx.fillStyle = p.color;
        this.sparkCtx.globalAlpha = p.life;
        this.sparkCtx.fill();
        this.sparkCtx.globalAlpha = 1.0;
      }
    };
    requestAnimationFrame(render);
  }

  _haptic(ms = 20) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch {}
    }
  }
}
