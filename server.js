const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Load Bible data
let bibleData = null;
try {
    const biblePath = path.join(__dirname, 'public', 'bibles', 'kjv.json');
    if (fs.existsSync(biblePath)) {
        const bibleRaw = fs.readFileSync(biblePath, 'utf8');
        bibleData = JSON.parse(bibleRaw);
        console.log('📖 KJV Bible loaded');
    }
} catch (error) {
    console.error('Bible load error:', error.message);
}

// API
app.get('/api/bible', (req, res) => {
    if (bibleData) res.json(bibleData);
    else res.status(500).json({ error: 'Bible data not available' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/controller', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'controller.html'));
});

// State management
let currentState = {
    lowerThird: {
        visible: true,
        manuallyHidden: false,
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
        ref: 'John 3:16',
        text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
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
        chunks: [],
        currentText: ''
    }
};

// Helper functions
function broadcastState() {
    io.emit('visibilityState', {
        lowerThird: currentState.lowerThird.visible,
        scripture: currentState.scripture.visible,
        speaker: currentState.speaker.visible,
        giving: currentState.giving.visible,
        lyrics: currentState.lyrics.visible,
        lowerThirdManuallyHidden: currentState.lowerThird.manuallyHidden
    });
}

function hideLowerThirdIfNeeded() {
    if (currentState.lowerThird.visible) {
        currentState.lowerThird.visible = false;
        io.emit('hideLowerThird');
    }
}

function showLowerThirdIfAllowed() {
    if (!currentState.lowerThird.manuallyHidden && 
        !currentState.scripture.visible && 
        !currentState.speaker.visible && 
        !currentState.giving.visible && 
        !currentState.lyrics.visible) {
        currentState.lowerThird.visible = true;
        io.emit('showLowerThird');
    }
}

// Socket.IO
io.on('connection', (socket) => {
    console.log('🟢 Connected:', socket.id);
    
    // Send current state
    socket.emit('currentState', {
        lowerThird: currentState.lowerThird,
        scripture: currentState.scripture,
        speaker: currentState.speaker,
        giving: currentState.giving,
        lyrics: currentState.lyrics
    });
    
    broadcastState();

    // ============ LOWER THIRD ============
    socket.on('updateLowerThird', (data) => {
        currentState.lowerThird.heading = data.heading;
        currentState.lowerThird.headline = data.headline;
        currentState.lowerThird.scrollMessages = data.scrollMessages;
        currentState.lowerThird.manuallyHidden = false;
        
        // Hide everything else
        if (currentState.scripture.visible) {
            currentState.scripture.visible = false;
            io.emit('hideScripture');
        }
        if (currentState.speaker.visible) {
            currentState.speaker.visible = false;
            io.emit('hideSpeaker');
        }
        if (currentState.giving.visible) {
            currentState.giving.visible = false;
            io.emit('hideGiving');
        }
        if (currentState.lyrics.visible) {
            currentState.lyrics.visible = false;
            io.emit('hideLyrics');
        }
        
        currentState.lowerThird.visible = true;
        io.emit('updateLowerThird', data);
        broadcastState();
    });

    socket.on('toggleLowerThird', () => {
        if (currentState.lowerThird.visible) {
            currentState.lowerThird.visible = false;
            currentState.lowerThird.manuallyHidden = true;
            io.emit('hideLowerThird');
        } else {
            // Hide others first
            if (currentState.scripture.visible) {
                currentState.scripture.visible = false;
                io.emit('hideScripture');
            }
            if (currentState.speaker.visible) {
                currentState.speaker.visible = false;
                io.emit('hideSpeaker');
            }
            if (currentState.giving.visible) {
                currentState.giving.visible = false;
                io.emit('hideGiving');
            }
            if (currentState.lyrics.visible) {
                currentState.lyrics.visible = false;
                io.emit('hideLyrics');
            }
            
            currentState.lowerThird.visible = true;
            currentState.lowerThird.manuallyHidden = false;
            io.emit('updateLowerThird', {
                heading: currentState.lowerThird.heading,
                headline: currentState.lowerThird.headline,
                scrollMessages: currentState.lowerThird.scrollMessages
            });
        }
        broadcastState();
    });

    socket.on('hideLowerThird', () => {
        currentState.lowerThird.visible = false;
        currentState.lowerThird.manuallyHidden = true;
        io.emit('hideLowerThird');
        broadcastState();
    });

    socket.on('showLowerThird', () => {
        currentState.lowerThird.manuallyHidden = false;
        showLowerThirdIfAllowed();
        broadcastState();
    });

    // ============ SCRIPTURE ============
    socket.on('showScripture', (data) => {
        currentState.scripture.ref = data.ref;
        currentState.scripture.text = data.text;
        currentState.scripture.version = data.version || 'KJV';
        
        hideLowerThirdIfNeeded();
        if (currentState.speaker.visible) {
            currentState.speaker.visible = false;
            io.emit('hideSpeaker');
        }
        if (currentState.giving.visible) {
            currentState.giving.visible = false;
            io.emit('hideGiving');
        }
        if (currentState.lyrics.visible) {
            currentState.lyrics.visible = false;
            io.emit('hideLyrics');
        }
        
        currentState.scripture.visible = true;
        io.emit('showScripture', data);
        broadcastState();
    });

    socket.on('hideScripture', () => {
        currentState.scripture.visible = false;
        io.emit('hideScripture');
        broadcastState();
        
        setTimeout(() => showLowerThirdIfAllowed(), 200);
        setTimeout(() => broadcastState(), 1500);
    });

    socket.on('refreshScripture', (data) => {
        currentState.scripture.ref = data.ref;
        currentState.scripture.text = data.text;
        currentState.scripture.version = data.version || 'KJV';
        if (currentState.scripture.visible) {
            io.emit('refreshScripture', data);
        }
    });

    // ============ SPEAKER ============
    socket.on('showSpeaker', (data) => {
        currentState.speaker.role = data.role;
        currentState.speaker.name = data.name;
        
        hideLowerThirdIfNeeded();
        if (currentState.scripture.visible) {
            currentState.scripture.visible = false;
            io.emit('hideScripture');
        }
        if (currentState.giving.visible) {
            currentState.giving.visible = false;
            io.emit('hideGiving');
        }
        if (currentState.lyrics.visible) {
            currentState.lyrics.visible = false;
            io.emit('hideLyrics');
        }
        
        currentState.speaker.visible = true;
        io.emit('showSpeaker', data);
        broadcastState();
    });

    socket.on('hideSpeaker', () => {
        currentState.speaker.visible = false;
        io.emit('hideSpeaker');
        broadcastState();
        
        setTimeout(() => showLowerThirdIfAllowed(), 200);
        setTimeout(() => broadcastState(), 1500);
    });

    socket.on('speakerAutoHidden', () => {
        currentState.speaker.visible = false;
        socket.broadcast.emit('speakerAutoHidden');
        broadcastState();
        
        setTimeout(() => showLowerThirdIfAllowed(), 200);
        setTimeout(() => broadcastState(), 1500);
    });

    // ============ GIVING ============
    socket.on('showGiving', () => {
        hideLowerThirdIfNeeded();
        if (currentState.scripture.visible) {
            currentState.scripture.visible = false;
            io.emit('hideScripture');
        }
        if (currentState.speaker.visible) {
            currentState.speaker.visible = false;
            io.emit('hideSpeaker');
        }
        if (currentState.lyrics.visible) {
            currentState.lyrics.visible = false;
            io.emit('hideLyrics');
        }
        
        currentState.giving.visible = true;
        io.emit('showGiving');
        broadcastState();
    });

    socket.on('hideGiving', () => {
        currentState.giving.visible = false;
        io.emit('hideGiving');
        broadcastState();
        
        setTimeout(() => showLowerThirdIfAllowed(), 200);
        setTimeout(() => broadcastState(), 1500);
    });

    // ============ LYRICS ============
    socket.on('showLyrics', (data) => {
        currentState.lyrics.chunks = data.chunks || [];
        currentState.lyrics.currentIndex = data.currentIndex || 0;
        currentState.lyrics.totalChunks = data.chunks ? data.chunks.length : 0;
        currentState.lyrics.currentText = data.chunks ? data.chunks[data.currentIndex] || '' : '';
        
        hideLowerThirdIfNeeded();
        if (currentState.scripture.visible) {
            currentState.scripture.visible = false;
            io.emit('hideScripture');
        }
        if (currentState.speaker.visible) {
            currentState.speaker.visible = false;
            io.emit('hideSpeaker');
        }
        if (currentState.giving.visible) {
            currentState.giving.visible = false;
            io.emit('hideGiving');
        }
        
        currentState.lyrics.visible = true;
        io.emit('showLyrics', data);
        broadcastState();
    });

    socket.on('hideLyrics', () => {
        currentState.lyrics.visible = false;
        io.emit('hideLyrics');
        broadcastState();
        
        setTimeout(() => showLowerThirdIfAllowed(), 3000);
        setTimeout(() => broadcastState(), 3500);
    });

    socket.on('nextLyric', () => {
        if (currentState.lyrics.currentIndex < currentState.lyrics.totalChunks - 1) {
            currentState.lyrics.currentIndex++;
            currentState.lyrics.currentText = currentState.lyrics.chunks[currentState.lyrics.currentIndex];
            io.emit('updateLyricIndex', {
                currentIndex: currentState.lyrics.currentIndex,
                text: currentState.lyrics.currentText
            });
        }
    });

    socket.on('previousLyric', () => {
        if (currentState.lyrics.currentIndex > 0) {
            currentState.lyrics.currentIndex--;
            currentState.lyrics.currentText = currentState.lyrics.chunks[currentState.lyrics.currentIndex];
            io.emit('updateLyricIndex', {
                currentIndex: currentState.lyrics.currentIndex,
                text: currentState.lyrics.currentText
            });
        }
    });

    socket.on('blankLyrics', () => {
        io.emit('updateLyricIndex', { currentIndex: -1, text: '' });
    });

    socket.on('refreshCurrentLyric', () => {
        io.emit('updateLyricIndex', { currentIndex: -1, text: '' });
        setTimeout(() => {
            if (currentState.lyrics.visible && currentState.lyrics.chunks.length > 0) {
                io.emit('updateLyricIndex', {
                    currentIndex: currentState.lyrics.currentIndex,
                    text: currentState.lyrics.currentText
                });
            }
        }, 400);
    });

    socket.on('disconnect', () => {
        console.log('🔴 Disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Broadcast: http://localhost:${PORT}`);
    console.log(`🎮 Control: http://localhost:${PORT}/controller`);
});
