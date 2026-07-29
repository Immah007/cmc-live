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
        visible: true,
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
        visible: false,
        ref: '',
        text: '',
        version: 'KJV'
    },
    speaker: {
        visible: false,
        role: 'NOW MINISTERING',
        name: 'Bishop Jason'
    },
    giving: {
        visible: false
    },
    lyrics: {
        visible: false,
        currentIndex: 0,
        totalChunks: 0,
        chunks: []
    },
    lowerThirdToggleState: true
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
        currentState.scripture.ref = data.ref;
        currentState.scripture.text = data.text;
        currentState.scripture.version = data.version || 'KJV';
        currentState.lowerThird.visible = false;
        io.emit('showScripture', data);
    });

    socket.on('hideScripture', () => {
        console.log('📖 Hide Scripture');
        currentState.scripture.visible = false;
        io.emit('hideScripture');
        
        if (currentState.lowerThirdToggleState && !currentState.speaker.visible && !currentState.giving.visible && !currentState.lyrics.visible) {
            setTimeout(() => {
                currentState.lowerThird.visible = true;
                io.emit('showLowerThird');
            }, 200);
        }
    });

    socket.on('refreshScripture', (data) => {
        console.log('📖 Refresh Scripture:', data);
        if (currentState.scripture.visible) {
            currentState.scripture.ref = data.ref;
            currentState.scripture.text = data.text;
            currentState.scripture.version = data.version || 'KJV';
            io.emit('refreshScripture', data);
        }
    });

    // ========== SPEAKER CONTROLS ==========
    socket.on('showSpeaker', (data) => {
        console.log('🎤 Show Speaker:', data);
        currentState.speaker.visible = true;
        currentState.speaker.role = data.role;
        currentState.speaker.name = data.name;
        currentState.lowerThird.visible = false;
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
        
        if (currentState.lowerThirdToggleState && !currentState.scripture.visible && !currentState.giving.visible && !currentState.lyrics.visible) {
            setTimeout(() => {
                currentState.lowerThird.visible = true;
                io.emit('showLowerThird');
            }, 200);
        }
    });

    // ========== GIVING CONTROLS ==========
    socket.on('showGiving', () => {
        console.log('💰 Show Giving');
        currentState.giving.visible = true;
        currentState.lowerThird.visible = false;
        io.emit('showGiving');
    });

    socket.on('hideGiving', () => {
        console.log('💰 Hide Giving');
        currentState.giving.visible = false;
        io.emit('hideGiving');
        
        if (currentState.lowerThirdToggleState && !currentState.scripture.visible && !currentState.speaker.visible && !currentState.lyrics.visible) {
            setTimeout(() => {
                currentState.lowerThird.visible = true;
                io.emit('showLowerThird');
            }, 200);
        }
    });

    // ========== LYRICS CONTROLS ==========
    socket.on('showLyrics', (data) => {
        console.log('🎵 Show Lyrics:', data);
        currentState.lyrics.visible = true;
        currentState.lyrics.chunks = data.chunks || [];
        currentState.lyrics.currentIndex = data.currentIndex || 0;
        currentState.lyrics.totalChunks = data.chunks ? data.chunks.length : 0;
        currentState.lowerThird.visible = false;
        io.emit('showLyrics', data);
    });

    socket.on('hideLyrics', () => {
        console.log('🎵 Hide Lyrics');
        currentState.lyrics.visible = false;
        io.emit('hideLyrics');
        
        if (currentState.lowerThirdToggleState && !currentState.scripture.visible && !currentState.speaker.visible && !currentState.giving.visible) {
            setTimeout(() => {
                currentState.lowerThird.visible = true;
                io.emit('showLowerThird');
            }, 3000); // 3 second delay for lyrics
        }
    });

    socket.on('nextLyric', () => {
        if (currentState.lyrics.currentIndex < currentState.lyrics.totalChunks - 1) {
            currentState.lyrics.currentIndex++;
            io.emit('updateLyricIndex', {
                currentIndex: currentState.lyrics.currentIndex,
                text: currentState.lyrics.chunks[currentState.lyrics.currentIndex]
            });
        }
    });

    socket.on('previousLyric', () => {
        if (currentState.lyrics.currentIndex > 0) {
            currentState.lyrics.currentIndex--;
            io.emit('updateLyricIndex', {
                currentIndex: currentState.lyrics.currentIndex,
                text: currentState.lyrics.chunks[currentState.lyrics.currentIndex]
            });
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
