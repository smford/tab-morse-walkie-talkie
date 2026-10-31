/**
 * Main Application Orchestrator
 * Integrates Morse engine, Web Audio, dynamic favicon canvas, document.title typewriter,
 * local BroadcastChannel, WebRTC DataChannel, tactile telegraph key, and stealth decoy mode.
 */

import { MORSE_TABLE, MorseEngine, getMorseCandidates } from './morse.js';
import { AudioEngine } from './audio.js';
import { FaviconEngine } from './favicon.js';
import { TitleEngine } from './title.js';
import { NetworkEngine } from './network.js';
import { TelegraphKey } from './telegraph.js';
import { StealthMode } from './stealth.js';
import { qrcode } from './qrcode.js';

class MorseWalkieTalkieApp {
  constructor() {
    // 1. Initialize Subsystems
    this.morse = new MorseEngine({
      dotThreshold: 200,
      letterGap: 400,
      wordGap: 1000
    });

    this.audio = new AudioEngine({
      txFrequency: 750,
      rxFrequency: 650,
      volume: 0.8
    });

    this.favicon = new FaviconEngine({ mode: 'lamp' });
    this.title = new TitleEngine({ baseTitle: 'Morse Walkie-Talkie' });
    this.network = new NetworkEngine();

    // Transmission history state
    this.history = []; // { id, timestamp, type: 'TX'|'RX', text, morse, peerId }
    this.isAutoTransmitting = false;
    this.autoCancelToken = null;

    // DOM Elements
    this.els = {};

    this._cacheElements();
    this._initTelegraphKey();
    this._initStealthMode();
    this._setupSubsystemCallbacks();
    this._bindUIEvents();
    this._initOscilloscope();
    this._renderCheatSheet();

    // Welcome log
    this._appendHistoryItem({
      type: 'SYS',
      text: 'TRANSMITTER INITIALIZED. PRESS SPACEBAR OR CLICK STRAIGHT KEY TO KEY CW.',
      morse: '-.-',
      timestamp: new Date().toLocaleTimeString()
    });
  }

  _cacheElements() {
    this.els = {
      // Live Morse HUD
      liveMorseBuffer: document.getElementById('live-morse-buffer'),
      liveTextBuffer: document.getElementById('live-text-buffer'),
      candidatesList: document.getElementById('candidates-list'),
      btnBufferClear: document.getElementById('btn-buffer-clear'),
      btnBufferCommit: document.getElementById('btn-buffer-commit'),

      // Transmission Log
      historyList: document.getElementById('history-list'),
      btnClearHistory: document.getElementById('btn-clear-history'),
      btnExportHistory: document.getElementById('btn-export-history'),

      // Manual Text Transmitter
      txTextInput: document.getElementById('tx-text-input'),
      txWpmSlider: document.getElementById('tx-wpm-slider'),
      txWpmValue: document.getElementById('tx-wpm-value'),
      btnAutoTransmit: document.getElementById('btn-auto-transmit'),
      btnStopTransmit: document.getElementById('btn-stop-transmit'),

      // Audio & Stealth Controls
      btnSoundToggle: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      volumeSlider: document.getElementById('volume-slider'),
      pitchSlider: document.getElementById('pitch-slider'),
      pitchValue: document.getElementById('pitch-value'),
      faviconModeSelect: document.getElementById('favicon-mode-select'),
      btnStealthToggle: document.getElementById('btn-stealth-toggle'),

      // Status Badges
      localTabsCount: document.getElementById('local-tabs-count'),
      webrtcStatusBadge: document.getElementById('webrtc-status-badge'),
      stationCallsign: document.getElementById('station-callsign'),

      // Modals
      btnOpenConnect: document.getElementById('btn-open-connect'),
      modalConnect: document.getElementById('modal-connect'),
      btnCloseConnect: document.getElementById('btn-close-connect'),
      hostSignalOutput: document.getElementById('host-signal-output'),
      hostQrContainer: document.getElementById('host-qr-container'),
      btnCopyHostOffer: document.getElementById('btn-copy-host-offer'),
      clientAnswerInput: document.getElementById('client-answer-input'),
      btnAcceptAnswer: document.getElementById('btn-accept-answer'),
      btnGenerateOffer: document.getElementById('btn-generate-offer'),
      joinOfferInput: document.getElementById('join-offer-input'),
      btnGenerateAnswer: document.getElementById('btn-generate-answer'),
      joinAnswerOutput: document.getElementById('join-answer-output'),
      joinQrContainer: document.getElementById('join-qr-container'),
      btnCopyJoinAnswer: document.getElementById('btn-copy-join-answer'),

      // Cheat Sheet Modal
      btnOpenReference: document.getElementById('btn-open-reference'),
      modalReference: document.getElementById('modal-reference'),
      btnCloseReference: document.getElementById('btn-close-reference'),
      referenceSearch: document.getElementById('reference-search'),
      referenceGrid: document.getElementById('reference-grid'),

      // Oscilloscope Canvas
      scopeCanvas: document.getElementById('scope-canvas')
    };

    if (this.els.stationCallsign) {
      this.els.stationCallsign.textContent = this.network.peerName;
    }
  }

