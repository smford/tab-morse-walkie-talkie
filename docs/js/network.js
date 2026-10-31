/**
 * Networking Engine: Local Tab BroadcastChannel & Cross-Device WebRTC DataChannel
 */

export class NetworkEngine {
  constructor(options = {}) {
    this.peerId = 'tab-' + Math.random().toString(36).substring(2, 8);
    this.peerName = options.peerName || 'Station-' + this.peerId.slice(-4).toUpperCase();

    // BroadcastChannel for local browser tabs
    this.channelName = 'morse-walkie-talkie';
    this.bc = null;
    this.localPeers = new Map(); // peerId -> lastSeen timestamp

    // WebRTC P2P DataChannel
    this.rtcPeer = null;
    this.dataChannel = null;
    this.rtcState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
    this.rtcLatency = null;
    this.lastPingSent = 0;

    // Public STUN configuration
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];

    // Unified Event Handlers
    this.onPeerKeyDown = null;    // (peerId, source: 'bc'|'webrtc')
    this.onPeerKeyUp = null;      // (peerId, duration, symbol, source)
    this.onPeerChar = null;       // (peerId, char, morse, source)
    this.onPeerMessage = null;    // (peerId, text, morse, source)
    this.onTabsCountChange = null;// (count)
    this.onRtcStateChange = null; // (state, details)

