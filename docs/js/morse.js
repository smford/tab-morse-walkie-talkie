/**
 * International Morse Code Dictionary, Timing Engine, and Translation Utilities
 */

export const MORSE_TABLE = {
  // Letters
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
  'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
  'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
  'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
  'Y': '-.--',  'Z': '--..',

  // Numbers
  '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..',
  '9': '----.', '0': '-----',

  // Punctuation & Special
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
  '!': '-.-.--', '/': '-..-.',  '(': '-.--.',  ')': '-.--.-',
  '&': '.-...',  ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.',  '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.',

  // Standard Radio Prosigns
  'SOS': '...---...',
  'AR': '.-.-.',    // End of message (+)
  'SK': '...-.-',   // End of contact
  'BT': '-...-',    // New section / break (=)
  'AS': '.-...',    // Please stand by
  'K': '-.-'        // Invitation to transmit
};

// Build reverse lookup table
export const MORSE_REVERSE = {};
for (const [char, code] of Object.entries(MORSE_TABLE)) {
  // Prefer single characters if prosign shares code
  if (!MORSE_REVERSE[code] || char.length === 1) {
    MORSE_REVERSE[code] = char;
  }
}
// Ensure key prosigns map correctly
MORSE_REVERSE['...---...'] = 'SOS';
MORSE_REVERSE['...-.-'] = 'SK';

/**
 * Decode a sequence of dots and dashes into a character/prosign
 */
export function decodeMorse(code) {
  const trimmed = code.trim();
  return MORSE_REVERSE[trimmed] || (trimmed.length > 0 ? '?' : '');
}

/**
 * Encode an alphanumeric string into Morse code representation
 */
export function encodeTextToMorse(text) {
  const words = text.toUpperCase().trim().split(/\s+/);
  return words.map(word => {
    return word.split('').map(char => MORSE_TABLE[char] || '').filter(Boolean).join(' ');
  }).join('   ');
}

/**
 * Find candidate characters starting with the given Morse prefix
 */
export function getMorseCandidates(prefix) {
  if (!prefix) return [];
  const matches = [];
  for (const [char, code] of Object.entries(MORSE_TABLE)) {
    if (code.startsWith(prefix) && char.length === 1) {
      matches.push({ char, code, exact: code === prefix });
    }
  }
  // Sort exact match first, then by code length
  matches.sort((a, b) => {
    if (a.exact && !b.exact) return -1;
    if (!a.exact && b.exact) return 1;
    return a.code.length - b.code.length;
  });
  return matches;
}

/**
 * State machine and timing engine for manual Morse straight-key input
 */
export class MorseEngine {
  constructor(options = {}) {
    // Configurable timing thresholds (in milliseconds)
    // Standard spec:
    // short press (<200ms) = dot (.)
    // long press (>=200ms) = dash (-)
    // pause (>400ms) = letter separator
    // pause (>1000ms) = word separator
    this.dotThreshold = options.dotThreshold ?? 200;
    this.letterGap = options.letterGap ?? 400;
    this.wordGap = options.wordGap ?? 1000;

    this.isKeyDown = false;
    this.keyDownTime = 0;
    this.currentSymbols = ''; // Current accumulated dots/dashes for pending letter
    this.currentWord = '';
    this.currentText = '';

    this.letterTimer = null;
    this.wordTimer = null;

    // Event callbacks
    this.onKeyDown = null;       // (startTime)
    this.onKeyUp = null;         // (duration, symbol, currentSymbols)
    this.onSymbol = null;        // (symbol, currentSymbols)
    this.onLetter = null;        // (char, symbolCode, fullText)
    this.onWord = null;          // (word, fullText)
    this.onBufferChange = null;  // ({ currentSymbols, currentWord, currentText, candidates })
  }

  setTimings({ dotThreshold, letterGap, wordGap }) {
    if (dotThreshold !== undefined) this.dotThreshold = Math.max(50, dotThreshold);
    if (letterGap !== undefined) this.letterGap = Math.max(100, letterGap);
    if (wordGap !== undefined) this.wordGap = Math.max(200, wordGap);
  }

  pressDown() {
    if (this.isKeyDown) return;
    this.isKeyDown = true;
    this.keyDownTime = performance.now();

    // Cancel pending letter and word commit timers
    this._clearTimers();

    if (this.onKeyDown) {
      this.onKeyDown(this.keyDownTime);
    }
  }

