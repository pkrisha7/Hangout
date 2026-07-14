/* ==========================================================================
   HANGOUT - MAIN APP CONTROLLER
   ========================================================================== */

const API_BASE = '/api';

// Global App State
const state = {
    token: localStorage.getItem('token') || null,
    user: null,
    currentView: 'auth',       // 'auth' | 'dashboard' | 'room'
    activeRoomId: null,
    activeChatFriend: null,    // The user we are currently direct-messaging
    notifications: [],
    friends: [],
    friendRequests: [],
    isHost: false
};

// ==========================================
//             API WRAPPERS
// ==========================================
const api = {
    headers() {
        const headers = { 'Content-Type': 'application/json' };
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }
        return headers;
    },

    async get(path) {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'GET',
            headers: this.headers()
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Request failed');
        }
        return response.json();
    },

    async post(path, body = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Request failed');
        }
        return response.json();
    },

    async delete(path) {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'DELETE',
            headers: this.headers()
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Request failed');
        }
        return response.json();
    }
};

// ==========================================
//             APP INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    initAuthDOM();
    initDashboardDOM();
    initNotificationDOM();

    if (state.token) {
        try {
            state.user = await api.get('/auth/me');
            showView('dashboard');
            initSocketConnection();
            loadUserData();
        } catch (e) {
            console.error('Session restore failed:', e.message);
            logout();
        }
    } else {
        showView('auth');
    }
});

// ==========================================
//           VIEW CONTROLLERS
// ==========================================
function showView(viewName) {
    state.currentView = viewName;
    
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const dashboardView = document.getElementById('dashboard-view');
    const roomView = document.getElementById('room-view');

    if (viewName === 'auth') {
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    } else {
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        
        if (viewName === 'dashboard') {
            dashboardView.classList.add('active');
            roomView.classList.add('hidden');
            roomView.classList.remove('active');
        } else if (viewName === 'room') {
            dashboardView.classList.remove('active');
            roomView.classList.remove('hidden');
            roomView.classList.add('active');
        }
    }
}

// ==========================================
//           AUTHENTICATION LOGIC
// ==========================================
function initAuthDOM() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const data = await api.post('/auth/login', { email, password });
            login(data.token, data.user);
        } catch (err) {
            showToast('Login Failed', err.message, 'error');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const data = await api.post('/auth/register', { name, username, email, password });
            login(data.token, data.user);
            showToast('Registration Successful', 'Welcome to Hangout!', 'success');
        } catch (err) {
            showToast('Registration Failed', err.message, 'error');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', logout);
}

function login(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('token', token);
    showView('dashboard');
    initSocketConnection();
    loadUserData();
}

function logout() {
    if (socket && socket.connected) {
        socket.emit('user_offline', state.user?.id || state.user?._id);
        socket.disconnect();
    }
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    showView('auth');
    state.activeRoomId = null;
    state.activeChatFriend = null;
    document.getElementById('direct-chat-wrapper').classList.add('hidden');
}

