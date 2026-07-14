/* ==========================================================================
   HANGOUT - DYNAMIC UI ACTIONS & RENDERING
   ========================================================================= */

// ==========================================
//          TOAST NOTIFICATION POPUPS
// ==========================================
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `
        <div class="toast-body">
            <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4 seconds
    const timer = setTimeout(() => {
        toast.classList.add('slide-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(timer);
        toast.classList.add('slide-out');
        setTimeout(() => toast.remove(), 300);
    });

    // Add to Notification Drawer
    addNotificationToDrawer(title, message, type);
}

// ==========================================
//          NOTIFICATION DRAWER LOGIC
// ==========================================
function initNotificationDOM() {
    const drawer = document.getElementById('notification-drawer');
    const toggleBtn = document.getElementById('toggle-notifications-btn');
    const closeBtn = document.getElementById('close-drawer-btn');

    toggleBtn.addEventListener('click', () => {
        drawer.classList.add('active');
        // Hide badge count
        document.getElementById('notification-badge').classList.add('hidden');
    });

    closeBtn.addEventListener('click', () => {
        drawer.classList.remove('active');
    });
}

function addNotificationToDrawer(title, message, type) {
    const list = document.getElementById('notification-list');
    
    // Clear empty state
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const notif = {
        title,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type
    };
    state.notifications.unshift(notif);

    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <strong class="text-glow">${notif.title}</strong>
        <p class="notif-desc">${notif.message}</p>
        <span class="notif-time">${notif.time}</span>
    `;

    list.insertBefore(item, list.firstChild);

    // Increment notification badge if drawer is not active
    const drawer = document.getElementById('notification-drawer');
    if (!drawer.classList.contains('active')) {
        const badge = document.getElementById('notification-badge');
        badge.classList.remove('hidden');
        const currentCount = parseInt(badge.innerText || '0') + 1;
        badge.innerText = currentCount;
    }
}