  _initTelegraphKey() {
    const stageContainer = document.getElementById('telegraph-mount');
    this.key = new TelegraphKey(stageContainer, this.morse, {
      onPress: () => {
        this.audio.startTone(false);
        this.favicon.setKeyState(true, false);
        this.title.setKeyState(true, false);
        this.network.broadcastKeyDown();
        this.stealth.updateCovertStatus(this.morse.currentSymbols, this.morse.currentText, true);
      },
      onRelease: () => {
        this.audio.stopTone(false);
        this.favicon.setKeyState(false, false);
        this.title.setKeyState(false, false);
        this.network.broadcastKeyUp(
          performance.now() - this.key.pressStartTime,
          this.morse.currentSymbols.slice(-1)
        );
        this.stealth.updateCovertStatus(this.morse.currentSymbols, this.morse.currentText, false);
      }
    });
  }

  _initStealthMode() {
    const stealthMount = document.getElementById('stealth-mount');
    this.stealth = new StealthMode(stealthMount, {
      onToggle: (isActive) => {
        this.title.setStealthMode(isActive);
        if (isActive) {
          this.els.btnStealthToggle?.classList.add('active');
        } else {
          this.els.btnStealthToggle?.classList.remove('active');
        }
      }
    });
  }

  _setupSubsystemCallbacks() {
    // 1. Morse Engine Callbacks
    this.morse.onBufferChange = ({ currentSymbols, currentText, candidates }) => {
      if (this.els.liveMorseBuffer) {
        this.els.liveMorseBuffer.textContent = currentSymbols || '•••';
        this.els.liveMorseBuffer.classList.toggle('empty', !currentSymbols);
      }
      if (this.els.liveTextBuffer) {
        this.els.liveTextBuffer.textContent = currentText || 'Waiting for signal...';
        this.els.liveTextBuffer.classList.toggle('empty', !currentText);
      }
      this.title.setCurrentSymbols(currentSymbols);
      this.title.streamText(currentText);
      this.stealth.updateCovertStatus(currentSymbols, currentText, this.key.isPressed);

      this._renderCandidates(candidates);
    };

    this.morse.onLetter = (char, code, fullText) => {
      this.network.broadcastChar(char, code);
    };

    this.morse.onWord = (word, fullText) => {
      this._appendHistoryItem({
        type: 'TX',
        text: word,
        morse: word.split('').map(c => MORSE_TABLE[c] || '').join(' '),
        timestamp: new Date().toLocaleTimeString(),
        peerId: 'YOU'
      });
      this.network.broadcastMessage(word, word.split('').map(c => MORSE_TABLE[c] || '').join(' '));
    };

    // 2. Network Events (BroadcastChannel & WebRTC)
    this.network.onPeerKeyDown = (peerId, source) => {
      this.key.setRemotePress(true);
      this.audio.startTone(true);
      this.favicon.setKeyState(true, true);
      this.title.setKeyState(true, true);
      this.stealth.updateCovertStatus(this.morse.currentSymbols, this.morse.currentText, true);
    };

    this.network.onPeerKeyUp = (peerId, duration, symbol, source) => {
      this.key.setRemotePress(false);
      this.audio.stopTone(true);
      this.favicon.setKeyState(false, true);
      this.title.setKeyState(false, true);
      this.stealth.updateCovertStatus(this.morse.currentSymbols, this.morse.currentText, false);
      if (symbol) {
        this.morse.receiveSymbol(symbol);
      }
    };

    this.network.onPeerChar = (peerId, char, morse, source) => {
      // Local engine sync
    };

    this.network.onPeerMessage = (peerId, text, morse, source) => {
      this._appendHistoryItem({
        type: 'RX',
        text,
        morse,
        timestamp: new Date().toLocaleTimeString(),
        peerId: peerId.slice(-4).toUpperCase() + ` (${source.toUpperCase()})`
      });
      this.title.streamText(text);
    };

    this.network.onTabsCountChange = (count) => {
      if (this.els.localTabsCount) {
        this.els.localTabsCount.textContent = count > 1 ? `${count} Tabs Active` : '1 Tab (Solo)';
        this.els.localTabsCount.classList.toggle('highlight', count > 1);
      }
    };

    this.network.onRtcStateChange = (state, details = {}) => {
      if (!this.els.webrtcStatusBadge) return;

      this.els.webrtcStatusBadge.className = `status-badge rtc-${state}`;
      if (state === 'connected') {
        const ping = details.latency !== null ? ` (${details.latency}ms)` : '';
        this.els.webrtcStatusBadge.textContent = `P2P Connected${ping}`;
      } else if (state === 'connecting') {
        this.els.webrtcStatusBadge.textContent = 'P2P Connecting...';
      } else {
        this.els.webrtcStatusBadge.textContent = 'P2P Offline';
      }
    };
  }

