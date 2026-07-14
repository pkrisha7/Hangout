/* ==========================================================================
   HANGOUT - WEBRTC VOICE & VIDEO CALL CONTROLLER (P2P & GROUP MESH)
   ========================================================================== */

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ── 1-to-1 CALL STATE ───────────────────────────────────────────────────────
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let activeCallPartnerSocketId = null;
let activeCallType = null; // 'audio' | 'video'
let callTimerInterval = null;
let callStartTime = null;

// ── ROOM MESH CALL STATE ────────────────────────────────────────────────────
let roomLocalStream = null;
const roomPeerConnections = {}; // socketId -> RTCPeerConnection
const roomPeerStreams = {};     // socketId -> MediaStream

// ==========================================
//          1-to-1 CALL INITIATION
// ==========================================
async function startCall(friendId, callType) {
    if (localStream || peerConnection) {
        return showToast('Call Error', 'You are already in an active call.', 'error');
    }

    activeCallType = callType;
    showToast('Calling...', 'Setting up media devices...', 'info');

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: callType === 'video',
            audio: true
        });

        // Set local video in UI
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;
        
        // Setup toggle indicators
        document.getElementById('local-mic-off').classList.add('hidden');
        document.getElementById('local-cam-off').classList.toggle('hidden', callType === 'video');

        // Create Peer Connection
        peerConnection = new RTCPeerConnection(iceServers);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Track events
        peerConnection.ontrack = (event) => {
            console.log('Received remote track');
            remoteStream = event.streams[0];
            document.getElementById('remote-video').srcObject = remoteStream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && activeCallPartnerSocketId) {
                socket.emit('call_ice_candidate', {
                    toSocketId: activeCallPartnerSocketId,
                    candidate: event.candidate
                });
            }
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Find friend's socket ID (server online users map)
        // We emit offer to server, server routes it to friend
        socket.emit('call_offer', {
            toUserId: friendId,
            offer: offer,
            fromUser: state.user,
            callType: callType
        });

        // Show Outgoing Call State in UI (We use incoming call container to show state)
        showCallOverlayOutgoing(friendId, callType);

    } catch (e) {
        console.error('Failed to get media devices:', e.message);
        showToast('Call Error', 'Could not access camera or microphone.', 'error');
        cleanup1to1Call();
    }
}

// ==========================================
//          1-to-1 CALL SIGNALLING
// ==========================================
function handleIncomingCall(fromUser, fromSocketId, offer, callType) {
    activeCallPartnerSocketId = fromSocketId;
    activeCallType = callType;

    // Show Ringing UI & Play Ringtone
    const ringtone = document.getElementById('ringtone-player');
    if (ringtone) ringtone.play().catch(e => console.log('Ringtone auto-play blocked:', e.message));

    const overlay = document.getElementById('incoming-call-overlay');
    document.getElementById('incoming-caller-avatar').src = fromUser.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fromUser.username}`;
    document.getElementById('incoming-caller-name').innerText = fromUser.name;
    document.getElementById('incoming-call-type').innerHTML = `<i class="fa-solid fa-${callType === 'video' ? 'video' : 'phone'} text-glow"></i> Incoming ${callType} Call...`;
    
    overlay.classList.remove('hidden');

    // Button event listeners
    const acceptBtn = document.getElementById('accept-call-btn');
    const declineBtn = document.getElementById('decline-call-btn');

    // Remove old listeners
    const newAcceptBtn = acceptBtn.cloneNode(true);
    const newDeclineBtn = declineBtn.cloneNode(true);
    acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
    declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);

    newAcceptBtn.addEventListener('click', () => acceptCall(offer));
    newDeclineBtn.addEventListener('click', () => rejectCall());
}

async function acceptCall(offer) {
    stopRingtone();
    document.getElementById('incoming-call-overlay').classList.add('hidden');

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: activeCallType === 'video',
            audio: true
        });

        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = localStream;

        document.getElementById('local-mic-off').classList.add('hidden');
        document.getElementById('local-cam-off').classList.toggle('hidden', activeCallType === 'video');

        peerConnection = new RTCPeerConnection(iceServers);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            console.log('Received remote track');
            remoteStream = event.streams[0];
            document.getElementById('remote-video').srcObject = remoteStream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && activeCallPartnerSocketId) {
                socket.emit('call_ice_candidate', {
                    toSocketId: activeCallPartnerSocketId,
                    candidate: event.candidate
                });
            }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('call_answer', {
            toSocketId: activeCallPartnerSocketId,
            answer: answer
        });

        // Show Active Call grid
        showActiveCallUI();

    } catch (e) {
        console.error('Call accept failed:', e.message);
        showToast('Call Error', 'Could not connect call.', 'error');
        rejectCall();
    }
}

function rejectCall() {
    stopRingtone();
    document.getElementById('incoming-call-overlay').classList.add('hidden');
    if (activeCallPartnerSocketId) {
        socket.emit('call_reject', { toSocketId: activeCallPartnerSocketId });
    }
    cleanup1to1Call();
}

function handleCallAnswered(answer) {
    // When outgoing call is accepted
    document.getElementById('incoming-call-overlay').classList.add('hidden'); // Hide outgoing ringing
    stopRingtone();
    
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
                showActiveCallUI();
            })
            .catch(e => console.error('Set remote description error:', e.message));
    }
}

function handleNewIceCandidate(candidate) {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error('Add Ice Candidate error:', e.message));
    }
}

function handleCallRejected() {
    showToast('Call Rejected', 'The user declined your call.', 'info');
    cleanup1to1Call();
}

function handleCallEndedByPeer() {
    showToast('Call Ended', 'The call was terminated.', 'info');
    cleanup1to1Call();
}

// ==========================================
//          1-to-1 CALL HELPERS/UI
// ==========================================
function showCallOverlayOutgoing(friendId, callType) {
    const friend = state.friends.find(f => f._id === friendId);
    const friendName = friend ? friend.name : 'User';
    const friendAvatar = friend ? friend.avatar : '';

    const overlay = document.getElementById('incoming-call-overlay');
    document.getElementById('incoming-caller-avatar').src = friendAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friendId}`;
    document.getElementById('incoming-caller-name').innerText = friendName;
    document.getElementById('incoming-call-type').innerHTML = `<i class="fa-solid fa-spinner fa-spin text-glow"></i> Calling via ${callType}...`;
    
    // Accept btn hidden, Decline btn works as Cancel
    const acceptBtn = document.getElementById('accept-call-btn');
    const declineBtn = document.getElementById('decline-call-btn');
    acceptBtn.classList.add('hidden');
    declineBtn.innerHTML = '<i class="fa-solid fa-phone-slash"></i> Cancel';

    const newDeclineBtn = declineBtn.cloneNode(true);
    declineBtn.parentNode.replaceChild(newDeclineBtn, declineBtn);
    newDeclineBtn.addEventListener('click', () => {
        socket.emit('call_end', { toSocketId: activeCallPartnerSocketId });
        cleanup1to1Call();
    });

    overlay.classList.remove('hidden');
    
    // Play ringtone outgoing
    const ringtone = document.getElementById('ringtone-player');
    if (ringtone) ringtone.play().catch(e => console.log(e.message));
}

