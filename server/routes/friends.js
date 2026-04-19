const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

// ── Search users ──────────────────────────────────────────────────────────────
router.get('/search', authMiddleware, async(req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim() === '') return res.json([]);

        console.log('SEARCH:', q, '| by user:', req.user.id);

        // Convert to ObjectId to ensure proper exclusion
        const myId = new mongoose.Types.ObjectId(req.user.id);

        const users = await User.find({
            $or: [
                { username: { $regex: q.trim(), $options: 'i' } },
                { name: { $regex: q.trim(), $options: 'i' } }
            ],
            _id: { $ne: myId }
        }).select('name username avatar status').limit(10);

        console.log('SEARCH RESULTS:', users.length, 'users found');
        res.json(users);
    } catch (err) {
        console.error('SEARCH ERROR:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── Get my friends list ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async(req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'name username avatar status statusMessage');
        res.json(user.friends);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Get pending friend requests ───────────────────────────────────────────────
router.get('/requests', authMiddleware, async(req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friendRequests.from', 'name username avatar');
        const pending = user.friendRequests.filter(function(r) {
            return r.status === 'pending';
        });
        res.json(pending);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Send friend request ───────────────────────────────────────────────────────
router.post('/request/:userId', authMiddleware, async(req, res) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const alreadyFriends = targetUser.friends.some(function(id) {
            return id.toString() === req.user.id.toString();
        });
        if (alreadyFriends) return res.status(400).json({ message: 'Already friends' });

        const alreadyRequested = targetUser.friendRequests.find(function(r) {
            return r.from.toString() === req.user.id.toString() && r.status === 'pending';
        });
        if (alreadyRequested) return res.status(400).json({ message: 'Request already sent' });

        targetUser.friendRequests.push({ from: req.user.id });
        await targetUser.save();

        // Notify via socket if target is online
        const onlineUsers = req.app.get('onlineUsers');
        const io = req.app.get('io');
        if (onlineUsers && io) {
            var targetId = req.params.userId.toString();
            var toSocketId = onlineUsers.get(targetId);
            console.log('FRIEND REQUEST | target:', targetId, '| socket:', toSocketId);
            if (toSocketId) {
                var newReq = targetUser.friendRequests[targetUser.friendRequests.length - 1];
                io.to(toSocketId).emit('new_friend_request', {
                    _id: newReq._id,
                    from: {
                        _id: req.user.id,
                        name: req.user.name,
                        username: req.user.username
                    },
                    status: 'pending'
                });
            }
        }

        res.json({ message: 'Friend request sent' });
    } catch (err) {
        console.error('REQUEST ERROR:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Accept friend request ─────────────────────────────────────────────────────
router.post('/accept/:requestId', authMiddleware, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const request = user.friendRequests.id(req.params.requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'accepted';
        user.friends.push(request.from);
        await user.save();
        await User.findByIdAndUpdate(request.from, { $push: { friends: req.user.id } });

        // Notify the original sender that their request was accepted
        const onlineUsers = req.app.get('onlineUsers');
        const io = req.app.get('io');
        if (onlineUsers && io) {
            var toSocketId = onlineUsers.get(request.from.toString());
            console.log('ACCEPT | notifying sender socket:', toSocketId);
            if (toSocketId) {
                io.to(toSocketId).emit('friend_request_was_accepted', {
                    by: {
                        _id: req.user.id,
                        name: req.user.name,
                        username: req.user.username
                    }
                });
            }
        }

        res.json({ message: 'Friend request accepted' });
    } catch (err) {
        console.error('ACCEPT ERROR:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Decline friend request ────────────────────────────────────────────────────
router.post('/decline/:requestId', authMiddleware, async(req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const request = user.friendRequests.id(req.params.requestId);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.status = 'declined';
        await user.save();
        res.json({ message: 'Friend request declined' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── Remove friend ─────────────────────────────────────────────────────────────
router.delete('/:friendId', authMiddleware, async(req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $pull: { friends: req.params.friendId } });
        await User.findByIdAndUpdate(req.params.friendId, { $pull: { friends: req.user.id } });
        res.json({ message: 'Friend removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;