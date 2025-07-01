const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for demo (use a database in production)
const messages = {};

app.use(bodyParser.json());
app.use(express.static('public'));

// Store a secret message
app.post('/api/messages', (req, res) => {
    const { message, unlockTime, secretKey } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const generatedKey = crypto.randomBytes(12).toString('hex');
    
    messages[id] = {
        message,
        unlockTime: unlockTime || null,
        secretKey: secretKey || generatedKey,
        createdAt: new Date().getTime()
    };

    res.json({
        id,
        secretKey: generatedKey,
        unlockTime: messages[id].unlockTime
    });
});

// Retrieve a secret message
app.get('/api/messages/:id', (req, res) => {
    const { id } = req.params;
    const { secretKey } = req.query;
    
    if (!messages[id]) {
        return res.status(404).json({ error: 'Message not found' });
    }

    const messageData = messages[id];
    const now = new Date().getTime();

    // Check if message is time-locked
    if (messageData.unlockTime && now < messageData.unlockTime) {
        // Check if secret key is provided and correct
        if (!secretKey || secretKey !== messageData.secretKey) {
            return res.status(403).json({ 
                error: 'Message is time-locked',
                unlockTime: messageData.unlockTime
            });
        }
    }

    // Return the message and delete it (one-time access)
    const message = messageData.message;
    delete messages[id];
    
    res.json({ message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
