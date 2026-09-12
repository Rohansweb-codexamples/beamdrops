const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Serve web assets statically out of a "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 2. API Endpoint to dynamically discover all audio files in your upload folder
app.get('/api/playlist', (req, res) => {
    const audioDir = path.join(__dirname, 'public', 'audio');
    
    // Create directory if it doesn't exist yet
    if (!fs.existsSync(audioDir)){
        fs.mkdirSync(audioDir, { recursive: true });
    }

    fs.readdir(audioDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: "Unable to scan folder" });
        }
        // Filter out non-audio files (matches mp3, wav, ogg, m4a)
        const audioTracks = files.filter(file => /\.(mp3|wav|ogg|m4a)$/i.test(file));
        res.json(audioTracks);
    });
});

app.listen(PORT, () => {
    console.log(`Audio playlist server running on port ${PORT}`);
});
