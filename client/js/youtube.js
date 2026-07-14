/* ==========================================================================
   HANGOUT - YOUTUBE IFRAME PLAYER & PLAYBACK SYNC
   ========================================================================== */

let ytPlayer = null;
let playlist = [];
let activePlaylistIndex = 0;
let isSyncing = false; // Flag to prevent infinite feedback loops during sync updates
let pendingVideoId = null;

// ==========================================
//          PLAYER INITIALIZATION
// ==========================================
function initYouTubePlayer() {
    // Check if YT is defined
    if (typeof YT !== 'undefined' && YT.loaded) {
        onYouTubeIframeAPIReady();
    } else {
        // Fallback: reload the script
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

// Global callback for YT API
function onYouTubeIframeAPIReady() {
    console.log('YouTube IFrame API Ready');
    
    // Check if room-view is visible and placeholder is present
    const placeholder = document.getElementById('yt-player-placeholder');
    if (!placeholder) return;

    ytPlayer = new YT.Player('yt-player-placeholder', {
        height: '100%',
        width: '100%',
        videoId: 'dQw4w9WgXcQ', // default placeholder
        playerVars: {
            'playsinline': 1,
            'controls': state.isHost ? 1 : 0, // Only host gets manual native controls, guests watch
            'disablekb': state.isHost ? 0 : 1,
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log('Player is ready');
    updatePlayerControls();
    
    if (pendingVideoId) {
        ytPlayer.loadVideoById(pendingVideoId);
        ytPlayer.playVideo();
        pendingVideoId = null;
    }
    
    // Start periodic time-sync sender if host
    setInterval(sendTimeSync, 3000);
}

function updatePlayerControls() {
    const banner = document.getElementById('host-only-banner');
    if (state.isHost) {
        banner.classList.add('hidden');
    } else {
        banner.classList.remove('hidden');
    }
}

// ==========================================
//          PLAYBACK SYNCHRONIZATION
// ==========================================
function onPlayerStateChange(event) {
    if (!state.isHost || isSyncing) return;

    // event.data matches YT.PlayerState
    // PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5
    if (event.data === YT.PlayerState.PLAYING) {
        syncSocketPlayback('play', ytPlayer.getCurrentTime());
    } else if (event.data === YT.PlayerState.PAUSED) {
        syncSocketPlayback('pause', ytPlayer.getCurrentTime());
    } else if (event.data === YT.PlayerState.ENDED) {
        // Auto-advance playlist
        socket.emit('watch_video_ended', { roomId: state.activeRoomId });
    }
}

function sendTimeSync() {
    if (!state.isHost || !ytPlayer || isSyncing) return;
    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        socket.emit('watch_time_sync', {
            roomId: state.activeRoomId,
            time: ytPlayer.getCurrentTime()
        });
    }
}

// Sync command from host to server
function syncSocketPlayback(action, time) {
    if (!state.activeRoomId) return;
    socket.emit('watch_video_sync', {
        roomId: state.activeRoomId,
        action,
        time
    });
}

// Receiver side: guest follows sync commands
function syncPlayerToVideo(videoId, playing, time) {
    if (!ytPlayer || !ytPlayer.loadVideoById) {
        pendingVideoId = videoId;
        return;
    }
    
    isSyncing = true;
    
    const currentVideoId = getYouTubeIdFromUrl(ytPlayer.getVideoUrl()) || ytPlayer.getVideoData()?.video_id;
    
    if (currentVideoId !== videoId) {
        ytPlayer.loadVideoById({
            videoId: videoId,
            startSeconds: time || 0
        });
    } else {
        const localTime = ytPlayer.getCurrentTime();
        if (Math.abs(localTime - time) > 2) {
            ytPlayer.seekTo(time, true);
        }
    }

    if (playing) {
        ytPlayer.playVideo();
    } else {
        ytPlayer.pauseVideo();
    }

    setTimeout(() => { isSyncing = false; }, 500);
}

// ==========================================
//          PLAYLIST QUEUE MANAGEMENT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-video-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('youtube-url-input');
            const url = input.value.trim();
            if (!url) return;

            const videoId = extractYouTubeId(url);
            if (!videoId) {
                return showToast('Invalid URL', 'Please paste a valid YouTube video URL or ID.', 'error');
            }

            try {
                // Get video metadata (oEmbed) to show real titles
                const title = await fetchVideoTitle(videoId);
                
                const videoItem = {
                    id: videoId,
                    title: title || `YouTube Video (${videoId})`
                };

                playlist.push(videoItem);
                input.value = '';

                // Broadcast playlist update
                if (state.activeRoomId) {
                    socket.emit('watch_playlist_update', {
                        roomId: state.activeRoomId,
                        playlist: playlist
                    });
                }
                
                // If it's the first video, auto-play it
                if (playlist.length === 1) {
                    playVideoIndex(0);
                } else {
                    drawPlaylist(playlist, activePlaylistIndex);
                }

                showToast('Video Added', videoItem.title, 'success');

            } catch (err) {
                console.error(err);
                showToast('Error', 'Failed to add video details.', 'error');
            }
        });
    }
});

