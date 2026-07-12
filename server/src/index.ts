import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface Participant {
  id: string;
  name: string;
}

interface PlaybackState {
  url: string | null;
  type?: 'youtube' | 'spotify' | null;
  metadata?: {
    title: string;
    artist: string;
    thumbnail: string;
  } | null;
  isPlaying: boolean;
  played: number; // progress 0 to 1
  timestamp: number; // when this state was last updated
}

interface Room {
  id: string;
  host: string; // socket.id of the host
  participants: Participant[];
  playback: PlaybackState;
  queue: {
    url: string | null;
    type?: 'youtube' | 'spotify' | null;
    metadata?: {
      title: string;
      artist: string;
      thumbnail: string;
    } | null;
  }[];
}

// In-memory room state
const rooms = new Map<string, Room>();
// Map socket ID to room ID
const socketRoomMap = new Map<string, string>();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (data: { roomId: string; name: string }, callback) => {
    const { roomId, name } = data;
    let room = rooms.get(roomId);

    if (room && room.participants.length >= 3) {
      if (callback) callback({ error: 'Room is full (max 3 participants)' });
      return;
    }

    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);

    if (!room) {
      // Create new room
      room = {
        id: roomId,
        host: socket.id,
        participants: [{ id: socket.id, name }],
        playback: { url: null, type: null, metadata: null, isPlaying: false, played: 0, timestamp: Date.now() },
        queue: []
      };
      rooms.set(roomId, room);
    } else {
      room.participants.push({ id: socket.id, name });
    }

    console.log(`Socket ${socket.id} (${name}) joined room ${roomId}`);
    
    // Broadcast updated room state to everyone in the room
    io.to(roomId).emit('room-state', room);
    
    if (callback) callback({ success: true, room });
  });

  socket.on('playback-sync', (state: Partial<PlaybackState>) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Only host can control playback
    if (room.host !== socket.id) return;

    room.playback = { ...room.playback, ...state, timestamp: Date.now() };
    
    // Broadcast to everyone in the room, including the host so their UI updates!
    io.to(roomId).emit('playback-update', room.playback);
  });

  socket.on('add-song', (data: { url: string; type?: 'youtube' | 'spotify'; metadata?: any } | string) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    let newUrl = '';
    let newType = null;
    let newMetadata = null;

    if (typeof data === 'string') {
        newUrl = data;
    } else {
        newUrl = data.url;
        newType = data.type || null;
        newMetadata = data.metadata || null;
    }

    const newSong = {
        url: newUrl, 
        type: newType,
        metadata: newMetadata
    };

    if (!room.playback.url) {
        room.playback = { 
            url: newSong.url,
            type: newSong.type ?? null,
            metadata: newSong.metadata ?? null,
            isPlaying: true, 
            played: 0, 
            timestamp: Date.now() 
        };
    } else {
        room.queue.push(newSong);
    }
    
    // Broadcast full room state so clients get the updated queue or playback
    io.to(roomId).emit('room-state', room);
  });

  socket.on('play-next', () => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;

    if (room.queue.length > 0) {
        const nextSong = room.queue.shift();
        if (nextSong) {
            room.playback = {
                url: nextSong.url,
                type: nextSong.type ?? null,
                metadata: nextSong.metadata ?? null,
                isPlaying: true,
                played: 0,
                timestamp: Date.now()
            };
        }
    } else {
        room.playback = { url: null, type: null, metadata: null, isPlaying: false, played: 0, timestamp: Date.now() };
    }

    io.to(roomId).emit('room-state', room);
  });

  socket.on('play-queued-song', (index: number) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) return;

    if (index >= 0 && index < room.queue.length) {
        const song = room.queue[index];
        if (song) {
            room.queue.splice(index, 1);
            room.playback = {
                url: song.url,
                type: song.type ?? null,
                metadata: song.metadata ?? null,
                isPlaying: true,
                played: 0,
                timestamp: Date.now()
            };
            io.to(roomId).emit('room-state', room);
        }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socketRoomMap.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        // Remove participant
        room.participants = room.participants.filter(p => p.id !== socket.id);
        
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        } else {
          // If host left, assign new host
          if (room.host === socket.id) {
            room.host = room.participants[0]?.id || '';
          }
          io.to(roomId).emit('room-state', room);
        }
      }
      socketRoomMap.delete(socket.id);
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