function showActiveCallUI() {
    document.getElementById('incoming-call-overlay').classList.add('hidden');
    const grid = document.getElementById('active-call-grid');
    grid.classList.remove('hidden');

    // Start Call Timer
    callStartTime = Date.now();
    const timerText = document.getElementById('call-timer');
    callTimerInterval = setInterval(() => {
        const diff = Date.now() - callStartTime;
        const mins = Math.floor(diff / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        timerText.innerText = `${mins}:${secs}`;
    }, 1000);

    // Wire up buttons
    document.getElementById('call-toggle-mic').onclick = toggleMic;
    document.getElementById('call-toggle-cam').onclick = toggleCam;
    document.getElementById('call-hangup').onclick = endCall;

    // Reset icons
    document.getElementById('call-toggle-mic').classList.add('active');
    document.getElementById('call-toggle-cam').classList.toggle('active', activeCallType === 'video');
}

function endCall() {
    if (activeCallPartnerSocketId) {
        socket.emit('call_end', { toSocketId: activeCallPartnerSocketId });
    }
    cleanup1to1Call();
}

function cleanup1to1Call() {
    clearInterval(callTimerInterval);
    document.getElementById('active-call-grid').classList.add('hidden');
    document.getElementById('incoming-call-overlay').classList.add('hidden');
    
    // Reset buttons
    const declineBtn = document.getElementById('decline-call-btn');
    declineBtn.innerHTML = '<i class="fa-solid fa-phone-slash"></i> Decline';
    document.getElementById('accept-call-btn').classList.remove('hidden');

    stopRingtone();

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    remoteStream = null;
    activeCallPartnerSocketId = null;
    activeCallType = null;
}

function stopRingtone() {
    const ringtone = document.getElementById('ringtone-player');
    if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
    }
}

function toggleMic() {
    const btn = document.getElementById('call-toggle-mic');
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        btn.classList.toggle('active', audioTrack.enabled);
        document.getElementById('local-mic-off').classList.toggle('hidden', audioTrack.enabled);
    }
}

function toggleCam() {
    const btn = document.getElementById('call-toggle-cam');
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        btn.classList.toggle('active', videoTrack.enabled);
        document.getElementById('local-cam-off').classList.toggle('hidden', videoTrack.enabled);
    }
}


// ==========================================
//        ROOM GROUP MESH WEBRTC CALLS
// ==========================================