async function fetchVideoTitle(videoId) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        return data.title;
    } catch (e) {
        return null;
    }
}

function drawPlaylist(updatedPlaylist, activeIndex = activePlaylistIndex) {
    playlist = updatedPlaylist || playlist;
    activePlaylistIndex = activeIndex;

    const container = document.getElementById('playlist-queue');
    container.innerHTML = '';

    if (playlist.length === 0) {
        container.innerHTML = '<div class="empty-state">No videos in queue. Paste a URL above to add one!</div>';
        return;
    }

    playlist.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = `playlist-item ${index === activePlaylistIndex ? 'active' : ''}`;
        
        item.innerHTML = `
            <span class="playlist-item-title">${video.title}</span>
            ${state.isHost ? '<button class="playlist-item-remove"><i class="fa-solid fa-trash"></i></button>' : ''}
        `;

        // Click to play (only host can trigger)
        item.addEventListener('click', (e) => {
            if (!state.isHost) {
                return showToast('Access Denied', 'Only the host can change videos.', 'error');
            }
            if (e.target.closest('.playlist-item-remove')) return;
            playVideoIndex(index);
        });

        // Click to remove (host only)
        if (state.isHost) {
            item.querySelector('.playlist-item-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeVideoIndex(index);
            });
        }

        container.appendChild(item);
    });
}

function playVideoIndex(index) {
    if (index < 0 || index >= playlist.length) return;
    activePlaylistIndex = index;
    const video = playlist[index];
    
    // Play locally
    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(video.id);
        ytPlayer.playVideo();
    } else {
        pendingVideoId = video.id;
    }

    // Broadcast change
    socket.emit('watch_video_change', {
        roomId: state.activeRoomId,
        videoId: video.id,
        index: index
    });

    drawPlaylist(playlist, index);
}

function removeVideoIndex(index) {
    playlist.splice(index, 1);
    
    // Broadcast playlist update
    socket.emit('watch_playlist_update', {
        roomId: state.activeRoomId,
        playlist: playlist
    });

    if (activePlaylistIndex === index) {
        // If we deleted the playing video, play the next one
        if (playlist.length > 0) {
            playVideoIndex(Math.min(index, playlist.length - 1));
        } else {
            // No videos left
            if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
            activePlaylistIndex = 0;
        }
    } else if (activePlaylistIndex > index) {
        activePlaylistIndex--;
    }

    drawPlaylist(playlist, activePlaylistIndex);
}

function destroyYouTubePlayer() {
    if (ytPlayer && ytPlayer.destroy) {
        ytPlayer.destroy();
        ytPlayer = null;
    }
    playlist = [];
    activePlaylistIndex = 0;
    
    // Recreate placeholder div
    const container = document.querySelector('.player-container');
    container.innerHTML = `
        <div id="yt-player-placeholder"></div>
        <div id="host-only-banner" class="host-only-banner hidden">
            <i class="fa-solid fa-crown"></i> Syncing to host's player state
        </div>
    `;
}

// Helper utilities to parse video ID
function extractYouTubeId(url) {
    // Checks standard formats, shorts, emb, and direct 11-char IDs
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    }
    // Direct ID input
    if (url.length === 11) return url;
    return null;
}

function getYouTubeIdFromUrl(url) {
    if (!url) return null;
    const regExp = /[?&]v=([^&#]*)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}
