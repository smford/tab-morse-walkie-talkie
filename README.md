# Browser Tab Morse Code Walkie-Talkie

> **Live Site:** [https://stephenford.org/tab-morse-walkie-talkie/](https://stephenford.org/tab-morse-walkie-talkie/)

A covert, distraction-free communication tool that operates entirely within the browser tab UI using Morse code, dynamic favicons, Web Audio API tone synthesis, and real-time document title updates.

---

## ⚡ Concept

Traditional web messengers demand your full screen, constant attention, and active window focus. **Browser Tab Morse Code Walkie-Talkie** turns convention inside out:

- **Operates in the Tab Chrome:** You can switch to another tab or minimize the window while remaining in continuous two-way communication. The tab icon blinks Morse dots and dashes in real time, and decoded messages stream directly into the browser tab title with a typewriter effect.
- **Telegraph Straight-Key Timing:** A physical timing engine captures duration thresholds differentiating Morse dots (`<200ms`), dashes (`>=200ms`), letter pauses (`>400ms`), and word separators (`>1000ms`).
- **Zero-Latency Audio Carrier:** Web Audio API synthesizes a crisp 750 Hz sine wave with smooth 5ms/8ms attack and decay envelopes, replicating genuine continuous wave (CW) telegraph straight-key transmitters without click or distortion.
- **P2P Networking Without Central Servers:** Synchronizes across local browser tabs instantly using `BroadcastChannel` and connects across separate computers or mobile phones via WebRTC DataChannels with public STUN servers and QR codes.
- **Corporate Spreadsheet Decoy Mode:** Press <kbd>Escape</kbd> to instantly disguise the entire viewport as an authentic Microsoft Excel corporate spreadsheet with quarterly revenue and EBITDA forecasts, while covert keying, tab title streaming, and favicon signaling continue running in the background.

---

## ⚙️ Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   BROWSER TAB CHROME                   │
                    │  [<link rel="icon">]             [document.title]      │
                    │   32x32 Dynamic Canvas            Typewriter Stream    │
                    │   (LED / Needle / Radar)         [TX: SOS_] / [RX: HI] │
                    └───────────▲──────────────────────────────▲─────────────┘
                                │                              │
┌───────────────────────────────┴──────────────────────────────┴──────────────────────────────┐
│                                   APPLICATION CORE (app.js)                                 │
├────────────────────────────────┬─────────────────────────────┬──────────────────────────────┤
│       MORSE TIMING ENGINE      │       WEB AUDIO ENGINE      │       NETWORK ENGINE         │
│         (js/morse.js)          │        (js/audio.js)        │       (js/network.js)        │
│  - Dot: < 200ms                │  - 750 Hz Sine Oscillator   │  - BroadcastChannel (local)  │
│  - Dash: >= 200ms              │  - 5ms Attack / 8ms Decay   │  - WebRTC DataChannel (P2P)  │
│  - Letter Gap: > 400ms         │  - Contact Clack Transient  │  - Public STUN Servers       │
│  - Word Gap: > 1000ms          │  - Analyser Waveform Scope  │  - QR Code Pairing           │
└────────────────┬───────────────┴─────────────────────────────┴──────────────▲───────────────┘
                 │                                                            │
                 ▼                                                            ▼
┌────────────────────────────────┐                           ┌────────────────────────────────┐
│      TACTILE STRAIGHT KEY      │                           │      STEALTH DECOY MODE        │
│       (js/telegraph.js)        │                           │        (js/stealth.js)         │
│  - 3D Animated Lever Arm       │                           │  - Excel Ribbon & Formula Bar  │
│  - Electric Contact Sparks     │                           │  - Q3 Financial EBITDA Model   │
│  - Dot/Dash Timing Bar Gauge   │                           │  - Covert Morse Status HUD     │
│  - Spacebar & Touch Paddles    │                           │  - Toggle via Escape key       │
└────────────────────────────────┘                           └────────────────────────────────┘
```

### Key Browser APIs Used

1. **Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `AnalyserNode`):**
   Generates a pure 750 Hz CW carrier tone with custom envelope ramping to eliminate clicks/pops, alongside high-pass filtered micro-noise bursts simulating physical brass contact closure.
2. **Offscreen Canvas & Dynamic Favicons (`canvas.toDataURL()`):**
   Renders 32x32 pixel canvases updated at 60fps during transmission, piped directly into `<link rel="icon">`. Supports Signal Lamp, Galvanometer Needle, Radar Beacon, and Covert Excel modes.
3. **BroadcastChannel API (`morse-walkie-talkie`):**
   Zero-configuration inter-tab message passing allowing multiple open browser tabs on the same computer to chime, flash, and transmit to each other instantly.
4. **WebRTC DataChannel (`RTCPeerConnection`):**
   Direct peer-to-peer data transport across separate devices utilizing Google public STUN servers (`stun:stun.l.google.com:19302`) with copy-paste SDP tokens and integrated QR code scanning.
5. **DOM Fullscreen & Decoy Viewport:**
   Seamless overlay mimicking desktop spreadsheet software with interactive clickable cells, editable formula bars, and subtle covert status indicators.

---

## 📻 Why It's Quirky

1. **The Tab is the Interface:** While modern web apps fight for screen real estate and push intrusive notifications, this app relegates the entire conversational UI to a 16x16 pixel square and a 40-character window title.
2. **Tactile Vintage Physics:** Features an animated brass straight-key modeled after late 19th-century Morse telegraph apparatus, complete with spring tension screws, wood plinth, lever fulcrum rotation, and electric particle sparks.
3. **True Covert Operation:** The "Corporate Spreadsheet" decoy mode does not merely hide the screen; it provides a realistic, editable financial projection table that lets you continue tapping out Morse code on your Spacebar unnoticed.

---

## ⌨️ Controls & Shortcuts

| Key / Control | Action |
|---------------|--------|
| <kbd>Spacebar</kbd> | Press & hold straight-key to transmit Morse code |
| <kbd>Escape</kbd> | Toggle Corporate Spreadsheet Decoy Mode |
| <kbd>M</kbd> | Mute / Unmute audio tone |
| <kbd>C</kbd> | Clear current Morse buffer |
| <kbd>?</kbd> | Open International Morse Code Dictionary & Cheat Sheet |
| **Mouse / Touch** | Click or press on telegraph knob, or use Quick Tap paddles |

---

## 🛠️ Local Development

To run the application locally with zero build dependencies:

```bash
# Clone the repository
git clone https://github.com/smford/tab-morse-walkie-talkie.git
cd tab-morse-walkie-talkie

# Serve the static documentation root
python3 -m http.server 8080 --directory docs
```

Open `http://localhost:8080` in your browser. Open a second tab to test instant `BroadcastChannel` synchronization!

---

## 📄 License

MIT License. Designed and engineered for covert browser communications.
