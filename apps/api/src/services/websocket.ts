import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');
    ws.send(JSON.stringify({ type: 'welcome', data: 'Connected to Veritas Arena WS' }));

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Socket error:', err);
    });
  });

  console.log('🔌 WebSocket Server initialized on path /ws');
}

export function broadcast(type: string, data: any) {
  if (!wss) {
    return;
  }

  const payload = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
