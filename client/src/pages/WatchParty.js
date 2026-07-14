import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';

function getYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /youtube\.com\/watch\?v=([^&]+)/,
        /youtu\.be\/([^?]+)/,
        /youtube\.com\/embed\/([^?]+)/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function getYouTubeThumb(id) { return 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg'; }

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }

let ytReady = false,
    ytCBs = [];

function loadYT(cb) {
    if (ytReady) { cb(); return; }
    ytCBs.push(cb);
    if (document.getElementById('yt-script')) return;
    const s = document.createElement('script');
    s.id = 'yt-script';
    s.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(s);
    window.onYouTubeIframeAPIReady = function() {
        ytReady = true;
        ytCBs.forEach(function(f) { f(); });
        ytCBs = [];
    };
}

function calcWinner(squares) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    for (var i = 0; i < lines.length; i++) {
        var a = lines[i][0],
            b = lines[i][1],
            c = lines[i][2];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
}

const DEFAULT_SUDOKU = [
    [1, 0, 0, 4, 0, 0],
    [0, 5, 0, 0, 2, 0],
    [0, 0, 3, 0, 0, 6],
    [4, 0, 0, 2, 0, 0],
    [0, 2, 0, 0, 5, 0],
    [0, 0, 6, 0, 0, 1],
];

