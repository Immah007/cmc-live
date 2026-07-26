const express = require('express');
const path = require('path');

// Initialize the Express app
const app = express();
const PORT = 3000;

// Serve static files from the 'public' directory
// This automatically serves index.html when you visit the root URL
app.use(express.static(path.join(__dirname, 'public')));

// Optional: Explicitly handle the root route (though express.static handles it)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server is running successfully!`);
    console.log(`📍 Open your browser and go to: http://localhost:${PORT}`);
    console.log(`📂 Serving files from: ${path.join(__dirname, 'public')}`);
});
