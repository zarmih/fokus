import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

// Map of 4-digit codes to connections
// A session has two peers: host and guest
const sessions = new Map();

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

wss.on('connection', (ws) => {
  let myCode = null;
  let isHost = false;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'CREATE':
          // Host creates a session
          myCode = generateCode();
          while (sessions.has(myCode)) {
            myCode = generateCode();
          }
          sessions.set(myCode, { host: ws, guest: null });
          isHost = true;
          ws.send(JSON.stringify({ type: 'CREATED', code: myCode }));
          break;

        case 'JOIN':
          // Guest joins a session
          const code = data.code;
          if (sessions.has(code)) {
            const session = sessions.get(code);
            if (!session.guest) {
              session.guest = ws;
              myCode = code;
              isHost = false;
              ws.send(JSON.stringify({ type: 'JOINED' }));
              session.host.send(JSON.stringify({ type: 'GUEST_JOINED' }));
            } else {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Сессия полная' }));
            }
          } else {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Код не найден' }));
          }
          break;

        case 'SIGNAL':
          // Forward signaling data to the other peer
          if (myCode && sessions.has(myCode)) {
            const session = sessions.get(myCode);
            const target = isHost ? session.guest : session.host;
            if (target && target.readyState === 1 /* OPEN */) {
              target.send(JSON.stringify({ type: 'SIGNAL', payload: data.payload }));
            }
          }
          break;
      }
    } catch (e) {
      console.error('Failed to parse message', e);
    }
  });

  ws.on('close', () => {
    if (myCode && sessions.has(myCode)) {
      const session = sessions.get(myCode);
      const target = isHost ? session.guest : session.host;
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({ type: 'PEER_DISCONNECTED' }));
      }
      sessions.delete(myCode);
    }
  });
});

console.log(`Signaling server running on port ${process.env.PORT || 8080}`);