function Landing({ onAction }) {
    const [tab, setTab] = useState('create');
    const [url, setUrl] = useState('');
    const [code, setCode] = useState('');
    return ( <
        div style = {
            { minHeight: 'calc(100vh - 60px)', background: '#0a0a12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } } >
        <
        div style = {
            { background: '#0f0f1a', border: '1px solid #2a2a3a', borderRadius: 20, padding: '50px 40px', width: '100%', maxWidth: 480, textAlign: 'center' } } >
        <
        div style = {
            { fontSize: 60, marginBottom: 10 } } > 📺 < /div> <
        h1 style = {
            { fontSize: 32, color: '#fff', marginBottom: 8 } } > Watch Party < /h1> <
        p style = {
            { color: '#aaa', marginBottom: 30 } } > Watch together, stay in sync < /p> <
        div style = {
            { display: 'flex', background: '#1a1a26', borderRadius: 12, padding: 4, marginBottom: 30 } } > {
            ['create', 'join'].map(function(t) {
                return ( <
                    button key = { t }
                    onClick = {
                        function() { setTab(t); } }
                    style = {
                        { flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: tab === t ? '#6C63FF' : 'transparent', color: tab === t ? '#fff' : '#888', fontWeight: 600, cursor: 'pointer' } } > { t === 'create' ? 'Create Room' : 'Join Room' } <
                    /button>
                );
            })
        } <
        /div> {
            tab === 'create' && ( <
                div >
                <
                input style = { inputSt }
                placeholder = "YouTube URL (optional)"
                value = { url }
                onChange = {
                    function(e) { setUrl(e.target.value); } }
                /> <
                button style = { btnSt }
                onClick = {
                    function() { onAction({ type: 'create', roomId: generateCode(), videoUrl: url }); } } > Create New Room < /button> <
                /div>
            )
        } {
            tab === 'join' && ( <
                div >
                <
                input style = { inputSt }
                placeholder = "Enter 6 digit room code"
                value = { code }
                onChange = {
                    function(e) { setCode(e.target.value.toUpperCase()); } }
                maxLength = { 6 }
                /> <
                button style = { btnSt }
                onClick = {
                    function() { onAction({ type: 'join', roomId: code }); } } > Join Room < /button> <
                /div>
            )
        } <
        /div> <
        /div>
    );
}

const inputSt = { width: '100%', padding: '14px', background: '#1a1a26', border: '1px solid #444', borderRadius: 10, color: '#fff', marginBottom: 15, boxSizing: 'border-box' };
const btnSt = { width: '100%', padding: '15px', background: '#6C63FF', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' };

function TicTacToeModal({ onClose, myRole, board, turn, onMove, onReset, members }) {
    const winner = calcWinner(board);
    const isDraw = !winner && board.every(Boolean);
    const isMyTurn = myRole && myRole === turn;
    const otherMember = members && members.find(function(m) { return m.id !== socket.id; });

    var statusMsg = '';
    if (!myRole) statusMsg = 'Spectating';
    else if (winner) statusMsg = winner === myRole ? '🎉 You Win!' : '😔 You Lose';
    else if (isDraw) statusMsg = "🤝 It's a Draw!";
    else if (isMyTurn) statusMsg = '⬆ Your turn!';
    else statusMsg = 'Waiting for ' + ((otherMember && otherMember.name) || 'opponent') + '...';

    return ( <
        div style = { mOverlay } >
        <
        div style = { Object.assign({}, mCard, { minWidth: 360 }) } >
        <
        h2 style = {
            { color: '#fff', margin: '0 0 4px' } } > ⭕Tic Tac Toe < /h2> { myRole && < p style = {
                { color: '#a78bfa', fontSize: 13, margin: '0 0 14px' } } > You are < b > { myRole } < /b></p > } <
        p style = {
            { color: isMyTurn ? '#22c55e' : '#888', fontSize: 14, margin: '0 0 16px', fontWeight: 600 } } > { statusMsg } < /p> <
        div style = {
            { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, width: 300, margin: '0 auto' } } > {
            board.map(function(val, i) {
                return ( <
                    button key = { i }
                    onClick = {
                        function() { if (!val && !winner && isMyTurn) onMove(i); } }
                    style = {
                        {
                            height: 90,
                            fontSize: 44,
                            fontWeight: 700,
                            background: val === 'X' ? 'rgba(108,99,255,0.18)' : val === 'O' ? 'rgba(239,68,68,0.18)' : '#1a1a26',
                            border: '2px solid ' + (val === 'X' ? '#6C63FF' : val === 'O' ? '#ef4444' : '#2a2a3a'),
                            color: val === 'X' ? '#a78bfa' : '#f87171',
                            borderRadius: 10,
                            cursor: !val && !winner && isMyTurn ? 'pointer' : 'default',
                            transition: 'all 0.12s',
                        }
                    } > { val } <
                    /button>
                );
            })
        } <
        /div> <
        div style = {
            { display: 'flex', gap: 10, marginTop: 22 } } >
        <
        button onClick = { onReset }
        style = {
            { flex: 1, padding: '11px', background: '#6C63FF', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 14 } } > 🔄New Game < /button> <
        button onClick = { onClose }
        style = {
            { flex: 1, padding: '11px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 14 } } > Close < /button> <
        /div> <
        /div> <
        /div>
    );
}

function SudokuModal({ onClose, board, onCellChange }) {
    const [localBoard, setLocalBoard] = useState(
        board ? board.map(function(r) { return r.slice(); }) : DEFAULT_SUDOKU.map(function(r) { return r.slice(); })
    );
    const initial = DEFAULT_SUDOKU;

    useEffect(function() {
        if (board) setLocalBoard(board.map(function(r) { return r.slice(); }));
    }, [JSON.stringify(board)]);

    const handleChange = function(row, col, value) {
        if (initial[row][col] !== 0) return;
        var v = value ? parseInt(value) : 0;
        if (isNaN(v) || v < 0 || v > 6) return;
        var nb = localBoard.map(function(r) { return r.slice(); });
        nb[row][col] = v;
        setLocalBoard(nb);
        onCellChange(row, col, v);
    };

    const isComplete = localBoard.every(function(row) { return row.every(function(v) { return v !== 0; }); });

    return ( <
        div style = { mOverlay } >
        <
        div style = { Object.assign({}, mCard, { minWidth: 420 }) } >
        <
        h2 style = {
            { color: '#fff', margin: '0 0 4px' } } > 🧩6× 6 Sudoku < /h2> <
        p style = {
            { color: '#888', fontSize: 12, margin: '0 0 18px' } } > Collaborative— both players share the same board! < /p> <
        div style = {
            { display: 'grid', gridTemplateColumns: 'repeat(6,50px)', gap: 4, background: '#1a1a26', padding: 10, borderRadius: 12, margin: '0 auto', width: 'fit-content' } } > {
            localBoard.flat().map(function(val, i) {
                var row = Math.floor(i / 6),
                    col = i % 6;
                var isPre = initial[row][col] !== 0;
                return ( <
                    input key = { i }
                    value = { val || '' }
                    onChange = {
                        function(e) { handleChange(row, col, e.target.value); } }
                    style = {
                        {
                            width: 50,
                            height: 50,
                            textAlign: 'center',
                            fontSize: 22,
                            fontWeight: 700,
                            background: isPre ? '#2a2a3a' : '#0f0f1a',
                            border: '1px solid ' + (isPre ? '#555' : '#6C63FF55'),
                            borderRadius: 8,
                            color: isPre ? '#a78bfa' : '#fff',
                            cursor: isPre ? 'default' : 'text',
                            outline: 'none',
                        }
                    }
                    maxLength = { 1 }
                    readOnly = { isPre }
                    />
                );
            })
        } <
        /div> {
            isComplete && < p style = {
                    { color: '#22c55e', marginTop: 14, fontSize: 18, fontWeight: 700 } } > 🎉Puzzle Complete! < /p>} <
                button onClick = { onClose }
            style = {
                    { marginTop: 20, padding: '11px 44px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600 } } > Close < /button> <
                /div> <
                /div>
        );
    }

    const mOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.87)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
    const mCard = { background: '#0f0f1a', padding: '28px 30px', borderRadius: 20, border: '1px solid #2a2a3a', textAlign: 'center' };

    function Room({ roomId, isHost, initialUrl, onLeave }) {
        const playerRef = useRef(null);
        const localStreamRef = useRef(null);
        const peerConns = useRef({});
        const remoteVideoRefs = useRef({});

        const [videoId, setVideoId] = useState(getYouTubeId(initialUrl || ''));
        const [currentIndex, setCurrentIndex] = useState(0);
        const [playlist, setPlaylist] = useState([]);
        const [urlInput, setUrlInput] = useState('');
        const [members, setMembers] = useState([]);

        const [showTTT, setShowTTT] = useState(false);
        const [showSudoku, setShowSudoku] = useState(false);
        const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
        const [tttTurn, setTttTurn] = useState('X');
        const [myTttRole, setMyTttRole] = useState(null);
        const [sudokuBoard, setSudokuBoard] = useState(null);

        const [micOn, setMicOn] = useState(false);
        const [camOn, setCamOn] = useState(false);
        const [localStream, setLocalStream] = useState(null);
        const [remoteStreams, setRemoteStreams] = useState({});

        const playlistRef = useRef(playlist);
        const currentIndexRef = useRef(currentIndex);
        useEffect(function() { playlistRef.current = playlist; }, [playlist]);
        useEffect(function() { currentIndexRef.current = currentIndex; }, [currentIndex]);

        const createPC = useCallback(function(remoteId) {
            if (peerConns.current[remoteId]) return peerConns.current[remoteId];
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            pc.onicecandidate = function(e) {
                if (e.candidate) socket.emit('watch_webrtc_ice', { toSocketId: remoteId, candidate: e.candidate });
            };
            pc.ontrack = function(e) {
                var stream = e.streams[0];
                setRemoteStreams(function(prev) { return Object.assign({}, prev, {
                        [remoteId]: stream }); });
            };
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(function(t) { pc.addTrack(t, localStreamRef.current); });
            }
            peerConns.current[remoteId] = pc;
            return pc;
        }, []);

        const offerToAll = useCallback(async function(stream) {
            for (var i = 0; i < members.length; i++) {
                var m = members[i];
                if (m.id === socket.id) continue;
                const pc = createPC(m.id);
                stream.getTracks().forEach(function(t) { pc.addTrack(t, stream); });
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('watch_webrtc_offer', { roomId: roomId, offer: offer });
            }
        }, [members, roomId, createPC]);

        useEffect(function() {
            var userName = localStorage.getItem('wp_guest_name') || localStorage.getItem('hangout_user_name') || 'Guest';
            socket.emit('watch_join', { roomId: roomId, userName: userName, isHost: isHost });

            socket.on('watch_room_state', function(state) {
                if (state.playlist) setPlaylist(state.playlist);
                if (state.currentUrl) setVideoId(state.currentUrl);
                if (state.currentIndex !== undefined) setCurrentIndex(state.currentIndex);
                if (state.tttBoard) setTttBoard(state.tttBoard);
                if (state.tttTurn) setTttTurn(state.tttTurn);
                if (state.myRole) setMyTttRole(state.myRole);
                if (state.sudokuBoard) setSudokuBoard(state.sudokuBoard);
                if (state.members) setMembers(state.members);
            });

            socket.on('watch_member_joined', function(member) {
                setMembers(function(prev) { return prev.filter(function(m) { return m.id !== member.id; }).concat([member]); });
            });

            socket.on('watch_member_left', function(data) {
                var id = data.id;
                setMembers(function(prev) { return prev.filter(function(m) { return m.id !== id; }); });
                if (peerConns.current[id]) { peerConns.current[id].close();
                    delete peerConns.current[id]; }
                setRemoteStreams(function(prev) { var n = Object.assign({}, prev);
                    delete n[id]; return n; });
            });

            socket.on('watch_playlist_updated', function(data) { setPlaylist(data.playlist); });

            socket.on('watch_video_changed', function(data) {
                setVideoId(data.videoId);
                setCurrentIndex(data.index !== undefined ? data.index : 0);
            });

            socket.on('ttt_update', function(data) {
                setTttBoard(data.board);
                setTttTurn(data.turn);
            });

            socket.on('sudoku_cell_updated', function(data) {
                setSudokuBoard(function(prev) {
                    if (!prev) return prev;
                    var n = prev.map(function(r) { return r.slice(); });
                    n[data.row][data.col] = data.value;
                    return n;
                });
            });

            socket.on('sudoku_board_init', function(data) {
                setSudokuBoard(data.board.map(function(r) { return r.slice(); }));
            });

            socket.on('watch_webrtc_offer', async function(data) {
                const pc = createPC(data.fromSocketId);
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('watch_webrtc_answer', { toSocketId: data.fromSocketId, answer: answer });
            });

            socket.on('watch_webrtc_answer', async function(data) {
                const pc = peerConns.current[data.fromSocketId];
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            });

            socket.on('watch_webrtc_ice', function(data) {
                const pc = peerConns.current[data.fromSocketId];
                if (pc && data.candidate) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            });

            return function() {
                socket.emit('watch_leave', { roomId: roomId });
                var events = ['watch_room_state', 'watch_member_joined', 'watch_member_left', 'watch_playlist_updated',
                    'watch_video_changed', 'ttt_update', 'sudoku_cell_updated', 'sudoku_board_init',
                    'watch_webrtc_offer', 'watch_webrtc_answer', 'watch_webrtc_ice'
                ];
                events.forEach(function(e) { socket.off(e); });
                Object.values(peerConns.current).forEach(function(pc) { pc.close(); });
                if (localStreamRef.current) localStreamRef.current.getTracks().forEach(function(t) { t.stop(); });
            };
        }, [roomId]);

        useEffect(function() {
            if (!videoId) return;
            loadYT(function() {
                try { if (playerRef.current) playerRef.current.destroy(); } catch (e) {}
                playerRef.current = new window.YT.Player('yt-player', {
                    videoId: videoId,
                    playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
                    events: {
                        onReady: function() { console.log('YT ready'); },
                        onStateChange: function(e) {
                            if (isHost && e.data === window.YT.PlayerState.ENDED) {
                                socket.emit('watch_video_ended', { roomId: roomId });
                                var next = currentIndexRef.current + 1;
                                if (next < playlistRef.current.length) {
                                    setCurrentIndex(next);
                                    setVideoId(playlistRef.current[next].id);
                                }
                            }
                        },
                        onError: function(e) { console.log('YT error:', e.data); },
                    }
                });
            });
        }, [videoId]);

        const addToPlaylist = function() {
            const id = getYouTubeId(urlInput);
            if (!id) return alert('Invalid YouTube URL!');
            var newItem = { id: id, url: urlInput, title: 'Video ' + (playlist.length + 1) };
            var newPlaylist = playlist.concat([newItem]);
            setPlaylist(newPlaylist);
            socket.emit('watch_playlist_update', { roomId: roomId, playlist: newPlaylist });
            if (!videoId) {
                setVideoId(id);
                socket.emit('watch_video_change', { roomId: roomId, videoId: id, index: 0 });
            }
            setUrlInput('');
        };

        const playVideo = function(item, index) {
            if (!isHost) return;
            setVideoId(item.id);
            setCurrentIndex(index);
            socket.emit('watch_video_change', { roomId: roomId, videoId: item.id, index: index });
        };

        const toggleMic = async function() {
            if (!micOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: camOn });
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setMicOn(true);
                    socket.emit('watch_media_toggle', { roomId: roomId, type: 'audio', enabled: true });
                    await offerToAll(stream);
                } catch (e) { alert('Microphone access denied'); }
            } else {
                if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(function(t) { t.stop(); });
                setMicOn(false);
                socket.emit('watch_media_toggle', { roomId: roomId, type: 'audio', enabled: false });
            }
        };

        const toggleCam = async function() {
            if (!camOn) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: micOn, video: true });
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setCamOn(true);
                    socket.emit('watch_media_toggle', { roomId: roomId, type: 'video', enabled: true });
                    await offerToAll(stream);
                } catch (e) { alert('Camera access denied'); }
            } else {
                if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(function(t) { t.stop(); });
                setCamOn(false);
                socket.emit('watch_media_toggle', { roomId: roomId, type: 'video', enabled: false });
            }
        };

        const handleTTTMove = function(i) { socket.emit('ttt_move', { roomId: roomId, index: i }); };
        const handleTTTReset = function() { socket.emit('ttt_reset', { roomId: roomId }); };

        const handleSudokuOpen = function() {
            if (!sudokuBoard) {
                var board = DEFAULT_SUDOKU.map(function(r) { return r.slice(); });
                setSudokuBoard(board);
                socket.emit('sudoku_init', { roomId: roomId, board: board });
            }
            setShowSudoku(true);
        };

        const handleSudokuCell = function(row, col, value) {
            setSudokuBoard(function(prev) {
                var n = prev.map(function(r) { return r.slice(); });
                n[row][col] = value;
                return n;
            });
            socket.emit('sudoku_cell_change', { roomId: roomId, row: row, col: col, value: value });
        };

        var hasRemoteVideo = Object.keys(remoteStreams).length > 0;

        return ( <
            div style = {
                { height: 'calc(100vh - 60px)', background: '#0a0a12', display: 'flex', flexDirection: 'column' } } >

            <
            div style = {
                { padding: '10px 16px', background: '#0f0f1a', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } } >
            <
            div style = {
                { color: '#a78bfa', fontWeight: 700, fontSize: 13, minWidth: 90 } } >
            Room: < span style = {
                { color: '#fff', letterSpacing: 1 } } > { roomId } < /span> <
            /div>

            {
                isHost && ( <
                    React.Fragment >
                    <
                    input style = {
                        { flex: 1, minWidth: 180, maxWidth: 400, padding: '9px 13px', background: '#1a1a26', border: '1px solid #333', borderRadius: 10, color: 'white', fontSize: 14 } }
                    placeholder = "Paste YouTube URL here..."
                    value = { urlInput }
                    onChange = {
                        function(e) { setUrlInput(e.target.value); } }
                    onKeyDown = {
                        function(e) { if (e.key === 'Enter') addToPlaylist(); } }
                    /> <
                    button onClick = { addToPlaylist }
                    style = { tBtn('#6C63FF') } > +Add < /button> <
                    /React.Fragment>
                )
            }

            <
            button onClick = { toggleMic }
            style = { tBtn(micOn ? '#16a34a' : '#374151') } > { micOn ? '🎙️ Mic On' : '🔇 Mic Off' } < /button> <
            button onClick = { toggleCam }
            style = { tBtn(camOn ? '#2563eb' : '#374151') } > { camOn ? '📹 Cam On' : '📷 Cam Off' } < /button> <
            button onClick = { handleSudokuOpen }
            style = { tBtn('#2563eb') } > 🧩Sudoku < /button> <
            button onClick = {
                function() { setShowTTT(true); } }
            style = { tBtn('#7c3aed') } > ⭕TicTacToe < /button>

            <
            div style = {
                { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 } } > {
                members.map(function(m) {
                    return ( <
                        div key = { m.id }
                        title = { m.name }
                        style = {
                            { width: 32, height: 32, borderRadius: '50%', background: '#6C63FF', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: m.isHost ? '2px solid #a78bfa' : '2px solid #2a2a3a' } } > { m.name && m.name[0] ? m.name[0].toUpperCase() : '?' } <
                        /div>
                    );
                })
            } <
            /div>

            <
            button onClick = { onLeave }
            style = { tBtn('#dc2626') } > Leave < /button> <
            /div>

            <
            div style = {
                { display: 'flex', flex: 1, overflow: 'hidden' } } >

            <
            div style = {
                { flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } } >
            <
            div style = {
                { background: '#000', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 } } > {
                videoId ?
                < div id = "yt-player"
                style = {
                    { width: '100%', height: '100%' } }
                /> :
                    < div style = {
                        { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 17 } } > { isHost ? 'Paste a YouTube link above to start ▲' : 'Waiting for host to start a video...' } <
                    /div>
            } <
            /div>

            {
                (hasRemoteVideo || (localStream && camOn)) && ( <
                    div style = {
                        { display: 'flex', gap: 8, height: 110, flexShrink: 0 } } > {
                        localStream && camOn && ( <
                            video autoPlay playsInline muted ref = {
                                function(el) { if (el && localStream) el.srcObject = localStream; } }
                            style = {
                                { height: '100%', aspectRatio: '16/9', borderRadius: 8, background: '#000', border: '2px solid #6C63FF', objectFit: 'cover' } }
                            />
                        )
                    } {
                        Object.entries(remoteStreams).map(function(entry) {
                            var sid = entry[0],
                                stream = entry[1];
                            return ( <
                                video key = { sid }
                                autoPlay playsInline ref = {
                                    function(el) { if (el && stream) el.srcObject = stream; } }
                                style = {
                                    { height: '100%', aspectRatio: '16/9', borderRadius: 8, background: '#000', border: '1px solid #2a2a3a', objectFit: 'cover' } }
                                />
                            );
                        })
                    } <
                    /div>
                )
            } <
            /div>

            <
            div style = {
                { width: 280, background: '#0f0f1a', borderLeft: '1px solid #1e1e2e', padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 } } >
            <
            h3 style = {
                { color: '#fff', margin: 0, fontSize: 14, fontWeight: 700 } } > 📋Playlist < /h3> {
                playlist.length === 0 && ( <
                    p style = {
                        { color: '#555', textAlign: 'center', marginTop: 30, fontSize: 13 } } >
                    No videos yet. < br / > Paste a link above <
                    /p>
                )
            } {
                playlist.map(function(item, i) {
                    return ( <
                        div key = { i }
                        onClick = {
                            function() { playVideo(item, i); } }
                        style = {
                            {
                                cursor: isHost ? 'pointer' : 'default',
                                padding: 8,
                                borderRadius: 10,
                                background: i === currentIndex ? '#1e1e3a' : '#1a1a26',
                                border: '1px solid ' + (i === currentIndex ? '#6C63FF' : 'transparent'),
                                transition: 'all 0.15s',
                            }
                        } >
                        <
                        img src = { getYouTubeThumb(item.id) }
                        style = {
                            { width: '100%', borderRadius: 6 } }
                        alt = "" / >
                        <
                        div style = {
                            { marginTop: 6, fontSize: 12, color: i === currentIndex ? '#a78bfa' : '#bbb', fontWeight: i === currentIndex ? 700 : 400 } } > { i === currentIndex ? '▶ ' : '' } { item.title } <
                        /div> <
                        /div>
                    );
                })
            } <
            /div> <
            /div>

            {
                showTTT && ( <
                    TicTacToeModal onClose = {
                        function() { setShowTTT(false); } }
                    myRole = { myTttRole }
                    board = { tttBoard }
                    turn = { tttTurn }
                    onMove = { handleTTTMove }
                    onReset = { handleTTTReset }
                    members = { members }
                    />
                )
            } {
                showSudoku && ( <
                    SudokuModal onClose = {
                        function() { setShowSudoku(false); } }
                    board = { sudokuBoard }
                    onCellChange = { handleSudokuCell }
                    />
                )
            } <
            /div>
        );
    }

    function tBtn(bg) {
        return { padding: '9px 13px', background: bg, border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
    }

    export default function WatchParty() {
        const { roomId: urlRoomId } = useParams();
        const navigate = useNavigate();
        const [stage, setStage] = useState(urlRoomId ? 'room' : 'landing');
        const [roomId, setRoomId] = useState(urlRoomId || '');
        const [isHost, setIsHost] = useState(false);
        const [initialUrl, setInitialUrl] = useState('');

        useEffect(function() {
            if (urlRoomId) {
                setRoomId(urlRoomId);
                setIsHost(false);
                setStage('room');
            }
        }, [urlRoomId]);

        const handleAction = function(data) {
            setRoomId(data.roomId);
            setIsHost(data.type === 'create');
            setInitialUrl(data.videoUrl || '');
            navigate('/watch/' + data.roomId);
            setStage('room');
        };

        const handleLeave = function() {
            navigate('/watch');
            setStage('landing');
        };

        if (stage === 'landing') return <Landing onAction = { handleAction }
        />;
        return <Room roomId = { roomId }
        isHost = { isHost }
        initialUrl = { initialUrl }
        onLeave = { handleLeave }
        />;
    }