// ==========================================
//           FRIENDS LIST RENDERERS
// ==========================================
function drawFriendsList() {
    const container = document.getElementById('friends-list');
    container.innerHTML = '';

    if (state.friends.length === 0) {
        container.innerHTML = '<div class="empty-state">No friends yet. Search and add some above!</div>';
        return;
    }

    state.friends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.dataset.id = friend._id;

        const avatar = friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.username}`;
        const statusClass = friend.status || 'offline';
        const statusMsg = friend.statusMessage || '';

        item.innerHTML = `
            <div class="friend-avatar-container ${statusClass}">
                <img src="${avatar}" alt="Avatar">
                <span class="status-dot ${statusClass}"></span>
            </div>
            <div class="friend-info">
                <h5>${friend.name}</h5>
                <p>${statusMsg || `@${friend.username}`}</p>
            </div>
            <div class="friend-actions">
                <button class="icon-btn dm-btn" title="Message"><i class="fa-solid fa-comment"></i></button>
                <button class="icon-btn call-audio-btn success-hover" title="Voice Call"><i class="fa-solid fa-phone"></i></button>
                <button class="icon-btn call-video-btn info-hover" title="Video Call"><i class="fa-solid fa-video"></i></button>
            </div>
        `;

        // Direct message action
        item.querySelector('.dm-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openDirectChat(friend);
        });

        // Call audio/video
        item.querySelector('.call-audio-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startCall(friend._id, 'audio');
        });
        item.querySelector('.call-video-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            startCall(friend._id, 'video');
        });

        // Double click item to open chat
        item.addEventListener('dblclick', () => openDirectChat(friend));

        container.appendChild(item);
    });
}

function updateFriendStatus(userId, status) {
    const friend = state.friends.find(f => f._id === userId);
    if (friend) {
        friend.status = status;
        drawFriendsList();

        // Update active direct chat header status if matching
        if (state.activeChatFriend && state.activeChatFriend._id === userId) {
            const statusEl = document.getElementById('chat-user-status');
            statusEl.innerText = status;
            statusEl.className = `status-text ${status === 'online' ? 'online' : ''}`;
        }
    }
}

// ==========================================
//          FRIEND REQUESTS RENDERERS
// ==========================================
function drawFriendRequestsList() {
    const container = document.getElementById('friend-requests-list');
    container.innerHTML = '';

    if (state.friendRequests.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending requests</div>';
        return;
    }

    state.friendRequests.forEach(req => {
        const item = document.createElement('div');
        item.className = 'request-item';
        const user = req.from;
        const avatar = user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`;

        item.innerHTML = `
            <div class="friend-avatar-container">
                <img src="${avatar}" alt="Avatar">
            </div>
            <div class="friend-info">
                <h5>${user.name}</h5>
                <p>@${user.username}</p>
            </div>
            <div class="notif-actions">
                <button class="btn primary-btn sm-btn accept-btn"><i class="fa-solid fa-check"></i></button>
                <button class="btn text-danger-btn sm-btn decline-btn"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;

        item.querySelector('.accept-btn').addEventListener('click', async () => {
            try {
                await api.post(`/friends/accept/${req._id}`);
                showToast('Request Accepted', `You are now friends with ${user.name}!`, 'success');
                // Emit socket event to notify other peer
                socket.emit('friend_request_accepted', { toUserId: user._id, acceptedBy: state.user });
                loadUserData();
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
        });

        item.querySelector('.decline-btn').addEventListener('click', async () => {
            try {
                await api.post(`/friends/decline/${req._id}`);
                showToast('Request Declined', `Declined friend request from ${user.name}`, 'info');
                loadUserData();
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
        });

        container.appendChild(item);
    });
}

function updateInviteBadge() {
    const badge = document.getElementById('invite-badge');
    const count = state.friendRequests.length;
    if (count > 0) {
        badge.innerText = count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ==========================================
//          SEARCH RESULTS RENDERING
// ==========================================
function drawSearchResults(users) {
    const results = document.getElementById('search-results');
    results.innerHTML = '';

    if (users.length === 0) {
        results.innerHTML = '<div class="empty-state">No users found</div>';
        results.classList.remove('hidden');
        return;
    }

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'search-user-item';
        const avatar = user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`;
        
        // Check friend status
        const isFriend = state.friends.some(f => f._id === user._id);

        item.innerHTML = `
            <div class="search-user-info">
                <img src="${avatar}" alt="Avatar">
                <div class="search-user-details">
                    <h5>${user.name}</h5>
                    <span>@${user.username}</span>
                </div>
            </div>
            ${isFriend 
                ? '<span class="badge" style="background: rgba(0, 255, 102, 0.1); color: var(--status-online); border: 1px solid var(--status-online);">Friend</span>'
                : `<button class="btn primary-btn sm-btn add-btn" data-id="${user._id}"><i class="fa-solid fa-user-plus"></i> Add</button>`
            }
        `;

        if (!isFriend) {
            item.querySelector('.add-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const id = btn.dataset.id;
                try {
                    await api.post(`/friends/request/${id}`);
                    showToast('Request Sent', 'Friend request has been delivered.', 'success');
                    // Notify peer via Socket.io
                    socket.emit('friend_request_sent', { toUserId: id, fromUser: state.user });
                    results.classList.add('hidden');
                    document.getElementById('friend-search-input').value = '';
                } catch (err) {
                    showToast('Error', err.message, 'error');
                }
            });
        }

        results.appendChild(item);
    });

    results.classList.remove('hidden');
}

// ==========================================
//        DIRECT CHAT BOX RENDERING
// ==========================================
async function openDirectChat(friend) {
    state.activeChatFriend = friend;
    
    // Draw Chat Window
    const chatWrapper = document.getElementById('direct-chat-wrapper');
    document.getElementById('chat-user-avatar').src = friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.username}`;
    document.getElementById('chat-user-name').innerText = friend.name;
    
    const statusText = document.getElementById('chat-user-status');
    statusText.innerText = friend.status || 'offline';
    statusText.className = `status-text ${friend.status === 'online' ? 'online' : ''}`;

    chatWrapper.classList.remove('hidden');
    
    // Load chat history from DB
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.innerHTML = '<div class="empty-state">Loading chat history...</div>';

    try {
        const { messages } = await api.get(`/messages/conversation/${friend._id}`);
        chatContainer.innerHTML = '';
        
        messages.forEach(msg => {
            appendDirectMessage(msg);
        });

        // Connect room socket
        socket.emit('dm_join', { myId: state.user.id || state.user._id, friendId: friend._id });
        
        scrollChatToBottom();
    } catch (e) {
        console.error('Failed to load chat history:', e.message);
        chatContainer.innerHTML = '<div class="empty-state">Failed to load chat history.</div>';
    }
}

function appendDirectMessage(msg) {
    const chatContainer = document.getElementById('chat-messages');
    
    // Check if empty state exists
    const emptyState = chatContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const bubble = document.createElement('div');
    const myId = state.user.id || state.user._id;
    const isSender = msg.from === myId || msg.senderId === myId;
    
    bubble.className = `message-bubble ${isSender ? 'outgoing' : 'incoming'}`;
    bubble.innerText = msg.text;

    chatContainer.appendChild(bubble);
    scrollChatToBottom();
}

function scrollChatToBottom() {
    const chatContainer = document.getElementById('chat-messages');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
