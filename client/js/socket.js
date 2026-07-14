/* ==========================================================================
   HANGOUT - SOCKET.IO EVENTS & PRESENCE HANDLER
   ========================================================================== */

let socket;

function initSocketConnection() {
    socket = io({
        autoConnect: true
    });

    socket.on('connect', () => {
        console.log('Connected to server with socket ID:', socket.id);
        const myId = state.user.id || state.user._id;
        socket.emit('user_online', myId);
    });

    // ==========================================
    //           PRESENCE & SOCIAL SYNC
    // ==========================================
    socket.on('friend_status_update', ({ userId, status }) => {
        updateFriendStatus(userId, status);
    });

    socket.on('new_friend_request', ({ from }) => {
        showToast('New Friend Request', `${from.name} sent you a friend request.`, 'info');
        loadUserData();
    });

    socket.on('friend_request_was_accepted', ({ by }) => {
        showToast('Request Accepted', `${by.name} accepted your friend request!`, 'success');
        loadUserData();
    });

    // ==========================================
    //            DIRECT MESSAGING
    // ==========================================
    socket.on('dm_message', (msg) => {
        const myId = state.user.id || state.user._id;
        // Check if DM chat wrapper is open with this sender
        const isMsgFromActiveFriend = state.activeChatFriend && (msg.from === state.activeChatFriend._id || msg.senderId === state.activeChatFriend._id);
        
        if (isMsgFromActiveFriend) {
            appendDirectMessage(msg);
        } else if (msg.from !== myId) {
            // Find friend details
            const friend = state.friends.find(f => f._id === msg.from);
            const senderName = friend ? friend.name : 'Someone';
            showToast('New Message', `${senderName}: "${msg.text}"`, 'info');
        }
    });

    // ==========================================
    //            WEBRTC CALLS SIGNALLING
    // ==========================================
    socket.on('call_incoming', ({ from, fromSocketId, offer, callType }) => {
        handleIncomingCall(from, fromSocketId, offer, callType);
    });

    socket.on('call_answered', ({ answer }) => {
        handleCallAnswered(answer);
    });

    socket.on('call_ice_candidate', ({ candidate }) => {
        handleNewIceCandidate(candidate);
    });

    socket.on('call_rejected', () => {
        handleCallRejected();
    });

    socket.on('call_ended', () => {
        handleCallEndedByPeer();
    });

    // ==========================================
    //         WATCH ROOM SYNCHRONIZATION
    // ==========================================
    socket.on('watch_room_state', (roomState) => {
        console.log('Room state loaded:', roomState);
        
        // Render room members
        drawRoomMembers(roomState.members);
        
        // Render playlist
        drawPlaylist(roomState.playlist, roomState.currentIndex);
        
        // Sync player
        if (roomState.currentUrl) {
            syncPlayerToVideo(roomState.currentUrl, roomState.playing, roomState.currentTime);
        }

        // Sync TTT game if active
        if (roomState.tttBoard) {
            ensureRoomGameTabAndWorkspace('ttt');
            updateTTTBoard(roomState.tttBoard, roomState.tttTurn);
        }

        // Sync Sudoku board
        if (roomState.sudokuBoard) {
            ensureRoomGameTabAndWorkspace('sudoku');
            loadSudokuBoard(roomState.sudokuBoard);
        }
    });

    socket.on('watch_member_joined', ({ id, name }) => {
        addRoomChatMessage({ type: 'system', text: `${name} joined the room` });
        // Request updated members list
        socket.emit('watch_room_refresh');
    });

    socket.on('watch_member_left', ({ id }) => {
        addRoomChatMessage({ type: 'system', text: `A member left the room` });
    });

    socket.on('watch_chat_receive', (msg) => {
        addRoomChatMessage(msg);
    });

    socket.on('watch_playlist_updated', ({ playlist }) => {
        drawPlaylist(playlist);
    });

    socket.on('watch_video_changed', ({ videoId, index }) => {
        console.log('Watch video changed to:', videoId, index);
        syncPlayerToVideo(videoId, true, 0);
    });

    // ==========================================
    //            MULTIPLAYER GAMES SYNC
    // ==========================================
    socket.on('ttt_update', ({ board, turn }) => {
        ensureRoomGameTabAndWorkspace('ttt');
        updateTTTBoard(board, turn);
    });

    socket.on('sudoku_cell_updated', ({ row, col, value, notes }) => {
        updateSudokuCell(row, col, value, notes);
    });

    socket.on('sudoku_board_init', ({ board }) => {
        ensureRoomGameTabAndWorkspace('sudoku');
        loadSudokuBoard(board);
    });

    // ==========================================
    //          ROOM WEBRTC CALL SYNC
    // ==========================================
    socket.on('watch_webrtc_offer', ({ offer, fromSocketId }) => {
        handleRoomWebRTCOffer(offer, fromSocketId);
    });

    socket.on('watch_webrtc_answer', ({ answer, fromSocketId }) => {
        handleRoomWebRTCAnswer(answer, fromSocketId);
    });

    socket.on('watch_webrtc_ice', ({ candidate, fromSocketId }) => {
        handleRoomWebRTCIce(candidate, fromSocketId);
    });

    socket.on('watch_peer_media_toggle', ({ socketId, type, enabled }) => {
        updateRoomPeerMedia(socketId, type, enabled);
    });
}

