const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

// Initialize the Express app
const app = express();
const PORT = 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from the 'public' directory
// This automatically serves index.html when you visit the root URL
app.use(express.static(path.join(__dirname, 'public')));

// Also serve root files for controller.html
app.use(express.static(__dirname));

// Optional: Explicitly handle the root route (though express.static handles it)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: Handle controller route
app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// ========== SOCKET.IO LOGIC ==========
// Store current state
let currentState = {
    lowerThird: {
        visible: false,
        heading: 'Repentance & Holiness',
        headline: 'CITY MEGA CHURCH SUNDAY SERVICE',
        scrollMessages: [
            "For more information please contact Bishop Dr.JJ on 0700727435",
            "repentandpreparetheway.org",
            "City Mega Church Livestream",
            "God Bless You",
            "Thank you for watching"
        ]
    },
    scripture: {
        visible: false
    },
    speaker: {
        visible: false
    }
};

io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);

    // Send current state to newly connected client
    socket.emit('currentState', currentState);

    // ========== LOWER THIRD CONTROLS ==========
    socket.on('updateLowerThird', (data) => {
        console.log('📺 Update Lower Third:', data);
        currentState.lowerThird = {
            ...currentState.lowerThird,
            heading: data.heading,
            headline: data.headline,
            scrollMessages: data.scrollMessages,
            visible: true
        };
        // Broadcast to all clients (including sender)
        io.emit('updateLowerThird', data);
    });

    socket.on('hideLowerThird', () => {
        console.log('📺 Hide Lower Third');
        currentState.lowerThird.visible = false;
        io.emit('hideLowerThird');
    });

    // ========== SCRIPTURE CONTROLS ==========
    socket.on('showScripture', (data) => {
        console.log('📖 Show Scripture:', data);
        currentState.scripture.visible = true;
        io.emit('showScripture', data);
    });

    socket.on('hideScripture', () => {
        console.log('📖 Hide Scripture');
        currentState.scripture.visible = false;
        io.emit('hideScripture');
    });

    // ========== SPEAKER CONTROLS ==========
    socket.on('showSpeaker', (data) => {
        console.log('🎤 Show Speaker:', data);
        currentState.speaker.visible = true;
        io.emit('showSpeaker', data);
    });

    socket.on('hideSpeaker', () => {
        console.log('🎤 Hide Speaker');
        currentState.speaker.visible = false;
        io.emit('hideSpeaker');
    });

    socket.on('speakerAutoHidden', () => {
        console.log('🎤 Speaker auto-hidden (5s timeout)');
        currentState.speaker.visible = false;
        // Notify control panel to update button state
        socket.broadcast.emit('speakerAutoHidden');
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`✅ Server is running successfully!`);
    console.log(`📍 Broadcast display: http://localhost:${PORT}`);
    console.log(`🎮 Control panel: http://localhost:${PORT}/controller`);
    console.log(`📂 Serving files from: ${path.join(__dirname, 'public')}`);
});
