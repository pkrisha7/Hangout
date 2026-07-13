# 🎬 Hangout — Real-Time Social Platform & Watch Parties

> A modern, real-time social web application facilitating synchronized video watch parties, multiplayer mini-games, instant messaging, and peer-to-peer audio/video calling.

[![Stack](https://img.shields.io/badge/Stack-MERN-blue)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/RealTime-Socket.io-black?logo=socketdotio)](https://socket.io)
[![Peer-to-Peer](https://img.shields.io/badge/VideoCall-PeerJS%20%2F%20WebRTC-orange)](https://webrtc.org)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📌 Overview

Hangout is a feature-rich social platform designed to bring people together online. It enables users to connect with friends, text in real time, start high-quality voice/video calls, and create synchronized watch party rooms for sharing media experiences or playing multiplayer mini-games (like Sudoku or Tic-Tac-Toe) together.

---

## ✨ Features

### 👥 Social & Networking
- **Instant Messaging**: Group and one-on-one real-time chatting with persistent message history.
- **Friend Management**: Send, accept, or decline friend requests with real-time browser notifications.
- **Online Presence**: Track which friends are currently online/offline.

### 🎥 Watch Parties & Media
- **Synchronized Video Player**: Play, pause, or seek video files in sync across all room members.
- **Group Interactive Space**: Chat, voice call, and watch videos together simultaneously.

### 🎮 Multiplayer Mini-Games
- **Tic-Tac-Toe**: Classic multiplayer game with real-time state synchronization.
- **Sudoku**: Collaborative or head-to-head Sudoku solving in real time.

### 📞 Peer-to-Peer Calls
- **Audio & Video Calling**: Low-latency direct voice/video calling using WebRTC / PeerJS.
- **Group Calls**: Connect with multiple friends in a single virtual call room.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Axios, Context API |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Real-time** | Socket.io (WebSockets) |
| **P2P Audio/Video** | PeerJS (WebRTC wrapper) |
| **Styling** | Tailwind CSS |

---

## 🗂️ Project Structure

```
hangout/
├── client/                  # React frontend application
│   ├── public/              # Static public assets
│   └── src/
│       ├── components/      # UI components, modals, chat elements
│       ├── context/         # Auth, Socket, and Video Call context providers
│       ├── pages/           # Home, Friends, Chat, WatchParty, Login, Register
│       └── utils/           # Axios interceptors, helper methods
│
└── server/                  # Express REST API & Socket.io server
    ├── middleware/          # JWT verification & request logging
    ├── models/              # Mongoose schemas (User, Message, FriendRequest)
    ├── routes/              # Express API endpoints
    └── server.js            # Express app setup, Socket.io handlers, DB connection
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v16+
- MongoDB (local database or Atlas instance)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/pkrisha7/Hangout.git
cd Hangout

# 2. Setup and run backend
cd server
npm install

# Create a .env file and fill: PORT, MONGO_URI, JWT_SECRET
cp .env.example .env

npm start

# 3. Setup and run frontend (new terminal tab)
cd ../client
npm install
npm run dev
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new account |
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/me` | Fetch authenticated user details |

### Friends & Networking
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/friends/list` | Get list of user's active friends |
| GET | `/api/friends/requests` | List pending incoming/outgoing requests |
| POST | `/api/friends/request` | Send a new friend request |
| PUT | `/api/friends/request/:id` | Accept or reject a friend request |

### Messages & Rooms
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:friendId` | Retrieve private chat history |
| POST | `/api/messages/send` | Save and transmit a message |

---

## 🚀 Key Architectural Decisions

- **Event-Driven Sync**: Uses WebSockets (Socket.io) to broadcast video play/pause/seek events to all room members, ensuring seek delays are minimized (<100ms offset).
- **Decoupled P2P Connection**: Utilizes PeerJS to manage WebRTC connection brokering, switching to TURN/STUN servers for direct media packet flow.
- **MongoDB Change Streams**: Real-time notifications for friend requests listen to database changes for reliability across active server clusters.

---

## 👩‍💻 Author

**Krisha Pokharel**
- GitHub: [@pkrisha7](https://github.com/pkrisha7)
- LinkedIn: [Krisha Pokharel](https://www.linkedin.com/in/krisha-pokharel-18733621a)
