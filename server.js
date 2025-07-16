import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// In-memory storage for initial game states
const initialStates = new Map();

// Room management (extend existing room structure)
const rooms = new Map();

// POST initial game state (host only)
app.post('/api/rooms/:roomId/initial-state', (req, res) => {
  const { roomId } = req.params;
  const { playerId, gameState } = req.body;
  
  console.log(`POST /api/rooms/${roomId}/initial-state`);
  console.log('Request playerId:', playerId);
  
  if (!rooms.has(roomId)) {
    console.log('Room not found:', roomId);
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const room = rooms.get(roomId);
  console.log('Room host:', room.host);
  console.log('Room guest:', room.guest);
  
  if (room.host?.id !== playerId) {
    console.log(`Authorization failed: host.id='${room.host?.id}' vs playerId='${playerId}'`);
    return res.status(403).json({ error: 'Only host can set initial state' });
  }
  
  console.log('Received gameState.players:', JSON.stringify(gameState.players.map(p => ({ name: p.name, id: p.id })), null, 2));
  initialStates.set(roomId, gameState);
  console.log(`Initial state set for room ${roomId}`);
  res.json({ success: true });
});

// GET initial game state
app.get('/api/rooms/:roomId/initial-state', (req, res) => {
  const { roomId } = req.params;
  
  if (!initialStates.has(roomId)) {
    return res.status(404).json({ error: 'Initial state not set' });
  }
  
  const gameState = initialStates.get(roomId);
  console.log('Sending gameState.players:', JSON.stringify(gameState.players.map(p => ({ name: p.name, id: p.id })), null, 2));
  res.json({ gameState });
});

// Existing room endpoints
app.post('/api/rooms', (req, res) => {
  const roomId = 'b' + Math.random().toString(36).substr(2, 6);
  rooms.set(roomId, {
    id: roomId,
    host: null,
    guest: null,
    gameState: null
  });
  res.json({ roomId, joinUrl: `http://localhost:5175/planet/${roomId}` });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { playerId, playerName } = req.body;
  
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const room = rooms.get(roomId);
  
  if (!room.host) {
    room.host = { id: playerId, name: playerName };
    res.json({ role: 'host', room });
  } else if (!room.guest) {
    room.guest = { id: playerId, name: playerName };
    res.json({ role: 'guest', room });
  } else {
    res.status(400).json({ error: 'Room is full' });
  }
});

app.get('/api/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    host: room.host,
    guest: room.guest,
    gameState: room.gameState
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(), 
    rooms: rooms.size,
    uptime: process.uptime()
  });
});

// Root health page
app.get('/', (req, res) => {
  res.json({ 
    message: '🌍 Planet B Server Running',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      'create-room': 'POST /api/rooms',
      'join-room': 'POST /api/rooms/:roomId/join',
      'initial-state': 'POST/GET /api/rooms/:roomId/initial-state'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🌍 Planet B Server running on http://localhost:${PORT}`);
});