/**
 * Document Title Streamer & Typewriter Animator
 * Streams decoded text directly into the browser tab title
 */

export class TitleEngine {
  constructor(options = {}) {
    this.baseTitle = options.baseTitle || 'Morse Walkie-Talkie';
    this.isStealthMode = false;
    this.stealthTitle = 'FY24 Q3 Operations & EBITDA Projections - Microsoft Excel';
    this.covertInStealth = options.covertInStealth ?? true; // show subtle [TEXT] in stealth title

    this.displayedText = '';
    this.targetText = '';
    this.currentCode = ''; // Pending Morse symbols (e.g. '...-')
    this.keyState = false;
    this.isRx = false;

    this.cursorVisible = true;
    this.typewriterInterval = null;
    this.cursorInterval = null;

    this._startCursorBlink();
    this.update();
  }

  setStealthMode(isStealth) {
    this.isStealthMode = isStealth;
    this.update();
  }

  setKeyState(isDown, isRx = false) {
    this.keyState = isDown;
    this.isRx = isRx;
    this.update();
  }

  setCurrentSymbols(symbols) {
    this.currentCode = symbols;
    this.update();
  }

  streamText(fullText) {
    this.targetText = fullText;
    this._startTypewriter();
  }

  clear() {
    this.displayedText = '';
    this.targetText = '';
    this.currentCode = '';
    this.update();
  }

  _startCursorBlink() {
    this.cursorInterval = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.update();
    }, 550);
  }

  _startTypewriter() {
    if (this.typewriterInterval) return;

    this.typewriterInterval = setInterval(() => {
      if (this.displayedText.length < this.targetText.length) {
        this.displayedText += this.targetText[this.displayedText.length];
        this.update();
      } else if (this.displayedText.length > this.targetText.length) {
        this.displayedText = this.targetText;
        this.update();
      } else {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
      }
    }, 40); // 40ms typewriter speed
  }

  update() {
    const cursor = this.cursorVisible ? '_' : ' ';

    if (this.isStealthMode) {
      if (this.covertInStealth && (this.displayedText || this.currentCode)) {
        const snippet = (this.displayedText + (this.currentCode ? ` ${this.currentCode}` : '')).slice(-16);
        document.title = `${this.stealthTitle} [${snippet.trim()}]`;
      } else {
        document.title = this.stealthTitle;
      }
      return;
    }

    // Normal Walkie-Talkie Title formatting
    const signalDot = this.keyState ? (this.isRx ? '🔷' : '🔴') : '●';
    const recentSnippet = this.displayedText.slice(-20);

    if (this.currentCode) {
      // Live keying in progress: show pending Morse dots and dashes
      document.title = `${signalDot} [${this.isRx ? 'RX' : 'TX'}] ${this.currentCode} ${cursor} | ${recentSnippet || this.baseTitle}`;
    } else if (this.displayedText) {
      // Streamed decoded message with typewriter cursor
      const prefix = this.isRx ? 'RX' : 'TX';
      document.title = `[${prefix}] ${recentSnippet}${cursor} | ${this.baseTitle}`;
    } else {
      // Idle online title
      document.title = `[CW] ${this.baseTitle} ${signalDot} Online`;
    }
  }

  destroy() {
    if (this.cursorInterval) clearInterval(this.cursorInterval);
    if (this.typewriterInterval) clearInterval(this.typewriterInterval);
  }
}