    this._initBroadcastChannel();
    this._startHeartbeat();
  }

  // -------------------------------------------------------------
  // BroadcastChannel (Local Tabs)
  // -------------------------------------------------------------

  _initBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported in this browser.');
      return;
    }

    try {
      this.bc = new BroadcastChannel(this.channelName);
      this.bc.onmessage = (event) => this._handleBroadcastMessage(event.data);
      // Announce our presence
      this.sendBroadcast({ type: 'PRESENCE_JOIN', peerId: this.peerId, name: this.peerName });
    } catch (err) {
      console.error('Failed to initialize BroadcastChannel:', err);
    }
  }

  _handleBroadcastMessage(data) {
    if (!data || data.peerId === this.peerId) return;

    this.localPeers.set(data.peerId, Date.now());
    this._updateTabsCount();

    switch (data.type) {
      case 'PRESENCE_JOIN':
      case 'PRESENCE_HEARTBEAT':
        // Acknowledged peer
        break;

      case 'KEY_DOWN':
        if (this.onPeerKeyDown) this.onPeerKeyDown(data.peerId, 'bc');
        break;

      case 'KEY_UP':
        if (this.onPeerKeyUp) this.onPeerKeyUp(data.peerId, data.duration, data.symbol, 'bc');
        break;

      case 'CHAR':
        if (this.onPeerChar) this.onPeerChar(data.peerId, data.char, data.morse, 'bc');
        break;

      case 'MESSAGE':
        if (this.onPeerMessage) this.onPeerMessage(data.peerId, data.text, data.morse, 'bc');
        break;
    }
  }

  sendBroadcast(payload) {
    if (!this.bc) return;
    try {
      this.bc.postMessage({
        ...payload,
        peerId: this.peerId,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('BroadcastChannel send error:', err);
    }
  }

  _startHeartbeat() {
    setInterval(() => {
      // Purge dead tabs (older than 10s)
      const now = Date.now();
      let changed = false;
      for (const [id, seen] of this.localPeers.entries()) {
        if (now - seen > 10000) {
          this.localPeers.delete(id);
          changed = true;
        }
      }
      if (changed) this._updateTabsCount();

      // Send heartbeat
      this.sendBroadcast({ type: 'PRESENCE_HEARTBEAT' });
    }, 4000);
  }

  _updateTabsCount() {
    const totalTabs = this.localPeers.size + 1; // including self
    if (this.onTabsCountChange) {
      this.onTabsCountChange(totalTabs);
    }
  }

  // -------------------------------------------------------------
  // WebRTC P2P DataChannel (Cross-Device)
  // -------------------------------------------------------------

  /**
   * Host Room: Creates Offer and waits for ICE candidates
   */
  async createOffer() {
    this._closeWebRTC();
    this._setRtcState('connecting', 'Generating offer & gathering ICE candidates...');

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.rtcPeer = pc;

    // Create DataChannel with reliable=false / unordered for minimum latency real-time keying
    const dc = pc.createDataChannel('morse-channel', {
      ordered: true // ordered allows message integrity while maintaining sub-50ms latency
    });
    this._setupDataChannel(dc);

    // Collect ICE candidates before returning SDP string
    const candidatesPromise = new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          // ICE gathering finished
          resolve();
        }
      };
      // Fallback timeout in case gathering takes too long
      setTimeout(resolve, 3500);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await candidatesPromise;

    const offerSignal = {
      type: 'offer',
      sdp: pc.localDescription.sdp,
      hostName: this.peerName
    };

    return btoa(JSON.stringify(offerSignal));
  }

  /**
   * Client: Creates Answer from Host's Offer
   */
  async createAnswer(offerEncoded) {
    this._closeWebRTC();
    this._setRtcState('connecting', 'Parsing offer & generating answer...');

    let offerSignal;
    try {
      offerSignal = JSON.parse(atob(offerEncoded.trim()));
      if (offerSignal.type !== 'offer' || !offerSignal.sdp) {
        throw new Error('Invalid offer payload');
      }
    } catch {
      throw new Error('Could not parse connection string. Please check the code.');
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.rtcPeer = pc;

    // Handle remote DataChannel
    pc.ondatachannel = (event) => {
      this._setupDataChannel(event.channel);
    };

    const candidatesPromise = new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          resolve();
        }
      };
      setTimeout(resolve, 3500);
    });

    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: offerSignal.sdp
    }));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await candidatesPromise;

    const answerSignal = {
      type: 'answer',
      sdp: pc.localDescription.sdp,
      clientName: this.peerName
    };

    return btoa(JSON.stringify(answerSignal));
  }

  /**
   * Host: Finalizes Connection with Client's Answer
   */
  async acceptAnswer(answerEncoded) {
    if (!this.rtcPeer) {
      throw new Error('No active WebRTC session to accept answer.');
    }

    let answerSignal;
    try {
      answerSignal = JSON.parse(atob(answerEncoded.trim()));
      if (answerSignal.type !== 'answer' || !answerSignal.sdp) {
        throw new Error('Invalid answer payload');
      }
    } catch {
      throw new Error('Could not parse answer string.');
    }

    await this.rtcPeer.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answerSignal.sdp
    }));

    this._setRtcState('connecting', 'Handshake complete, establishing connection...');
  }

  _setupDataChannel(dc) {
    this.dataChannel = dc;

    dc.onopen = () => {
      this._setRtcState('connected', 'P2P Encrypted DataChannel Open');
      this._startRtcPing();
    };

    dc.onclose = () => {
      this._setRtcState('disconnected', 'DataChannel Closed');
    };

    dc.onerror = (err) => {
      console.error('DataChannel error:', err);
      this._setRtcState('disconnected', 'DataChannel Error');
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleDataChannelMessage(msg);
      } catch (err) {
        console.error('DataChannel parse error:', err);
      }
    };
  }

  _handleDataChannelMessage(msg) {
    switch (msg.type) {
      case 'PING':
        this.sendRtc({ type: 'PONG', pingTime: msg.pingTime });
        break;

      case 'PONG':
        this.rtcLatency = Math.round(Date.now() - msg.pingTime);
        if (this.onRtcStateChange) {
          this.onRtcStateChange(this.rtcState, { latency: this.rtcLatency });
        }
        break;

      case 'KEY_DOWN':
        if (this.onPeerKeyDown) this.onPeerKeyDown(msg.peerId, 'webrtc');
        break;

      case 'KEY_UP':
        if (this.onPeerKeyUp) this.onPeerKeyUp(msg.peerId, msg.duration, msg.symbol, 'webrtc');
        break;

      case 'CHAR':
        if (this.onPeerChar) this.onPeerChar(msg.peerId, msg.char, msg.morse, 'webrtc');
        break;

      case 'MESSAGE':
        if (this.onPeerMessage) this.onPeerMessage(msg.peerId, msg.text, msg.morse, 'webrtc');
        break;
    }
  }

  sendRtc(payload) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify({
          ...payload,
          peerId: this.peerId,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('DataChannel send error:', err);
      }
    }
  }

  _startRtcPing() {
    setInterval(() => {
      if (this.dataChannel?.readyState === 'open') {
        this.sendRtc({ type: 'PING', pingTime: Date.now() });
      }
    }, 5000);
  }

  _setRtcState(state, details = '') {
    this.rtcState = state;
    if (this.onRtcStateChange) {
      this.onRtcStateChange(state, { details, latency: this.rtcLatency });
    }
  }

  _closeWebRTC() {
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }
    if (this.rtcPeer) {
      try { this.rtcPeer.close(); } catch {}
      this.rtcPeer = null;
    }
    this._setRtcState('disconnected', 'Disconnected');
  }

  // -------------------------------------------------------------
  // Universal Multi-Cast (Broadcast to both Local Tabs and WebRTC)
  // -------------------------------------------------------------

  broadcastKeyDown() {
    const payload = { type: 'KEY_DOWN' };
    this.sendBroadcast(payload);
    this.sendRtc(payload);
  }

  broadcastKeyUp(duration, symbol) {
    const payload = { type: 'KEY_UP', duration, symbol };
    this.sendBroadcast(payload);
    this.sendRtc(payload);
  }

  broadcastChar(char, morse) {
    const payload = { type: 'CHAR', char, morse };
    this.sendBroadcast(payload);
    this.sendRtc(payload);
  }

  broadcastMessage(text, morse) {
    const payload = { type: 'MESSAGE', text, morse };
    this.sendBroadcast(payload);
    this.sendRtc(payload);
  }
}