  _bindUIEvents() {
    // Clear live buffer
    this.els.btnBufferClear?.addEventListener('click', () => {
      this.morse.clear();
      this.title.clear();
    });

    // Commit current buffer as word
    this.els.btnBufferCommit?.addEventListener('click', () => {
      if (this.morse.currentText.trim()) {
        const text = this.morse.currentText.trim();
        this._appendHistoryItem({
          type: 'TX',
          text,
          morse: text.split('').map(c => MORSE_TABLE[c] || '').join(' '),
          timestamp: new Date().toLocaleTimeString(),
          peerId: 'YOU'
        });
        this.network.broadcastMessage(text, text.split('').map(c => MORSE_TABLE[c] || '').join(' '));
        this.morse.clear();
      }
    });

    // Clear history log
    this.els.btnClearHistory?.addEventListener('click', () => {
      this.history = [];
      if (this.els.historyList) this.els.historyList.innerHTML = '';
    });

    // Export history
    this.els.btnExportHistory?.addEventListener('click', () => {
      const content = this.history.map(item =>
        `[${item.timestamp}] [${item.type}] (${item.peerId || 'SYS'}) ${item.text} | ${item.morse || ''}`
      ).join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `morse-log-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Sound toggle button
    this.els.btnSoundToggle?.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this._updateSoundUI(isMuted);
    });

    // M keyboard shortcut for mute
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.audio.toggleMute();
        this._updateSoundUI(isMuted);
      }
    });

    // Volume Slider
    this.els.volumeSlider?.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      this.audio.setVolume(vol);
      if (this.audio.isMuted) {
        this.audio.setMute(false);
        this._updateSoundUI(false);
      }
    });

    // Pitch Slider
    this.els.pitchSlider?.addEventListener('input', (e) => {
      const freq = parseInt(e.target.value, 10);
      this.audio.setFrequency(freq, false);
      if (this.els.pitchValue) this.els.pitchValue.textContent = `${freq} Hz`;
    });

    // Favicon Mode Select
    this.els.faviconModeSelect?.addEventListener('change', (e) => {
      this.favicon.setMode(e.target.value);
    });

    // Stealth Mode Button
    this.els.btnStealthToggle?.addEventListener('click', () => {
      this.stealth.toggle();
    });

    // Manual Text Auto-Transmitter
    this.els.txWpmSlider?.addEventListener('input', (e) => {
      if (this.els.txWpmValue) this.els.txWpmValue.textContent = `${e.target.value} WPM`;
    });

    this.els.btnAutoTransmit?.addEventListener('click', () => {
      const text = this.els.txTextInput?.value.trim();
      if (!text) return;
      const wpm = parseInt(this.els.txWpmSlider?.value || '15', 10);
      this.autoTransmitText(text, wpm);
    });

    this.els.btnStopTransmit?.addEventListener('click', () => {
      this.stopAutoTransmission();
    });

    // Connect Modal
    this.els.btnOpenConnect?.addEventListener('click', () => {
      this.els.modalConnect?.showModal();
    });
    this.els.btnCloseConnect?.addEventListener('click', () => {
      this.els.modalConnect?.close();
    });

    // Connect WebRTC Host: Generate Offer
    this.els.btnGenerateOffer?.addEventListener('click', async () => {
      try {
        this.els.btnGenerateOffer.disabled = true;
        this.els.btnGenerateOffer.textContent = 'Generating...';
        const offer = await this.network.createOffer();
        if (this.els.hostSignalOutput) this.els.hostSignalOutput.value = offer;
        this._renderQrCode(this.els.hostQrContainer, offer);
      } catch (err) {
        alert('Failed to create offer: ' + err.message);
      } finally {
        this.els.btnGenerateOffer.disabled = false;
        this.els.btnGenerateOffer.textContent = 'Regenerate Host Offer';
      }
    });

    this.els.btnCopyHostOffer?.addEventListener('click', () => {
      const val = this.els.hostSignalOutput?.value;
      if (val) {
        navigator.clipboard.writeText(val);
        this.els.btnCopyHostOffer.textContent = 'Copied!';
        setTimeout(() => this.els.btnCopyHostOffer.textContent = 'Copy Code', 1500);
      }
    });

    this.els.btnAcceptAnswer?.addEventListener('click', async () => {
      const ans = this.els.clientAnswerInput?.value.trim();
      if (!ans) return alert('Please paste the client answer string first.');
      try {
        await this.network.acceptAnswer(ans);
        alert('WebRTC Handshake accepted! Connecting P2P...');
        this.els.modalConnect?.close();
      } catch (err) {
        alert('Error accepting answer: ' + err.message);
      }
    });

    // Connect WebRTC Client: Generate Answer
    this.els.btnGenerateAnswer?.addEventListener('click', async () => {
      const offer = this.els.joinOfferInput?.value.trim();
      if (!offer) return alert('Please paste the host offer code first.');
      try {
        this.els.btnGenerateAnswer.disabled = true;
        this.els.btnGenerateAnswer.textContent = 'Generating...';
        const answer = await this.network.createAnswer(offer);
        if (this.els.joinAnswerOutput) this.els.joinAnswerOutput.value = answer;
        this._renderQrCode(this.els.joinQrContainer, answer);
      } catch (err) {
        alert('Error joining: ' + err.message);
      } finally {
        this.els.btnGenerateAnswer.disabled = false;
        this.els.btnGenerateAnswer.textContent = 'Generate Answer';
      }
    });

    this.els.btnCopyJoinAnswer?.addEventListener('click', () => {
      const val = this.els.joinAnswerOutput?.value;
      if (val) {
        navigator.clipboard.writeText(val);
        this.els.btnCopyJoinAnswer.textContent = 'Copied!';
        setTimeout(() => this.els.btnCopyJoinAnswer.textContent = 'Copy Answer Code', 1500);
      }
    });

    // Reference Sheet Modal
    this.els.btnOpenReference?.addEventListener('click', () => {
      this.els.modalReference?.showModal();
    });
    this.els.btnCloseReference?.addEventListener('click', () => {
      this.els.modalReference?.close();
    });
    this.els.referenceSearch?.addEventListener('input', (e) => {
      this._filterCheatSheet(e.target.value);
    });
  }

  _updateSoundUI(isMuted) {
    if (this.els.btnSoundToggle) {
      this.els.btnSoundToggle.classList.toggle('muted', isMuted);
    }
    if (this.els.soundIcon) {
      this.els.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  _renderCandidates(candidates) {
    if (!this.els.candidatesList) return;
    if (!candidates || candidates.length === 0) {
      this.els.candidatesList.innerHTML = '<span class="candidate-empty">None</span>';
      return;
    }

    const html = candidates.slice(0, 7).map(c => `
      <span class="candidate-pill ${c.exact ? 'candidate-exact' : ''}" title="Tap ${c.code} for '${c.char}'">
        <strong class="cand-char">${c.char}</strong>
        <span class="cand-code">${c.code}</span>
      </span>
    `).join('');

    this.els.candidatesList.innerHTML = html;
  }

  _renderQrCode(container, text) {
    if (!container || !text) return;
    try {
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      container.innerHTML = qr.createSvgTag(3, 2);
    } catch (err) {
      console.warn('QR generation error:', err);
      container.innerHTML = '<span class="qr-fallback">Code generated. Use Copy button.</span>';
    }
  }

  _appendHistoryItem(item) {
    this.history.push(item);
    if (!this.els.historyList) return;

    const row = document.createElement('div');
    row.className = `history-item type-${item.type.toLowerCase()}`;
    row.innerHTML = `
      <div class="history-meta">
        <span class="history-badge badge-${item.type.toLowerCase()}">${item.type}</span>
        <span class="history-peer">${item.peerId || ''}</span>
        <span class="history-time">${item.timestamp}</span>
      </div>
      <div class="history-body">
        <span class="history-text">${item.text}</span>
        ${item.morse ? `<span class="history-morse">${item.morse}</span>` : ''}
      </div>
      <button type="button" class="btn-copy-msg" title="Copy text">📋</button>
    `;

    row.querySelector('.btn-copy-msg')?.addEventListener('click', () => {
      navigator.clipboard.writeText(item.text);
    });

    this.els.historyList.appendChild(row);
    this.els.historyList.scrollTop = this.els.historyList.scrollHeight;
  }

  async autoTransmitText(text, wpm) {
    if (this.isAutoTransmitting) {
      this.stopAutoTransmission();
      await new Promise(r => setTimeout(r, 100));
    }

    this.isAutoTransmitting = true;
    const cancelToken = { cancelled: false };
    this.autoCancelToken = cancelToken;

    this.els.btnAutoTransmit.style.display = 'none';
    this.els.btnStopTransmit.style.display = 'inline-flex';

    const { events } = MorseEngine.planTextTransmission(text, wpm);

    let transmittedText = '';

    for (const evt of events) {
      if (cancelToken.cancelled) break;

      if (evt.type === 'element') {
        this.key.pressDown();
        await new Promise(r => setTimeout(r, evt.duration));
        this.key.pressUp();
      } else if (evt.type === 'pause') {
        if (evt.endOfLetter) {
          transmittedText += evt.char;
          this.title.streamText(transmittedText);
        } else if (evt.char === ' ') {
          transmittedText += ' ';
          this.title.streamText(transmittedText);
        }
        await new Promise(r => setTimeout(r, evt.duration));
      }
    }

    this.stopAutoTransmission();
  }

  stopAutoTransmission() {
    if (this.autoCancelToken) {
      this.autoCancelToken.cancelled = true;
      this.autoCancelToken = null;
    }
    this.isAutoTransmitting = false;
    this.key.pressUp();
    if (this.els.btnAutoTransmit) this.els.btnAutoTransmit.style.display = 'inline-flex';
    if (this.els.btnStopTransmit) this.els.btnStopTransmit.style.display = 'none';
  }

  _initOscilloscope() {
    const canvas = this.els.scopeCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dataArray = new Uint8Array(256);

    const render = () => {
      requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#1e2633';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      this.audio.getWaveformData(dataArray);

      ctx.lineWidth = 2;
      ctx.strokeStyle = (this.key.isPressed || this.key.isRemotePressed)
        ? (this.key.isRemotePressed ? '#00f5d4' : '#ffb703')
        : '#374151';

      ctx.beginPath();
      const sliceWidth = w / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };

    render();
  }

  _renderCheatSheet() {
    if (!this.els.referenceGrid) return;
    const entries = Object.entries(MORSE_TABLE);

    const html = entries.map(([char, code]) => `
      <button type="button" class="ref-card" data-char="${char}" data-code="${code}" title="Click to hear '${char}'">
        <span class="ref-char">${char}</span>
        <span class="ref-code">${code}</span>
        <span class="ref-play">▶</span>
      </button>
    `).join('');

    this.els.referenceGrid.innerHTML = html;

    this.els.referenceGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.ref-card');
      if (!card) return;
      const char = card.dataset.char;
      this.autoTransmitText(char, 18);
    });
  }

  _filterCheatSheet(query) {
    if (!this.els.referenceGrid) return;
    const q = query.toUpperCase().trim();
    const cards = this.els.referenceGrid.querySelectorAll('.ref-card');
    cards.forEach(card => {
      const char = card.dataset.char;
      const code = card.dataset.code;
      const match = !q || char.includes(q) || code.includes(q);
      card.style.display = match ? 'flex' : 'none';
    });
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MorseWalkieTalkieApp();
});
