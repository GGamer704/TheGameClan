const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Store active sockets per room: { roomId -> Set of ws }
const rooms = new Map();

wss.on('connection', (ws) => {
  let roomId = null;
  let nickname = null;

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.type === 'join') {
      const nextRoomId = String(data.room || '').trim().toLowerCase().slice(0, 24);
      const nextNickname = String(data.nickname || '').trim().slice(0, 24);

      if (!nextRoomId || !nextNickname) {
        return;
      }

      leaveCurrentRoom(ws, roomId, nickname);

      roomId = nextRoomId;
      nickname = nextNickname;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      rooms.get(roomId).add(ws);
      send(ws, { type: 'system', text: `You joined #${roomId}`, ts: Date.now() });
      broadcast(roomId, { type: 'system', text: `${nickname} joined`, ts: Date.now() }, ws);
      broadcastOnlineCount(roomId);
      return;
    }

    if (data.type === 'message' && roomId && nickname) {
      const text = String(data.text || '').trim().slice(0, 400);
      if (!text) {
        return;
      }

      broadcast(roomId, {
        type: 'message',
        user: nickname,
        text,
        ts: Date.now()
      });
    }
  });

  ws.on('close', () => {
    leaveCurrentRoom(ws, roomId, nickname);
  });
});

function leaveCurrentRoom(ws, roomId, nickname) {
  if (!roomId || !rooms.has(roomId)) {
    return;
  }

  const room = rooms.get(roomId);
  room.delete(ws);

  if (room.size === 0) {
    rooms.delete(roomId);
    return;
  }

  if (nickname) {
    broadcast(roomId, { type: 'system', text: `${nickname} left`, ts: Date.now() });
  }

  broadcastOnlineCount(roomId);
}

function send(ws, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(roomId, data, exclude = null) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const message = JSON.stringify(data);
  for (const client of room) {
    if (client !== exclude && client.readyState === 1) {
      client.send(message);
    }
  }
}

function broadcastOnlineCount(roomId) {
  const count = rooms.get(roomId)?.size ?? 0;
  broadcast(roomId, { type: 'online', count });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Clan Chat running at http://localhost:${PORT}`);
});
