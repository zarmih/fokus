// Simple WebRTC + WebSocket Signaling wrapper

export class P2PConnection {
  pc: RTCPeerConnection;
  channel?: RTCDataChannel;
  ws?: WebSocket;
  isHost = false;
  
  onConnected?: () => void;
  onMessage?: (data: any) => void;
  onError?: (err: Error) => void;
  onCode?: (code: string) => void;

  constructor(private wsUrl = 'ws://localhost:8080') {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.onicecandidate = (e) => {
      if (e.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'SIGNAL',
          payload: { type: 'ice', candidate: e.candidate }
        }));
      }
    };

    this.pc.ondatachannel = (e) => {
      this.channel = e.channel;
      this.setupChannel();
    };
  }

  private setupChannel() {
    if (!this.channel) return;
    this.channel.onopen = () => {
      if (this.onConnected) this.onConnected();
    };
    this.channel.onmessage = (e) => {
      if (this.onMessage) {
        try {
          this.onMessage(JSON.parse(e.data));
        } catch (err) {
          this.onMessage(e.data);
        }
      }
    };
  }

  connectWS(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(new Error('WebSocket error'));
      
      this.ws.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'CREATED') {
          if (this.onCode) this.onCode(msg.code);
        } else if (msg.type === 'GUEST_JOINED') {
          // Host creates offer
          const offer = await this.pc.createOffer();
          await this.pc.setLocalDescription(offer);
          this.ws!.send(JSON.stringify({ type: 'SIGNAL', payload: { type: 'offer', sdp: offer } }));
        } else if (msg.type === 'SIGNAL') {
          const payload = msg.payload;
          if (payload.type === 'offer') {
            await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.ws!.send(JSON.stringify({ type: 'SIGNAL', payload: { type: 'answer', sdp: answer } }));
          } else if (payload.type === 'answer') {
            await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (payload.type === 'ice') {
            await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        }
      };
    });
  }

  async host() {
    this.isHost = true;
    this.channel = this.pc.createDataChannel('fokus-sync');
    this.setupChannel();
    await this.connectWS();
    this.ws!.send(JSON.stringify({ type: 'CREATE' }));
  }

  async join(code: string) {
    this.isHost = false;
    await this.connectWS();
    this.ws!.send(JSON.stringify({ type: 'JOIN', code }));
  }

  send(data: any) {
    if (this.channel?.readyState === 'open') {
      this.channel.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  close() {
    if (this.ws) this.ws.close();
    if (this.channel) this.channel.close();
    this.pc.close();
  }
}
