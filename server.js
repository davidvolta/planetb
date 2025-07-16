import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Room storage - in production, use Redis or database
const rooms = new Map();

// Generate 6-character room ID with 'b' prefix
function generateRoomId() {
  return 'b' + randomBytes(3).toString('hex');
}

// Create room
app.post('/api/rooms', (req, res) => {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    host: null,
    guest: null,
    gameState: null,
    lastActivity: Date.now()
  };
  
  rooms.set(roomId, room);
  
  res.json({
    roomId: roomId,
    joinUrl: `/planet/${roomId}`
  });
});

// Join room
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerId, playerName } = req.body;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Assign as host or guest
  if (!room.host) {
    room.host = { id: playerId, name: playerName };
    res.json({ role: 'host', room: room });
  } else if (!room.guest) {
    room.guest = { id: playerId, name: playerName };
    res.json({ role: 'guest', room: room });
  } else {
    res.status(400).json({ error: 'Room is full' });
  }
  
  room.lastActivity = Date.now();
});

// Update game state (host only)
app.post('/api/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  const { playerId, gameState } = req.body;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.host?.id !== playerId) {
    return res.status(403).json({ error: 'Only host can update state' });
  }
  
  room.gameState = gameState;
  room.lastActivity = Date.now();
  
  res.json({ success: true });
});

// Get game state (polling endpoint)
app.get('/api/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  room.lastActivity = Date.now();
  
  res.json({
    gameState: room.gameState,
    host: room.host,
    guest: room.guest
  });
});

// Submit action (guest to host)
app.post('/api/rooms/:roomId/actions', (req, res) => {
  const { roomId } = req.params;
  const { playerId, action } = req.body;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.guest?.id !== playerId) {
    return res.status(403).json({ error: 'Only guest can submit actions' });
  }
  
  // Store pending action for host to process
  if (!room.pendingActions) room.pendingActions = [];
  room.pendingActions.push(action);
  room.lastActivity = Date.now();
  
  res.json({ success: true });
});

// Get pending actions (host polling)
app.get('/api/rooms/:roomId/actions', (req, res) => {
  const { roomId } = req.params;
  const { playerId } = req.query;
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  if (room.host?.id !== playerId) {
    return res.status(403).json({ error: 'Only host can get actions' });
  }
  
  const actions = room.pendingActions || [];
  room.pendingActions = []; // Clear after reading
  room.lastActivity = Date.now();
  
  res.json({ actions });
});

// Clean up inactive rooms (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.lastActivity > TIMEOUT) {
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Planet B multiplayer server running on port ${PORT}`);
});