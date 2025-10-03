const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Data store file
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if it doesn't exist
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData = {
      messages: [
        { id: 1, text: 'WELCOME TO SOLARI BOARD', enabled: true },
        { id: 2, text: 'CLASSIC SPLIT-FLAP DISPLAY', enabled: true },
        { id: 3, text: 'CONFIGURE VIA ADMIN PANEL', enabled: true }
      ],
      settings: {
        rotationInterval: 10000, // milliseconds
        currentMessageIndex: 0
      }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

// Read data from file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    initDataFile();
    return readData();
  }
}

// Write data to file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// Initialize
initDataFile();

// Create two Express apps
const displayApp = express();
const adminApp = express();

// Middleware
displayApp.use(cors());
displayApp.use(express.static(path.join(__dirname, 'public/display')));

adminApp.use(cors());
adminApp.use(bodyParser.json());
adminApp.use(express.static(path.join(__dirname, 'public/admin')));

// ======================
// DISPLAY APP ROUTES (Port 3000)
// ======================

// Get current message to display
displayApp.get('/api/current-message', (req, res) => {
  const data = readData();
  const enabledMessages = data.messages.filter(m => m.enabled);
  
  if (enabledMessages.length === 0) {
    return res.json({ text: 'NO MESSAGES CONFIGURED' });
  }
  
  const currentIndex = data.settings.currentMessageIndex % enabledMessages.length;
  res.json({
    text: enabledMessages[currentIndex].text,
    rotationInterval: data.settings.rotationInterval
  });
});

// Rotate to next message
displayApp.post('/api/next-message', (req, res) => {
  const data = readData();
  const enabledMessages = data.messages.filter(m => m.enabled);
  
  if (enabledMessages.length > 0) {
    data.settings.currentMessageIndex = (data.settings.currentMessageIndex + 1) % enabledMessages.length;
    writeData(data);
  }
  
  res.json({ success: true });
});

// ======================
// ADMIN APP ROUTES (Port 3001)
// ======================

// Get all messages
adminApp.get('/api/messages', (req, res) => {
  const data = readData();
  res.json(data.messages);
});

// Get settings
adminApp.get('/api/settings', (req, res) => {
  const data = readData();
  res.json(data.settings);
});

// Add a new message
adminApp.post('/api/messages', (req, res) => {
  const data = readData();
  const newMessage = {
    id: Date.now(),
    text: req.body.text || '',
    enabled: req.body.enabled !== false
  };
  data.messages.push(newMessage);
  writeData(data);
  res.json(newMessage);
});

// Update a message
adminApp.put('/api/messages/:id', (req, res) => {
  const data = readData();
  const messageId = parseInt(req.params.id);
  const messageIndex = data.messages.findIndex(m => m.id === messageId);
  
  if (messageIndex === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  if (req.body.text !== undefined) {
    data.messages[messageIndex].text = req.body.text;
  }
  if (req.body.enabled !== undefined) {
    data.messages[messageIndex].enabled = req.body.enabled;
  }
  
  writeData(data);
  res.json(data.messages[messageIndex]);
});

// Delete a message
adminApp.delete('/api/messages/:id', (req, res) => {
  const data = readData();
  const messageId = parseInt(req.params.id);
  data.messages = data.messages.filter(m => m.id !== messageId);
  writeData(data);
  res.json({ success: true });
});

// Update settings
adminApp.put('/api/settings', (req, res) => {
  const data = readData();
  
  if (req.body.rotationInterval !== undefined) {
    data.settings.rotationInterval = Math.max(1000, parseInt(req.body.rotationInterval));
  }
  
  writeData(data);
  res.json(data.settings);
});

// Reset current message index
adminApp.post('/api/reset-rotation', (req, res) => {
  const data = readData();
  data.settings.currentMessageIndex = 0;
  writeData(data);
  res.json({ success: true });
});

// ======================
// START SERVERS
// ======================

const DISPLAY_PORT = process.env.DISPLAY_PORT || 3000;
const ADMIN_PORT = process.env.ADMIN_PORT || 3001;

displayApp.listen(DISPLAY_PORT, () => {
  console.log(`\n🎯 Solari Board Display running on http://localhost:${DISPLAY_PORT}`);
});

adminApp.listen(ADMIN_PORT, () => {
  console.log(`⚙️  Admin Interface running on http://localhost:${ADMIN_PORT}\n`);
});