async function joinRoomCall(withVideo) {
    if (roomLocalStream) return showToast('Info', 'You are already in the room call', 'info');
    
    showToast('Joining call...', 'Requesting media devices...', 'info');

    try {
        roomLocalStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: withVideo
        });

        const container = document.getElementById('room-webrtc-container');
        container.classList.remove('hidden');

        // Draw local stream in room call list
        drawRoomPeerStream('local', roomLocalStream, 'You (Local)');

        // Bind control buttons
        document.getElementById('room-call-toggle-mic').onclick = toggleRoomMic;
        document.getElementById('room-call-toggle-cam').onclick = toggleRoomCam;
        document.getElementById('room-leave-call').onclick = disconnectRoomCall;

        document.getElementById('room-call-toggle-mic').className = 'btn room-control-btn active';
        document.getElementById('room-call-toggle-cam').className = `btn room-control-btn ${withVideo ? 'active' : ''}`;

        // Broadcast offer to room
        // Server handles watch_webrtc_offer to tell all room peers we want to connect
        socket.emit('watch_webrtc_offer', {
            roomId: state.activeRoomId,
            offer: { type: 'join', withVideo }
        });

    } catch (err) {
        console.error(err);
        showToast('Call Error', 'Could not open media devices for Room Call.', 'error');
    }
}

// Peer sends offer/join
async function handleRoomWebRTCOffer(offer, fromSocketId) {
    if (!roomLocalStream) return; // Ignore if we aren't in call

    if (offer.type === 'join') {
        // Create new RTCPeerConnection for this peer
        const pc = new RTCPeerConnection(iceServers);
        roomPeerConnections[fromSocketId] = pc;

        // Add local tracks
        roomLocalStream.getTracks().forEach(track => pc.addTrack(track, roomLocalStream));

        // ICE candidate handling
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('watch_webrtc_ice', {
                    toSocketId: fromSocketId,
                    candidate: event.candidate
                });
            }
        };

        // Track handling
        pc.ontrack = (event) => {
            roomPeerStreams[fromSocketId] = event.streams[0];
            drawRoomPeerStream(fromSocketId, event.streams[0], `Peer ${fromSocketId.substring(0, 4)}`);
        };

        // Create offer
        const localOffer = await pc.createOffer();
        await pc.setLocalDescription(localOffer);

        socket.emit('watch_webrtc_answer', {
            toSocketId: fromSocketId,
            answer: localOffer
        });
    } else {
        // Handle actual SDP Offer
        const pc = new RTCPeerConnection(iceServers);
        roomPeerConnections[fromSocketId] = pc;

        roomLocalStream.getTracks().forEach(track => pc.addTrack(track, roomLocalStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('watch_webrtc_ice', {
                    toSocketId: fromSocketId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            roomPeerStreams[fromSocketId] = event.streams[0];
            drawRoomPeerStream(fromSocketId, event.streams[0], `Peer ${fromSocketId.substring(0, 4)}`);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('watch_webrtc_answer', {
            toSocketId: fromSocketId,
            answer: answer
        });
    }
}

function handleRoomWebRTCAnswer(answer, fromSocketId) {
    const pc = roomPeerConnections[fromSocketId];
    if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(answer))
            .catch(e => console.error(e));
    }
}

function handleRoomWebRTCIce(candidate, fromSocketId) {
    const pc = roomPeerConnections[fromSocketId];
    if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(e => console.error(e));
    }
}

// Draw peer streams in room
function drawRoomPeerStream(socketId, stream, labelText) {
    const grid = document.getElementById('room-streams-grid');
    
    // Remove if already exists
    let existing = document.getElementById(`room-stream-${socketId}`);
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = `room-stream-${socketId}`;
    container.className = 'room-peer-stream';

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = stream;
    if (socketId === 'local') video.muted = true;

    const label = document.createElement('span');
    label.className = 'video-label';
    label.innerText = labelText;

    container.appendChild(video);
    container.appendChild(label);
    grid.appendChild(container);
}

function toggleRoomMic() {
    const audioTrack = roomLocalStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        document.getElementById('room-call-toggle-mic').classList.toggle('active', audioTrack.enabled);
    }
}

function toggleRoomCam() {
    const videoTrack = roomLocalStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        document.getElementById('room-call-toggle-cam').classList.toggle('active', videoTrack.enabled);
    }
}

function updateRoomPeerMedia(socketId, type, enabled) {
    // We can show visual mic/cam off indicator on peer streams if wanted
}

function disconnectRoomCall() {
    const container = document.getElementById('room-webrtc-container');
    container.classList.add('hidden');

    document.getElementById('room-streams-grid').innerHTML = '';

    if (roomLocalStream) {
        roomLocalStream.getTracks().forEach(track => track.stop());
        roomLocalStream = null;
    }

    // Close all peer connections
    for (const id in roomPeerConnections) {
        roomPeerConnections[id].close();
        delete roomPeerConnections[id];
    }

    for (const id in roomPeerStreams) {
        delete roomPeerStreams[id];
    }
}

// Bind room call buttons
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('room-join-audio-call').addEventListener('click', () => joinRoomCall(false));
    document.getElementById('room-join-video-call').addEventListener('click', () => joinRoomCall(true));
});
