import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import socket from '../socket';

const statusColors = { online: '#22c55e', offline: '#64748b', busy: '#f59e0b' };
const statusLabels = { online: 'Online', offline: 'Offline', busy: 'Busy' };

const Avatar = ({ name, size, fontSize }) => {
    const s = size || 48,
        fs = fontSize || 18;
    return ( <
        div style = {
            { width: s, height: s, borderRadius: '50%', backgroundColor: '#6C63FF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs, fontWeight: '700', flexShrink: 0 } } > { name && name[0] ? name[0].toUpperCase() : '?' } <
        /div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
//  DM CHAT MODAL
// ════════════════════════════════════════════════════════════════════════════
function DMModal({ friend, myId, onClose }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const bottomRef = useRef(null);

    useEffect(() => {
        socket.emit('dm_join', { myId, friendId: friend._id });

        socket.on('dm_history', ({ messages }) => setMessages(messages));
        socket.on('dm_message', (msg) => setMessages(prev => [...prev, msg]));

        return () => {
            socket.emit('dm_leave', { myId, friendId: friend._id });
            socket.off('dm_history');
            socket.off('dm_message');
        };
    }, [friend._id, myId]);

    useEffect(() => {
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = () => {
        const t = text.trim();
        if (!t) return;
        socket.emit('dm_send', { myId, friendId: friend._id, text: t });
        setText('');
    };

    return ( <
        div style = {
            { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 } } >
        <
        div style = {
            { background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 20, width: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } } > { /* Header */ } <
        div style = {
            { padding: '16px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: 12 } } >
        <
        Avatar name = { friend.name }
        size = { 36 }
        fontSize = { 14 }
        /> <
        div style = {
            { flex: 1 } } >
        <
        div style = {
            { color: '#fff', fontWeight: 700, fontSize: 15 } } > { friend.name } < /div> <
        div style = {
            { color: statusColors[friend.status] || '#555', fontSize: 12 } } > { statusLabels[friend.status] || 'Offline' } < /div> <
        /div> <
        button onClick = { onClose }
        style = {
            { background: 'transparent', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' } } > ✕ < /button> <
        /div>

        { /* Messages */ } <
        div style = {
            { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 } } > {
            messages.length === 0 && ( <
                p style = {
                    { color: '#444', textAlign: 'center', marginTop: 40, fontSize: 13 } } > No messages yet.Say hi!👋 < /p>
            )
        } {
            messages.map((msg, i) => {
                const isMe = msg.from === myId || (msg.from && msg.from.toString()) === (myId && myId.toString());
                return ( <
                    div key = { i }
                    style = {
                        { display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' } } >
                    <
                    div style = {
                        {
                            maxWidth: '72%',
                            padding: '9px 14px',
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isMe ? '#6C63FF' : '#1a1a26',
                            color: '#fff',
                            fontSize: 14,
                            lineHeight: 1.4,
                        }
                    } > { msg.text } <
                    div style = {
                        { fontSize: 10, color: isMe ? 'rgba(255,255,255,0.5)' : '#555', marginTop: 3, textAlign: 'right' } } > { new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } <
                    /div> <
                    /div> <
                    /div>
                );
            })
        } <
        div ref = { bottomRef }
        /> <
        /div>

        { /* Input */ } <
        div style = {
            { padding: '12px 14px', borderTop: '1px solid #1e1e2e', display: 'flex', gap: 10 } } >
        <
        input value = { text }
        onChange = { e => setText(e.target.value) }
        onKeyDown = { e => e.key === 'Enter' && send() }
        placeholder = "Type a message..."
        style = {
            { flex: 1, padding: '10px 14px', background: '#1a1a26', border: '1px solid #333', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' } }
        /> <
        button onClick = { send }
        style = {
            { padding: '10px 18px', background: '#6C63FF', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' } } > Send < /button> <
        /div> <
        /div> <
        /div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  INCOMING CALL MODAL
// ════════════════════════════════════════════════════════════════════════════
function IncomingCallModal({ caller, callType, onAccept, onReject }) {
    return ( <
        div style = {
            { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 } } >
        <
        div style = {
            { background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 20, padding: '36px 40px', textAlign: 'center', minWidth: 320 } } >
        <
        div style = {
            { fontSize: 50, marginBottom: 12 } } > { callType === 'video' ? '📹' : '📞' } < /div> <
        h3 style = {
            { color: '#fff', margin: '0 0 6px' } } > { callType === 'video' ? 'Video' : 'Voice' }
        Call < /h3> <
        p style = {
            { color: '#aaa', margin: '0 0 28px' } } > < b style = {
            { color: '#a78bfa' } } > {
            (caller && caller.name) || 'Someone' } < /b> is calling you...</p >
        <
        div style = {
            { display: 'flex', gap: 16, justifyContent: 'center' } } >
        <
        button onClick = { onReject }
        style = {
            { padding: '12px 28px', background: '#dc2626', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' } } > ❌Decline <
        /button> <
        button onClick = { onAccept }
        style = {
            { padding: '12px 28px', background: '#16a34a', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' } } > ✅Accept <
        /button> <
        /div> <
        /div> <
        /div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  ACTIVE CALL MODAL
// ════════════════════════════════════════════════════════════════════════════
function ActiveCallModal({ friend, callType, localStream, remoteStream, onEnd }) {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
        if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    }, [localStream, remoteStream]);

    return ( <
        div style = {
            { position: 'fixed', inset: 0, background: '#0a0a12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4000, gap: 16 } } >
        <
        h3 style = {
            { color: '#fff', margin: 0 } } > { callType === 'video' ? '📹 Video Call' : '📞 Voice Call' }
        with < span style = {
            { color: '#a78bfa' } } > { friend && friend.name } < /span> <
        /h3>

        {
            callType === 'video' && ( <
                div style = {
                    { display: 'flex', gap: 16, alignItems: 'center' } } >
                <
                div style = {
                    { position: 'relative' } } >
                <
                video ref = { remoteVideoRef }
                autoPlay playsInline style = {
                    { width: 560, height: 360, borderRadius: 16, background: '#111', border: '1px solid #2a2a3a', objectFit: 'cover' } }
                /> <
                div style = {
                    { position: 'absolute', bottom: 10, left: 10, color: '#aaa', fontSize: 12 } } > { friend && friend.name } < /div> <
                /div> <
                video ref = { localVideoRef }
                autoPlay playsInline muted style = {
                    { width: 160, height: 120, borderRadius: 10, background: '#111', border: '2px solid #6C63FF', objectFit: 'cover' } }
                /> <
                /div>
            )
        }

        {
            callType === 'audio' && ( <
                div style = {
                    { background: '#1a1a26', borderRadius: 20, padding: '40px 60px', textAlign: 'center', border: '1px solid #2a2a3a' } } >
                <
                Avatar name = {
                    (friend && friend.name) || '?' }
                size = { 80 }
                fontSize = { 32 }
                /> <
                p style = {
                    { color: '#fff', marginTop: 16, fontSize: 18, fontWeight: 700 } } > { friend && friend.name } < /p> <
                p style = {
                    { color: '#22c55e', fontSize: 13 } } > 🔊Connected < /p> { /* Hidden audio element */ } <
                audio ref = { remoteVideoRef }
                autoPlay style = {
                    { display: 'none' } }
                /> <
                /div>
            )
        }

        <
        button onClick = { onEnd }
        style = {
            { padding: '12px 40px', background: '#dc2626', border: 'none', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 8 } } > 📵End Call <
        /button> <
        /div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATION
// ════════════════════════════════════════════════════════════════════════════
function Toast({ toasts }) {
    return ( <
        div style = {
            { position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column-reverse', gap: 10, zIndex: 5000 } } > {
            toasts.map(t => ( <
                div key = { t.id }
                style = {
                    {
                        background: '#1a1a26',
                        border: '1px solid #2a2a3a',
                        borderRadius: 14,
                        padding: '12px 18px',
                        color: '#fff',
                        fontSize: 14,
                        minWidth: 260,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        animation: 'slideIn 0.3s ease',
                    }
                } >
                <
                span style = {
                    { fontSize: 22 } } > { t.icon } < /span> <
                div >
                <
                div style = {
                    { fontWeight: 700 } } > { t.title } < /div> <
                div style = {
                    { color: '#aaa', fontSize: 12 } } > { t.body } < /div> <
                /div> <
                /div>
            ))
        } <
        /div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
        const { user } = useAuth();
        const [friends, setFriends] = useState([]);
        const [requests, setRequests] = useState([]);
        const [activeTab, setActiveTab] = useState('all');
        const [toasts, setToasts] = useState([]);

        // DM
        const [dmFriend, setDmFriend] = useState(null);

        // Calls
        const [incomingCall, setIncomingCall] = useState(null); // { caller, callType, fromSocketId, offer }
        const [activeCall, setActiveCall] = useState(null); // { friend, callType }
        const [localStream, setLocalStream] = useState(null);
        const [remoteStream, setRemoteStream] = useState(null);
        const peerRef = useRef(null);

        // ── Toast helper ───────────────────────────────────────────────────────
        const addToast = useCallback((icon, title, body) => {
            const id = Date.now();
            setToasts(prev => [...prev, { id, icon, title, body }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
        }, []);

        // ── Data fetching ──────────────────────────────────────────────────────
        const fetchFriends = () => api.get('/friends').then(r => setFriends(r.data)).catch(console.error);
        const fetchRequests = () => api.get('/friends/requests').then(r => setRequests(r.data)).catch(console.error);

        useEffect(() => {
            if (!user) return;
            fetchFriends();
            fetchRequests();

            socket.on('friend_status_update', ({ userId, status }) => {
                setFriends(prev => prev.map(f => f._id === userId ? {...f, status } : f));
            });

            socket.on('new_friend_request', (data) => {
                setRequests(prev => {
                    const exists = prev.some(r => r.from && data.from && r.from._id && data.from._id && r.from._id.toString() === data.from._id.toString());
                    return exists ? prev : [...prev, data];
                });
                addToast('👥', 'Friend Request', (data.from && data.from.name ? data.from.name : 'Someone') + ' sent you a friend request');
            });

            // NEW: notification when your request was accepted
            socket.on('friend_request_was_accepted', ({ by }) => {
                addToast('🎉', 'Request Accepted!', ((by && by.name) || 'Someone') + ' accepted your friend request');
                fetchFriends();
            });

            // Incoming call
            socket.on('call_incoming', ({ from, fromSocketId, offer, callType }) => {
                setIncomingCall({ caller: from, fromSocketId, offer, callType });
            });

            socket.on('call_rejected', () => {
                cleanupCall();
                addToast('❌', 'Call Rejected', 'The call was rejected');
            });

            socket.on('call_ended', () => {
                cleanupCall();
                addToast('📵', 'Call Ended', 'The call has ended');
            });

            socket.on('call_answered', async({ answer }) => {
                if (peerRef.current) {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            });

            socket.on('call_ice_candidate', ({ candidate }) => {
                if (peerRef.current && candidate) {
                    peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            return () => {
                socket.off('friend_status_update');
                socket.off('new_friend_request');
                socket.off('friend_request_was_accepted');
                socket.off('call_incoming');
                socket.off('call_rejected');
                socket.off('call_ended');
                socket.off('call_answered');
                socket.off('call_ice_candidate');
            };
        }, [user]);

        // ── Accept / Decline requests ──────────────────────────────────────────
        const acceptRequest = (req) => {
            api.post('/friends/accept/' + req._id)
                .then(() => {
                    fetchFriends();
                    fetchRequests();
                    // Notify the sender
                    const senderId = req.from && req.from._id;
                    if (senderId) {
                        socket.emit('friend_request_accepted', {
                            toUserId: senderId,
                            acceptedBy: { name: user.name, username: user.username },
                        });
                    }
                })
                .catch(console.error);
        };

        const declineRequest = (requestId) => {
            api.post('/friends/decline/' + requestId).then(fetchRequests).catch(console.error);
        };

        const removeFriend = (friendId) => {
            if (!window.confirm('Remove this friend?')) return;
            api.delete('/friends/' + friendId).then(fetchFriends).catch(console.error);
        };

        // ── WebRTC call helpers ────────────────────────────────────────────────
        const cleanupCall = () => {
            if (peerRef.current) { peerRef.current.close();
                peerRef.current = null; }
            if (localStream) { localStream.getTracks().forEach(t => t.stop());
                setLocalStream(null); }
            setRemoteStream(null);
            setActiveCall(null);
            setIncomingCall(null);
        };

        const createPeerConnection = (toSocketId) => {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) socket.emit('call_ice_candidate', { toSocketId, candidate });
            };
            pc.ontrack = (e) => setRemoteStream(e.streams[0]);
            peerRef.current = pc;
            return pc;
        };

        const startCall = async(friend, callType) => {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === 'video',
            });
            setLocalStream(stream);

            const toSocketId = null; // will be filled via server lookup
            // We emit call_offer with the friend's userId; server routes it
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            pc.onicecandidate = ({ candidate }) => {
                if (candidate) socket.emit('call_ice_candidate', { toSocketId: 'pending', candidate });
            };
            pc.ontrack = (e) => setRemoteStream(e.streams[0]);
            peerRef.current = pc;

            stream.getTracks().forEach(t => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit('call_offer', {
                toUserId: friend._id,
                offer,
                callType,
                fromUser: { name: user.name, username: user.username, _id: user._id },
            });

            // Patch ICE to use real socket id once available
            socket.once('call_answered', async({ answer, fromSocketId: callerSock }) => {
                // reroute ICE
                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) socket.emit('call_ice_candidate', { toSocketId: callerSock || friend._id, candidate });
                };
            });

            setActiveCall({ friend, callType });
        };

        const acceptCall = async() => {
            if (!incomingCall) return;
            const { fromSocketId, offer, callType } = incomingCall;
            const callerFriend = friends.find(f => f._id === (incomingCall.caller && incomingCall.caller._id)) || incomingCall.caller;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
            setLocalStream(stream);

            const pc = createPeerConnection(fromSocketId);
            stream.getTracks().forEach(t => pc.addTrack(t, stream));

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('call_answer', { toSocketId: fromSocketId, answer });
            setActiveCall({ friend: callerFriend, callType });
            setIncomingCall(null);
        };

        const rejectCall = () => {
            if (incomingCall) socket.emit('call_reject', { toSocketId: incomingCall.fromSocketId });
            setIncomingCall(null);
        };

        const endCall = () => {
            if (activeCall) {
                // Try to notify other side — we may not know their socketId here, server handles via userId
                socket.emit('call_end', { toSocketId: 'all' });
            }
            cleanupCall();
        };

        // ── Render ─────────────────────────────────────────────────────────────
        const filtered = activeTab === 'online' ? friends.filter(f => f.status === 'online') : friends;
        const onlineCount = friends.filter(f => f.status === 'online').length;

        return ( <
                div style = { S.layout } >

                { /* Incoming call */ } {
                    incomingCall && ( <
                        IncomingCallModal caller = { incomingCall.caller }
                        callType = { incomingCall.callType }
                        onAccept = { acceptCall }
                        onReject = { rejectCall }
                        />
                    )
                }

                { /* Active call */ } {
                    activeCall && ( <
                        ActiveCallModal friend = { activeCall.friend }
                        callType = { activeCall.callType }
                        localStream = { localStream }
                        remoteStream = { remoteStream }
                        onEnd = { endCall }
                        />
                    )
                }

                { /* DM modal */ } {
                    dmFriend && < DMModal friend = { dmFriend }
                    myId = { user && user._id }
                    onClose = {
                        () => setDmFriend(null) }
                    />}

                    { /* Toasts */ } <
                    Toast toasts = { toasts }
                    />

                    { /* ── SIDEBAR ── */ } <
                    div style = { S.sidebar } >
                        <
                        div style = { S.profileCard } >
                        <
                        Avatar name = {
                            (user && user.name) || 'U' }
                    size = { 50 }
                    fontSize = { 20 }
                    /> <
                    div style = { S.profileInfo } >
                        <
                        div style = { S.profileName } > { user && user.name } < /div> <
                        div style = { S.profileUsername } > @ { user && user.username } < /div> <
                        div style = { S.profileStatus } >
                        <
                        div style = {
                            {...S.dot, backgroundColor: '#22c55e' } }
                    /> <
                    span style = { S.profileStatusText } > Online < /span> <
                        /div> <
                        /div> <
                        /div>

                    <
                    div style = { S.sideNav } >
                        <
                        Link to = "/"
                    style = { S.sideNavItem } > < span > 🏠 < /span><span>Home</span > < /Link> <
                        Link to = "/friends"
                    style = { S.sideNavItem } > < span > 🔍 < /span><span>Find Friends</span > < /Link> <
                        Link to = "/watch"
                    style = { S.sideNavItem } > < span > 📺 < /span><span>Watch Together</span > < /Link>

                    { /* Friend Requests */ } <
                    div style = {
                            {...S.sideNavItem, cursor: 'default', justifyContent: 'space-between' } } >
                        <
                        div style = {
                            { display: 'flex', alignItems: 'center', gap: 10 } } >
                        <
                        span > 👥 < /span><span>Friend Requests</span >
                        <
                        /div> {
                            requests.length > 0 && < span style = { S.requestsBadge } > { requests.length } < /span>} <
                                /div> <
                                /div>

                            {
                                requests.length > 0 && ( <
                                    div style = { S.requestsBox } > {
                                        requests.map((req, i) => {
                                            const fromName = (req.from && req.from.name) || '?';
                                            const fromUsername = (req.from && req.from.username) || '';
                                            return ( <
                                                div key = { req._id || i }
                                                style = { S.requestItem } >
                                                <
                                                Avatar name = { fromName }
                                                size = { 34 }
                                                fontSize = { 13 }
                                                /> <
                                                div style = { S.reqInfo } >
                                                <
                                                div style = { S.reqName } > { fromName } < /div> <
                                                div style = { S.reqUsername } > @ { fromUsername } < /div> <
                                                /div> <
                                                div style = { S.reqBtns } >
                                                <
                                                button style = { S.acceptBtn }
                                                onClick = {
                                                    () => acceptRequest(req) } > ✓ < /button> <
                                                button style = { S.declineBtn }
                                                onClick = {
                                                    () => declineRequest(req._id) } > ✕ < /button> <
                                                /div> <
                                                /div>
                                            );
                                        })
                                    } <
                                    /div>
                                )
                            } <
                            /div>

                            { /* ── MAIN ── */ } <
                            div style = { S.main } >
                                <
                                div style = { S.mainTop } >
                                <
                                div >
                                <
                                h1 style = { S.pageTitle } > Friends < /h1> <
                                p style = { S.pageSub } > { friends.length }
                            friends· { onlineCount }
                            online now < /p> <
                                /div> <
                                div style = {
                                    { display: 'flex', gap: 10, alignItems: 'center' } } >
                                <
                                Link to = "/watch"
                            style = { S.addBtn } > 📺Watch Party < /Link> <
                                Link to = "/friends"
                            style = { S.addBtn } > +Add Friend < /Link> <
                                /div> <
                                /div>

                            <
                            div style = { S.tabRow } > {
                                    ['all', 'online'].map(t => ( <
                                        button key = { t }
                                        style = {
                                            {...S.tab, ...(activeTab === t ? S.tabOn : {}) } }
                                        onClick = {
                                            () => setActiveTab(t) } > { t === 'all' ? `All (${friends.length})` : `Online (${onlineCount})` } <
                                        /button>
                                    ))
                                } <
                                /div>

                            {
                                filtered.length === 0 ? ( <
                                    div style = { S.empty } >
                                    <
                                    div style = { S.emptyEmoji } > { activeTab === 'online' ? '😴' : '👥' } < /div> <
                                    div style = { S.emptyTitle } > { activeTab === 'online' ? 'Nobody online right now' : 'No friends yet' } < /div> <
                                    div style = { S.emptySub } > { activeTab === 'online' ? 'Check back later!' : 'Find people to connect with' } < /div> {
                                        activeTab === 'all' && < Link to = "/friends"
                                        style = { S.emptyBtn } > Find Friends < /Link>} <
                                            /div>
                                    ): ( <
                                        div style = { S.grid } > {
                                            filtered.map(f => ( <
                                                    div key = { f._id }
                                                    style = { S.friendCard } >
                                                    <
                                                    div style = { S.friendTop } >
                                                    <
                                                    div style = { S.friendAvatarWrap } >
                                                    <
                                                    Avatar name = { f.name }
                                                    size = { 54 }
                                                    fontSize = { 22 }
                                                    /> <
                                                    div style = {
                                                        {...S.statusBubble, backgroundColor: statusColors[f.status] } }
                                                    /> <
                                                    /div> <
                                                    button style = { S.removeX }
                                                    onClick = {
                                                        () => removeFriend(f._id) }
                                                    title = "Remove" > ✕ < /button> <
                                                    /div> <
                                                    div style = { S.friendName } > { f.name } < /div> <
                                                    div style = { S.friendUsername } > @ { f.username } < /div> <
                                                    div style = { S.friendStatusRow } >
                                                    <
                                                    div style = {
                                                        {...S.dot, backgroundColor: statusColors[f.status] } }
                                                    /> <
                                                    span style = {
                                                        { color: statusColors[f.status], fontSize: 12, fontWeight: 600 } } > { statusLabels[f.status] } < /span> <
                                                    /div> {
                                                        f.statusMessage && < div style = { S.friendMsgText } > { f.statusMessage } < /div>} <
                                                            div style = { S.friendBtns } >
                                                            <
                                                            button style = { S.msgBtn }
                                                        onClick = {
                                                                () => setDmFriend(f) } > 💬Message < /button> <
                                                            button style = { S.callBtn }
                                                        onClick = {
                                                                () => startCall(f, 'audio') } > 📞Call < /button> <
                                                            button style = { S.callBtn }
                                                        onClick = {
                                                                () => startCall(f, 'video') } > 📹Video < /button> <
                                                            /div> <
                                                            /div>
                                                    ))
                                            } <
                                            /div>
                                        )
                                    } <
                                    /div>

                                    <
                                    style > { `
                @keyframes slideIn {
                    from { opacity:0; transform:translateX(40px); }
                    to   { opacity:1; transform:translateX(0); }
                }
            ` } < /style> <
                                    /div>
                                );
                            };

                            const S = {
                                layout: { display: 'flex', minHeight: '100vh', background: '#0a0a12', color: '#e8e8f0' },
                                sidebar: { width: 260, background: '#0f0f1a', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 8, flexShrink: 0 },
                                profileCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', background: '#1a1a26', borderRadius: 12, marginBottom: 8, border: '1px solid #2a2a3a' },
                                profileInfo: { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' },
                                profileName: { fontSize: 14, fontWeight: 700, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                profileUsername: { fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                profileStatus: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 },
                                profileStatusText: { fontSize: 11, color: '#22c55e', fontWeight: 600 },
                                sideNav: { display: 'flex', flexDirection: 'column', gap: 2 },
                                sideNavItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, color: '#aaa', fontSize: 14, fontWeight: 500, textDecoration: 'none', cursor: 'pointer', background: 'transparent' },
                                requestsBadge: { background: '#6C63FF', color: '#fff', borderRadius: 10, padding: '2px 7px', fontSize: 10, fontWeight: 700 },
                                requestsBox: { background: '#1a1a26', borderRadius: 12, padding: '10px', border: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column', gap: 8 },
                                requestItem: { display: 'flex', alignItems: 'center', gap: 8 },
                                reqInfo: { flex: 1, overflow: 'hidden' },
                                reqName: { fontSize: 12, fontWeight: 700, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                reqUsername: { fontSize: 11, color: '#555' },
                                reqBtns: { display: 'flex', gap: 4 },
                                acceptBtn: { width: 26, height: 26, borderRadius: 6, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 13, cursor: 'pointer' },
                                declineBtn: { width: 26, height: 26, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, cursor: 'pointer' },
                                main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
                                mainTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
                                pageTitle: { fontSize: 26, fontWeight: 800, color: '#e8e8f0', margin: 0 },
                                pageSub: { fontSize: 13, color: '#555', margin: '4px 0 0' },
                                addBtn: { background: 'linear-gradient(135deg,#6d5fdf,#a78bfa)', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' },
                                tabRow: { display: 'flex', gap: 8, marginBottom: 20 },
                                tab: { padding: '8px 18px', borderRadius: 20, border: '1px solid #2a2a3a', background: 'transparent', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
                                tabOn: { background: '#6C63FF', color: '#fff', border: '1px solid #6C63FF' },
                                empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 8 },
                                emptyEmoji: { fontSize: 48, marginBottom: 8 },
                                emptyTitle: { fontSize: 18, fontWeight: 700, color: '#e8e8f0' },
                                emptySub: { fontSize: 14, color: '#555' },
                                emptyBtn: { marginTop: 16, background: '#6C63FF', borderRadius: 10, padding: '10px 24px', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 14 },
                                grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
                                friendCard: { background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 16, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
                                friendTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
                                friendAvatarWrap: { position: 'relative', display: 'inline-block' },
                                statusBubble: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', border: '2px solid #0f0f1a' },
                                removeX: { background: 'transparent', border: 'none', color: '#444', fontSize: 14, cursor: 'pointer', padding: 4 },
                                friendName: { fontSize: 15, fontWeight: 700, color: '#e8e8f0', marginTop: 2 },
                                friendUsername: { fontSize: 12, color: '#555', marginBottom: 4 },
                                friendStatusRow: { display: 'flex', alignItems: 'center', gap: 5 },
                                friendMsgText: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                                friendBtns: { display: 'flex', gap: 6, marginTop: 12 },
                                msgBtn: { flex: 1, background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 8, padding: '7px 0', color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
                                callBtn: { flex: 1, background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 8, padding: '7px 0', color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
                                dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
                            };

                            export default Dashboard;