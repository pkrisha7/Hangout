// ── server/routes/messages.js ─────────────────────────────────────────────
// Add to your Express app: app.use('/api/messages', require('./routes/messages'));

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // your existing auth middleware
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// GET /api/messages/conversations
router.get('/conversations', auth, async(req, res) => {
    try {
        const convs = await Conversation.find({ participants: req.user.id })
            .populate('participants', 'name username status')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });
        res.json(convs);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// GET /api/messages/conversation/:userId
router.get('/conversation/:userId', auth, async(req, res) => {
    try {
        let conv = await Conversation.findOne({
            participants: { $all: [req.user.id, req.params.userId] }
        });

        if (!conv) {
            // Return empty conversation ID
            return res.json({ conversationId: null, messages: [] });
        }

        const messages = await Message.find({ conversationId: conv._id })
            .sort({ createdAt: 1 })
            .limit(100);

        res.json({ conversationId: conv._id, messages });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// POST /api/messages/send
router.post('/send', auth, async(req, res) => {
    try {
        const { toUserId, text } = req.body;
        if (!text || !toUserId) return res.status(400).json({ message: 'Missing fields' });

        // Find or create conversation
        let conv = await Conversation.findOne({
            participants: { $all: [req.user.id, toUserId] }
        });

        if (!conv) {
            conv = new Conversation({ participants: [req.user.id, toUserId] });
            await conv.save();
        }

        const msg = new Message({
            conversationId: conv._id,
            senderId: req.user.id,
            text,
            createdAt: new Date(),
        });
        await msg.save();

        // Update conversation's lastMessage
        conv.lastMessage = msg._id;
        conv.updatedAt = new Date();
        await conv.save();

        // Emit via socket (server-side — requires access to io)
        // If you have io accessible: io.to(targetSocketId).emit('dm_message', msg)
        // Otherwise the socket.on('dm_send') handler in sockets/index.js handles it

        res.json({...msg.toObject(), conversationId: conv._id });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;


// ══════════════════════════════════════════════════════════════════════════════
// ── server/models/Message.js ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
/*
const mongoose = require('mongoose');
const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Message', MessageSchema);
*/

// ══════════════════════════════════════════════════════════════════════════════
// ── server/models/Conversation.js ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
/*
const mongoose = require('mongoose');
const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Conversation', ConversationSchema);
*/


// ══════════════════════════════════════════════════════════════════════════════
// ── AUTH FIX — common issues ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
//
// MOST COMMON CAUSE of "Login failed" with no clear error:
//
// 1. CORS — your server needs:
//    app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
//    Also in your axios instance (utils/api.js): { withCredentials: true }
//
// 2. JWT secret mismatch — make sure .env has JWT_SECRET set and server uses it
//    In your auth route: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
//
// 3. bcrypt compare — make sure you're comparing correctly:
//    const isMatch = await bcrypt.compare(password, user.password);
//    (NOT user.password.compare(password))
//
// 4. Token not being sent — your api.js interceptor should add it:
//    api.interceptors.request.use(config => {
//      const token = localStorage.getItem('token');
//      if (token) config.headers.Authorization = 'Bearer ' + token;
//      return config;
//    });
//
// 5. "Stay logged in" — store token in localStorage and restore on load:
//    In AuthContext useEffect:
//      const token = localStorage.getItem('token');
//      if (token) { api.defaults.headers.Authorization = 'Bearer ' + token; fetchUser(); }