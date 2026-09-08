export class P2PConnection {
  private pc: RTCPeerConnection;
  private channel?: RTCDataChannel;
  public onMessage?: (data: any) => void;
  public onConnected?: () => void;

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'connected') {
        if (this.onConnected) this.onConnected();
      }
    };

    this.pc.ondatachannel = (event) => {
      this.channel = event.channel;
      this.setupChannel();
    };
  }

  private setupChannel() {
    if (!this.channel) return;
    this.channel.onopen = () => {
      if (this.onConnected) this.onConnected();
    };
    this.channel.onmessage = (e) => {
      if (this.onMessage) this.onMessage(JSON.parse(e.data));
    };
  }

  public async createOffer(): Promise<string> {
    this.channel = this.pc.createDataChannel('duel');
    this.setupChannel();
    
    return new Promise((resolve) => {
      this.pc.onicecandidate = (e) => {
        if (e.candidate === null) {
          resolve(btoa(JSON.stringify(this.pc.localDescription)));
        }
      };
      this.pc.createOffer().then(o => this.pc.setLocalDescription(o));
    });
  }

  public async acceptOffer(offerB64: string): Promise<string> {
    const offer = JSON.parse(atob(offerB64));
    await this.pc.setRemoteDescription(offer);
    
    return new Promise((resolve) => {
      this.pc.onicecandidate = (e) => {
        if (e.candidate === null) {
          resolve(btoa(JSON.stringify(this.pc.localDescription)));
        }
      };
      this.pc.createAnswer().then(a => this.pc.setLocalDescription(a));
    });
  }

  public async acceptAnswer(answerB64: string) {
    const answer = JSON.parse(atob(answerB64));
    await this.pc.setRemoteDescription(answer);
  }

  public send(data: any) {
    if (this.channel && this.channel.readyState === 'open') {
      this.channel.send(JSON.stringify(data));
    }
  }
}
