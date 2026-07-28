const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');

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
app.use(express.static(path.join(__dirname, 'public')));

// Also serve root files for controller.html
app.use(express.static(__dirname));

// Load Bible data
let bibleData = null;
try {
    const biblePath = path.join(__dirname, 'public', 'bibles', 'kjv.json');
    const bibleRaw = fs.readFileSync(biblePath, 'utf8');
    bibleData = JSON.parse(bibleRaw);
    console.log('📖 Bible data loaded successfully');
} catch (error) {
    console.error('❌ Error loading Bible data:', error.message);
}

// API endpoint to get Bible data
app.get('/api/bible', (req, res) => {
    if (bibleData) {
        res.json(bibleData);
    } else {
        res.status(500).json({ error: 'Bible data not available' });
    }
});

// API endpoint to get specific book
app.get('/api/bible/:bookId', (req, res) => {
    if (!bibleData) {
        return res.status(500).json({ error: 'Bible data not available' });
    }
    
    const book = bibleData.books.find(b => b.bookId === parseInt(req.params.bookId));
    if (book) {
        res.json(book);
    } else {
        res.status(404).json({ error: 'Book not found' });
    }
});

// Optional: Handle root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Optional: Handle controller route
app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// ========== SOCKET.IO LOGIC ==========
let currentState = {
    lowerThird: {
        visible: true, // Start visible by default
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
    },
    lowerThirdToggleState: true // Track if user wants lower third visible
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
        currentState.lowerThirdToggleState = true;
        io.emit('updateLowerThird', data);
    });

    socket.on('hideLowerThird', () => {
        console.log('📺 Hide Lower Third');
        currentState.lowerThird.visible = false;
        currentState.lowerThirdToggleState = false;
        io.emit('hideLowerThird');
    });

    socket.on('showLowerThird', () => {
        console.log('📺 Show Lower Third');
        currentState.lowerThird.visible = true;
        currentState.lowerThirdToggleState = true;
        io.emit('showLowerThird');
    });

    // ========== SCRIPTURE CONTROLS ==========
    socket.on('showScripture', (data) => {
        console.log('📖 Show Scripture:', data);
        currentState.scripture.visible = true;
        currentState.lowerThird.visible = false; // Hide lower third when scripture shows
        io.emit('showScripture', data);
    });

    socket.on('hideScripture', () => {
        console.log('📖 Hide Scripture');
        currentState.scripture.visible = false;
        io.emit('hideScripture');
        
        // If lower third toggle is on, show it back
        if (currentState.lowerThirdToggleState) {
            currentState.lowerThird.visible = true;
            io.emit('showLowerThird');
        }
    });

    // ========== SPEAKER CONTROLS ==========
    socket.on('showSpeaker', (data) => {
        console.log('🎤 Show Speaker:', data);
        currentState.speaker.visible = true;
        currentState.lowerThird.visible = false; // Hide lower third when speaker shows
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
        socket.broadcast.emit('speakerAutoHidden');
        
        // If lower third toggle is on, show it back
        if (currentState.lowerThirdToggleState && !currentState.scripture.visible) {
            currentState.lowerThird.visible = true;
            io.emit('showLowerThird');
        }
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