// ==========================================
//          ROOM SYSTEM CHAT LOGIC
// ==========================================
function initRoomChatDOM() {
    const form = document.getElementById('room-chat-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('room-chat-input');
        const text = input.value.trim();
        if (!text || !state.activeRoomId) return;

        // In a real app we'd emit a room chat event. Since we are showing simulated client interactions 
        // or sync, let's make the server emit room chat to all connections or we can sync it through sockets.
        // Let's implement socket room chat in server.js or directly broadcast.
        // Wait, does server.js have watch room chat? 
        // Let's look at server.js: it does not have room chat event listeners.
        // Let's add room chat events to server.js! That is important! We will update server.js.
        socket.emit('watch_chat_send', { roomId: state.activeRoomId, text: text, sender: state.user.name });
        input.value = '';
    });
}

// Ensure server.js handles watch_chat_send
// Let's implement socket.on('watch_chat_send') in socket connection logic. We'll add this soon.

function addRoomChatMessage(msg) {
    const container = document.getElementById('room-chat-messages');
    const msgEl = document.createElement('div');
    
    if (msg.type === 'system') {
        msgEl.className = 'room-msg room-msg-system';
        msgEl.innerText = msg.text;
    } else {
        msgEl.className = 'room-msg';
        msgEl.innerHTML = `<span class="room-msg-sender">${msg.sender}:</span> ${msg.text}`;
    }

    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;
}

// Update Room Members list
function drawRoomMembers(members) {
    const container = document.getElementById('room-members-list');
    container.innerHTML = '';

    const bar = document.getElementById('room-participants-bar');
    if (bar) bar.innerHTML = '';

    members.forEach(member => {
        // 1. Sidebar List
        const item = document.createElement('div');
        item.className = 'room-member-item';
        const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.name}`;
        
        item.innerHTML = `
            <div class="room-member-info">
                <img src="${avatar}" alt="Avatar">
                <span class="room-member-name">${member.name}</span>
            </div>
            <div class="room-member-role ${member.isHost ? 'role-host' : ''}">
                ${member.isHost ? '<i class="fa-solid fa-crown" title="Host"></i> Host' : 'Guest'}
            </div>
        `;
        container.appendChild(item);

        // 2. Top Bar Avatars
        if (bar) {
            const wrapper = document.createElement('div');
            wrapper.className = 'participant-avatar-wrapper';
            wrapper.title = `${member.name} (${member.isHost ? 'Host' : 'Guest'})`;
            wrapper.innerHTML = `
                <img src="${avatar}" alt="Avatar">
                ${member.isHost ? '<i class="fa-solid fa-crown participant-crown"></i>' : ''}
            `;
            bar.appendChild(wrapper);
        }
    });
}

// Add watch_chat_send socket receiver
document.addEventListener('DOMContentLoaded', () => {
    initRoomChatDOM();
});

function ensureRoomGameTabAndWorkspace(type) {
    const roomTabGames = document.getElementById('room-tab-games');
    const panelRoomGames = document.getElementById('room-games-panel');
    if (roomTabGames && panelRoomGames && !panelRoomGames.classList.contains('active')) {
        const roomTabChat = document.getElementById('room-tab-chat');
        const roomTabMembers = document.getElementById('room-tab-members');
        const panelRoomChat = document.getElementById('room-chat-panel');
        const panelRoomMembers = document.getElementById('room-members-panel');
        
        [roomTabChat, roomTabMembers, roomTabGames].forEach(t => t && t.classList.remove('active'));
        [panelRoomChat, panelRoomMembers, panelRoomGames].forEach(p => p && p.classList.remove('active'));
        
        roomTabGames.classList.add('active');
        panelRoomGames.classList.add('active');
    }

    const workspace = document.getElementById('room-game-workspace');
    if (workspace && (workspace.classList.contains('hidden') || currentGameType !== type)) {
        currentGameType = type;
        gameMode = 'room';
        
        const title = document.getElementById('room-game-name');
        const body = document.getElementById('room-game-body');
        
        body.innerHTML = '';
        workspace.classList.remove('hidden');
        if (type === 'ttt') {
            title.innerText = 'Tic-Tac-Toe (Synced)';
            initRoomTTT(body);
        } else if (type === 'sudoku') {
            title.innerText = 'Sudoku Co-op';
            initRoomSudoku(body);
        }
    }
}