  pressUp() {
    if (!this.isKeyDown) return;
    this.isKeyDown = false;
    const duration = performance.now() - this.keyDownTime;

    // Determine dot vs dash based on threshold
    const symbol = duration < this.dotThreshold ? '.' : '-';
    this.currentSymbols += symbol;

    if (this.onKeyUp) {
      this.onKeyUp(duration, symbol, this.currentSymbols);
    }
    if (this.onSymbol) {
      this.onSymbol(symbol, this.currentSymbols);
    }

    this._notifyBufferChange();

    // Schedule letter separator pause
    this.letterTimer = setTimeout(() => {
      this._commitLetter();
    }, this.letterGap);
  }

  _commitLetter() {
    if (!this.currentSymbols) return;

    const code = this.currentSymbols;
    const char = decodeMorse(code);
    this.currentWord += char;
    this.currentText += char;
    this.currentSymbols = '';

    if (this.onLetter) {
      this.onLetter(char, code, this.currentText);
    }
    this._notifyBufferChange();

    // Schedule word separator pause
    this.wordTimer = setTimeout(() => {
      this._commitWord();
    }, this.wordGap - this.letterGap);
  }

  _commitWord() {
    if (!this.currentText || this.currentText.endsWith(' ')) return;

    this.currentWord = '';
    this.currentText += ' ';

    if (this.onWord) {
      this.onWord(this.currentText.trim(), this.currentText);
    }
    this._notifyBufferChange();
  }

  _clearTimers() {
    if (this.letterTimer) {
      clearTimeout(this.letterTimer);
      this.letterTimer = null;
    }
    if (this.wordTimer) {
      clearTimeout(this.wordTimer);
      this.wordTimer = null;
    }
  }

  _notifyBufferChange() {
    if (this.onBufferChange) {
      const candidates = getMorseCandidates(this.currentSymbols);
      this.onBufferChange({
        currentSymbols: this.currentSymbols,
        currentWord: this.currentWord,
        currentText: this.currentText,
        candidates
      });
    }
  }

  /**
   * Directly append an externally received symbol (e.g. from peer)
   */
  receiveSymbol(symbol) {
    this._clearTimers();
    this.currentSymbols += symbol;
    this._notifyBufferChange();

    this.letterTimer = setTimeout(() => {
      this._commitLetter();
    }, this.letterGap);
  }

  /**
   * Directly commit a received character or word
   */
  receiveChar(char, code = '') {
    this._clearTimers();
    this.currentSymbols = '';
    this.currentText += char;
    if (char === ' ') {
      this.currentWord = '';
    } else {
      this.currentWord += char;
    }
    if (this.onLetter) {
      this.onLetter(char, code, this.currentText);
    }
    this._notifyBufferChange();
  }

  clear() {
    this._clearTimers();
    this.isKeyDown = false;
    this.currentSymbols = '';
    this.currentWord = '';
    this.currentText = '';
    this._notifyBufferChange();
  }

  /**
   * Helper to decompose text into scheduled playback events based on WPM
   * Standard PARIS standard: 1 WPM = 50 units per minute.
   * Unit length (ms) = 1200 / WPM
   */
  static planTextTransmission(text, wpm = 15) {
    const unitMs = 1200 / Math.max(5, Math.min(40, wpm));
    const dotMs = unitMs;
    const dashMs = unitMs * 3;
    const intraSymbolMs = unitMs;
    const letterGapMs = unitMs * 3;
    const wordGapMs = unitMs * 7;

    const events = [];
    const clean = text.toUpperCase().trim();

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (char === ' ') {
        events.push({ type: 'pause', duration: wordGapMs, char: ' ' });
        continue;
      }
      const code = MORSE_TABLE[char];
      if (!code) continue;

      for (let s = 0; s < code.length; s++) {
        const symbol = code[s];
        const duration = symbol === '.' ? dotMs : dashMs;
        events.push({
          type: 'element',
          symbol,
          char,
          code,
          duration
        });
        if (s < code.length - 1) {
          events.push({ type: 'pause', duration: intraSymbolMs });
        }
      }

      if (i < clean.length - 1 && clean[i + 1] !== ' ') {
        events.push({ type: 'pause', duration: letterGapMs, endOfLetter: true, char, code });
      }
    }

    return { events, unitMs };
  }
}
