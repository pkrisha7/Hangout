const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, '../client')));

// SPA Wildcard Route
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const onlineUsers = new Map(); // userId -> socketId
const watchRooms = new Map(); // roomId -> room state
const dmRooms = new Map(); // "uid1_uid2" -> [messages]

app.set('io', io);
app.set('onlineUsers', onlineUsers);

function dmKey(a, b) { return [a, b].sort().join('_'); }

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // ── Presence ──────────────────────────────────────────────────────────
    socket.on('user_online', (userId) => {
        const id = userId ? userId.toString() : null;
        if (!id) return;
        onlineUsers.set(id, socket.id);
        socket.userId = id;
        io.emit('friend_status_update', { userId: id, status: 'online' });
    });

    socket.on('user_offline', (userId) => {
        const id = userId ? userId.toString() : null;
        if (id) onlineUsers.delete(id);
        io.emit('friend_status_update', { userId: id, status: 'offline' });
    });

    // ── Friend Requests ───────────────────────────────────────────────────
    // Notify recipient of new request
    socket.on('friend_request_sent', ({ toUserId, fromUser }) => {
        const toSocketId = onlineUsers.get(toUserId.toString());
        if (toSocketId) io.to(toSocketId).emit('new_friend_request', { from: fromUser });
    });

    // NEW: notify original sender that their request was accepted
    socket.on('friend_request_accepted', ({ toUserId, acceptedBy }) => {
        const toSocketId = onlineUsers.get(toUserId.toString());
        if (toSocketId) io.to(toSocketId).emit('friend_request_was_accepted', { by: acceptedBy });
    });

    // ── Watch Party ───────────────────────────────────────────────────────
    socket.on('watch_join', ({ roomId, userName, isHost }) => {
        socket.join(roomId);

        if (!watchRooms.has(roomId)) {
            watchRooms.set(roomId, {
                hostSocketId: socket.id,
                members: [],
                playlist: [],
                currentIndex: 0,
                currentUrl: '',
                playing: false,
                currentTime: 0,
                tttBoard: Array(9).fill(null),
                tttTurn: 'X',
                tttPlayers: {}, // socketId -> 'X'|'O'
                sudokuBoard: null,
            });
        }

        const room = watchRooms.get(roomId);

        // Assign TTT roles
        const takenRoles = Object.values(room.tttPlayers);
        if (!takenRoles.includes('X')) room.tttPlayers[socket.id] = 'X';
        else if (!takenRoles.includes('O')) room.tttPlayers[socket.id] = 'O';

        room.members = room.members.filter(m => m.id !== socket.id);
        room.members.push({ id: socket.id, name: userName, isHost });

        // Send full state to the new joiner (guest gets current playlist/video)
        socket.emit('watch_room_state', {
            ...room,
            myRole: room.tttPlayers[socket.id] || null,
        });

        socket.to(roomId).emit('watch_member_joined', { id: socket.id, name: userName });
    });

    socket.on('watch_leave', ({ roomId }) => {
        const room = watchRooms.get(roomId);
        if (room) {
            room.members = room.members.filter(m => m.id !== socket.id);
            delete room.tttPlayers[socket.id];
            socket.to(roomId).emit('watch_member_left', { id: socket.id });
            socket.leave(roomId);
            if (room.members.length === 0) watchRooms.delete(roomId);
        }
    });

    socket.on('watch_chat_send', ({ roomId, text, sender }) => {
        io.to(roomId).emit('watch_chat_receive', { text, sender });
    });

    socket.on('watch_room_refresh', () => {
        // Find which room this socket is in
        for (const [roomId, room] of watchRooms.entries()) {
            const member = room.members.find(m => m.id === socket.id);
            if (member) {
                socket.emit('watch_room_state', room);
                break;
            }
        }
    });

    // Host pushes playlist to all guests
    socket.on('watch_playlist_update', ({ roomId, playlist }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        room.playlist = playlist;
        socket.to(roomId).emit('watch_playlist_updated', { playlist });
    });

    // Host changes active video
    socket.on('watch_video_change', ({ roomId, videoId, index }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        room.currentUrl = videoId;
        room.currentIndex = index !== undefined && index !== null ? index : 0;
        room.playing = true;
        room.currentTime = 0;
        socket.to(roomId).emit('watch_video_changed', { videoId, index: room.currentIndex });
    });

    // Host signals video ended → auto-advance playlist
    socket.on('watch_video_ended', ({ roomId }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        const nextIndex = (room.currentIndex !== undefined && room.currentIndex !== null ? room.currentIndex : 0) + 1;
        if (nextIndex < room.playlist.length) {
            room.currentIndex = nextIndex;
            const next = room.playlist[nextIndex];
            room.currentUrl = next.id;
            room.playing = true;
            // Tell ALL members (including host) to switch
            io.to(roomId).emit('watch_video_changed', { videoId: next.id, index: nextIndex });
        }
    });

    // ── TicTacToe multiplayer ─────────────────────────────────────────────
    socket.on('ttt_move', ({ roomId, index }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        const myRole = room.tttPlayers[socket.id];
        if (!myRole || myRole !== room.tttTurn) return;
        if (room.tttBoard[index]) return;

        room.tttBoard[index] = myRole;
        room.tttTurn = myRole === 'X' ? 'O' : 'X';
        io.to(roomId).emit('ttt_update', { board: room.tttBoard, turn: room.tttTurn });
    });

    socket.on('ttt_reset', ({ roomId }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        room.tttBoard = Array(9).fill(null);
        room.tttTurn = 'X';
        io.to(roomId).emit('ttt_update', { board: room.tttBoard, turn: room.tttTurn });
    });

    // ── Sudoku multiplayer ────────────────────────────────────────────────
    socket.on('sudoku_cell_change', ({ roomId, row, col, value, notes }) => {
        const room = watchRooms.get(roomId);
        if (!room || !room.sudokuBoard) return;
        
        if (room.sudokuBoard.current) {
            room.sudokuBoard.current[row][col] = value;
        }
        
        if (!room.sudokuBoard.notes) {
            room.sudokuBoard.notes = Array(6).fill(null).map(() => Array(6).fill(null).map(() => []));
        }
        room.sudokuBoard.notes[row][col] = notes || [];

        socket.to(roomId).emit('sudoku_cell_updated', { row, col, value, notes });
    });

    socket.on('sudoku_init', ({ roomId, board }) => {
        const room = watchRooms.get(roomId);
        if (!room) return;
        room.sudokuBoard = board;
        socket.to(roomId).emit('sudoku_board_init', { board });
    });

    // ── Direct Messages (in-memory) ───────────────────────────────────────
    socket.on('dm_join', ({ myId, friendId }) => {
        const key = dmKey(myId, friendId);
        socket.join(`dm_${key}`);
        const history = dmRooms.get(key) || [];
        socket.emit('dm_history', { messages: history });
    });

    socket.on('dm_send', ({ myId, friendId, text }) => {
        const key = dmKey(myId, friendId);
        const msg = { from: myId, text, ts: Date.now() };
        if (!dmRooms.has(key)) dmRooms.set(key, []);
        const msgs = dmRooms.get(key);
        msgs.push(msg);
        if (msgs.length > 200) msgs.shift();
        io.to(`dm_${key}`).emit('dm_message', msg);
    });

    socket.on('dm_leave', ({ myId, friendId }) => {
        socket.leave(`dm_${dmKey(myId, friendId)}`);
    });

    // ── WebRTC Signaling (Voice/Video Call between friends) ───────────────
    socket.on('call_offer', ({ toUserId, offer, fromUser, callType }) => {
        const toSocketId = onlineUsers.get(toUserId.toString());
        if (toSocketId) {
            io.to(toSocketId).emit('call_incoming', {
                from: fromUser,
                fromSocketId: socket.id,
                offer,
                callType, // 'audio' | 'video'
            });
        }
    });

    socket.on('call_answer', ({ toSocketId, answer }) => {
        io.to(toSocketId).emit('call_answered', { answer });
    });

    socket.on('call_ice_candidate', ({ toSocketId, candidate }) => {
        io.to(toSocketId).emit('call_ice_candidate', { candidate });
    });

    socket.on('call_reject', ({ toSocketId }) => {
        io.to(toSocketId).emit('call_rejected');
    });

    socket.on('call_end', ({ toSocketId }) => {
        io.to(toSocketId).emit('call_ended');
    });

    // ── Watch Party WebRTC (mic/cam during party) ─────────────────────────
    socket.on('watch_webrtc_offer', ({ roomId, offer }) => {
        socket.to(roomId).emit('watch_webrtc_offer', { offer, fromSocketId: socket.id });
    });

    socket.on('watch_webrtc_answer', ({ toSocketId, answer }) => {
        io.to(toSocketId).emit('watch_webrtc_answer', { answer, fromSocketId: socket.id });
    });

    socket.on('watch_webrtc_ice', ({ toSocketId, candidate }) => {
        io.to(toSocketId).emit('watch_webrtc_ice', { candidate, fromSocketId: socket.id });
    });

    socket.on('watch_media_toggle', ({ roomId, type, enabled }) => {
        socket.to(roomId).emit('watch_peer_media_toggle', { socketId: socket.id, type, enabled });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('friend_status_update', { userId: socket.userId, status: 'offline' });
        }
        console.log('Client disconnected:', socket.id);
    });
});

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => console.log('DB error:', err));

module.exports = { io };