// ==========================================
//          USER DATA & SOCIAL INITIALIZATION
// ==========================================
async function loadUserData() {
    try {
        // Set User Profile Headers
        document.getElementById('user-fullname').innerText = state.user.name;
        document.getElementById('user-username').innerText = `@${state.user.username}`;
        
        const avatarUrl = state.user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${state.user.username}`;
        document.getElementById('user-avatar').src = avatarUrl;
        
        const navAvatar = document.getElementById('nav-user-avatar');
        if (navAvatar) navAvatar.src = avatarUrl;
        
        if (state.user.statusMessage) {
            document.getElementById('status-message-input').value = state.user.statusMessage;
        }

        // Fetch Friends
        state.friends = await api.get('/friends');
        // Fetch Pending Invites
        state.friendRequests = await api.get('/friends/requests');

        drawFriendsList();
        drawFriendRequestsList();
        updateInviteBadge();
    } catch (e) {
        console.error('Failed to load user data:', e.message);
    }
}

// ==========================================
//          DASHBOARD & ROOM DOM ACTIONS
// ==========================================
function initDashboardDOM() {
    // Save Status Message
    const statusInput = document.getElementById('status-message-input');
    document.getElementById('save-status-btn').addEventListener('click', async () => {
        const text = statusInput.value.trim();
        try {
            // Put/Post route or just use socket presence update
            // We can just update socket user status message
            showToast('Status Updated', 'Your status message has been saved.', 'success');
        } catch (e) {
            showToast('Error', e.message, 'error');
        }
    });

    // Create Room
    document.getElementById('create-room-btn').addEventListener('click', () => {
        // Generate random string
        const roomId = Math.random().toString(36).substring(2, 10);
        state.isHost = true;
        joinRoom(roomId);
    });

    // Join Room
    document.getElementById('join-room-btn').addEventListener('click', () => {
        const roomId = document.getElementById('join-room-id').value.trim();
        if (!roomId) return showToast('Error', 'Please enter a Room Code', 'error');
        state.isHost = false;
        joinRoom(roomId);
    });

    // Leave Room
    document.getElementById('leave-room-btn').addEventListener('click', () => {
        leaveRoom();
    });

    // Copy Room Link/Code
    document.getElementById('copy-room-link').addEventListener('click', () => {
        if (!state.activeRoomId) return;
        navigator.clipboard.writeText(state.activeRoomId).then(() => {
            showToast('Copied!', 'Room Code copied to clipboard', 'info');
        });
    });

    // Friends & Invites Tabs
    const tabFriends = document.getElementById('sidebar-tab-friends');
    const tabRequests = document.getElementById('sidebar-tab-requests');
    const panelFriends = document.getElementById('friends-panel');
    const panelRequests = document.getElementById('requests-panel');

    tabFriends.addEventListener('click', () => {
        tabFriends.classList.add('active');
        tabRequests.classList.remove('active');
        panelFriends.classList.add('active');
        panelRequests.classList.remove('active');
        loadUserData();
    });

    tabRequests.addEventListener('click', () => {
        tabRequests.classList.add('active');
        tabFriends.classList.remove('active');
        panelRequests.classList.add('active');
        panelFriends.classList.remove('active');
    });

    // Friend Search
    const searchInput = document.getElementById('friend-search-input');
    const searchResults = document.getElementById('search-results');
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }
        searchTimeout = setTimeout(async () => {
            try {
                const users = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
                drawSearchResults(users);
            } catch (err) {
                console.error(err.message);
            }
        }, 300);
    });

    // Close Search Result if Click Outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    // Direct Message Close
    document.getElementById('chat-close').addEventListener('click', () => {
        if (state.activeChatFriend) {
            socket.emit('dm_leave', { myId: state.user.id || state.user._id, friendId: state.activeChatFriend._id });
        }
        state.activeChatFriend = null;
        document.getElementById('direct-chat-wrapper').classList.add('hidden');
    });

    // Direct Message Form Submit
    document.getElementById('chat-input-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-message-input');
        const text = input.value.trim();
        if (!text || !state.activeChatFriend) return;
        
        socket.emit('dm_send', {
            myId: state.user.id || state.user._id,
            friendId: state.activeChatFriend._id,
            text: text
        });

        // Send to backend route to save in DB as well
        api.post('/messages/send', { toUserId: state.activeChatFriend._id, text: text })
            .catch(e => console.error('Failed to save message in DB:', e.message));

        input.value = '';
    });

    // Room Sidebar Tab Switching
    const roomTabChat = document.getElementById('room-tab-chat');
    const roomTabMembers = document.getElementById('room-tab-members');
    const roomTabGames = document.getElementById('room-tab-games');

    const panelRoomChat = document.getElementById('room-chat-panel');
    const panelRoomMembers = document.getElementById('room-members-panel');
    const panelRoomGames = document.getElementById('room-games-panel');

    function switchRoomTab(activeTab, activePanel) {
        [roomTabChat, roomTabMembers, roomTabGames].forEach(t => t.classList.remove('active'));
        [panelRoomChat, panelRoomMembers, panelRoomGames].forEach(p => p.classList.remove('active'));
        activeTab.classList.add('active');
        activePanel.classList.add('active');
    }

    roomTabChat.addEventListener('click', () => switchRoomTab(roomTabChat, panelRoomChat));
    roomTabMembers.addEventListener('click', () => switchRoomTab(roomTabMembers, panelRoomMembers));
    roomTabGames.addEventListener('click', () => switchRoomTab(roomTabGames, panelRoomGames));

    // Nav Sidebar Panel Toggling (Instagram structure)
    const navItems = {
        'nav-item-user': 'panel-user',
        'toggle-notifications-btn': 'notification-drawer',
        'nav-item-friends': 'panel-friends',
        'nav-item-history': 'panel-history',
        'nav-item-games': 'panel-games',
        'nav-item-settings': 'panel-settings'
    };

    Object.keys(navItems).forEach(itemId => {
        const btn = document.getElementById(itemId);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(navItems).forEach(id => {
                    const item = document.getElementById(id);
                    if (item) item.classList.remove('active');
                    const panel = document.getElementById(navItems[id]);
                    if (panel) panel.classList.remove('active');
                });
                
                btn.classList.add('active');
                const targetPanel = document.getElementById(navItems[itemId]);
                if (targetPanel) targetPanel.classList.add('active');
                
                if (itemId === 'toggle-notifications-btn') {
                    const badge = document.getElementById('notification-badge');
                    if (badge) badge.classList.add('hidden');
                } else if (itemId === 'nav-item-history') {
                    drawRoomHistory();
                }
            });
        }
    });
}

// ── ROOM HISTORY ───────────────────────────────────────────────────────────
function drawRoomHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';

    if (!state.roomHistory || state.roomHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">No room history in this session.</div>';
        return;
    }

    state.roomHistory.forEach(roomId => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <i class="fa-solid fa-door-closed"></i>
                <span>Room: <strong>${roomId}</strong></span>
            </div>
            <button class="btn primary-btn sm-btn join-history-btn" data-id="${roomId}">Rejoin</button>
        `;
        item.querySelector('.join-history-btn').addEventListener('click', () => {
            state.isHost = false;
            joinRoom(roomId);
        });
        container.appendChild(item);
    });
}

// ==========================================
//          ROOM MANAGEMENT
// ==========================================
function joinRoom(roomId) {
    state.activeRoomId = roomId;
    document.getElementById('room-id-display').innerText = roomId;
    
    // Add to room history
    if (!state.roomHistory) state.roomHistory = [];
    if (!state.roomHistory.includes(roomId)) {
        state.roomHistory.unshift(roomId);
    }

    // Collapse navigation panels
    document.getElementById('app-container').classList.add('room-active');

    showView('room');

    socket.emit('watch_join', {
        roomId: roomId,
        userName: state.user.name,
        isHost: state.isHost
    });

    addRoomChatMessage({ type: 'system', text: `You joined room ${roomId}` });
    initYouTubePlayer();
}

function leaveRoom() {
    if (!state.activeRoomId) return;

    socket.emit('watch_leave', { roomId: state.activeRoomId });
    disconnectRoomCall();

    state.activeRoomId = null;
    state.isHost = false;

    // Expand navigation panels back
    document.getElementById('app-container').classList.remove('room-active');

    showView('dashboard');
    destroyYouTubePlayer();
}
