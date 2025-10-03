# Spotify Integration - Quick Start

This guide will walk you through adding Spotify "Now Playing" display to your Solari Board in about 15 minutes.

## Prerequisites

- Spotify account (free or premium)
- Your Solari Board app running
- Node.js installed

## Step 1: Install Dependencies (2 minutes)

```bash
cd /workspace/solari-app
npm install spotify-web-api-node dotenv
```

## Step 2: Get Spotify API Credentials (5 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in:
   - App name: "My Solari Board"
   - App description: "Split-flap display for currently playing music"
5. Accept terms and click "Create"
6. Click "Settings"
7. Note your **Client ID** and **Client Secret**
8. Click "Edit Settings"
9. Add Redirect URI: `http://localhost:3001/callback/spotify`
10. Save

## Step 3: Configure Environment Variables (1 minute)

Create `.env` file in `/workspace/solari-app/`:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/callback/spotify
```

Replace `your_client_id_here` and `your_client_secret_here` with your actual credentials.

## Step 4: Create Integration Module (2 minutes)

Create `/workspace/solari-app/integrations/spotify.js`:

```javascript
const SpotifyWebApi = require('spotify-web-api-node');

class SpotifyIntegration {
  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    this.isConnected = false;
  }

  getAuthUrl() {
    const scopes = ['user-read-currently-playing', 'user-read-playback-state'];
    return this.spotifyApi.createAuthorizeURL(scopes, 'spotify-auth');
  }

  async authorize(code) {
    try {
      const data = await this.spotifyApi.authorizationCodeGrant(code);
      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.spotifyApi.setRefreshToken(data.body['refresh_token']);
      this.isConnected = true;
      
      // Set up token refresh
      this.tokenRefreshInterval = setInterval(async () => {
        await this.refreshAccessToken();
      }, (data.body['expires_in'] - 300) * 1000); // Refresh 5 min before expiry
      
      return { success: true };
    } catch (error) {
      console.error('Spotify auth error:', error);
      return { success: false, error: error.message };
    }
  }

  async refreshAccessToken() {
    try {
      const data = await this.spotifyApi.refreshAccessToken();
      this.spotifyApi.setAccessToken(data.body['access_token']);
      console.log('Spotify token refreshed');
    } catch (error) {
      console.error('Token refresh error:', error);
      this.isConnected = false;
    }
  }

  async getCurrentlyPlaying() {
    if (!this.isConnected) {
      return { 
        text: 'SPOTIFY NOT CONNECTED',
        connected: false
      };
    }

    try {
      const response = await this.spotifyApi.getMyCurrentPlayingTrack();
      
      if (!response.body || !response.body.item) {
        return { 
          text: 'NOTHING PLAYING ON SPOTIFY',
          connected: true,
          playing: false
        };
      }

      const track = response.body.item;
      const artist = track.artists[0].name.toUpperCase();
      const song = track.name.toUpperCase();
      
      return {
        text: `♪ ${artist} - ${song}`,
        artist: artist,
        track: song,
        isPlaying: response.body.is_playing,
        connected: true,
        playing: true
      };
    } catch (error) {
      console.error('Spotify playback error:', error);
      
      // Try to refresh token once
      await this.refreshAccessToken();
      
      return { 
        text: 'SPOTIFY CONNECTION ERROR',
        connected: false,
        error: error.message
      };
    }
  }

  disconnect() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    this.isConnected = false;
    this.spotifyApi.resetAccessToken();
    this.spotifyApi.resetRefreshToken();
  }
}

module.exports = SpotifyIntegration;
```

## Step 5: Update Server (3 minutes)

Update `/workspace/solari-app/server.js`:

Add at the top:
```javascript
require('dotenv').config();
const SpotifyIntegration = require('./integrations/spotify');

// Initialize Spotify
const spotify = new SpotifyIntegration();
```

Add these routes before the "START SERVERS" section:

```javascript
// ======================
// SPOTIFY INTEGRATION
// ======================

// Get auth URL for Spotify
adminApp.get('/api/spotify/auth-url', (req, res) => {
  res.json({ url: spotify.getAuthUrl() });
});

// OAuth callback
adminApp.get('/callback/spotify', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  const result = await spotify.authorize(code);
  
  if (result.success) {
    // Update settings to enable Spotify
    const data = readData();
    if (!data.integrations) {
      data.integrations = {};
    }
    data.integrations.spotify = {
      enabled: true,
      refreshInterval: 5000
    };
    writeData(data);
    
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>✅ Spotify Connected!</h1>
          <p>You can close this window and return to the admin panel.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } else {
    res.status(500).send('Authorization failed: ' + result.error);
  }
});

// Get current Spotify track
displayApp.get('/api/spotify/current', async (req, res) => {
  const trackInfo = await spotify.getCurrentlyPlaying();
  res.json(trackInfo);
});

// Check Spotify connection status
adminApp.get('/api/spotify/status', (req, res) => {
  const data = readData();
  res.json({
    connected: spotify.isConnected,
    enabled: data.integrations?.spotify?.enabled || false,
    refreshInterval: data.integrations?.spotify?.refreshInterval || 5000
  });
});

// Toggle Spotify integration
adminApp.post('/api/spotify/toggle', (req, res) => {
  const data = readData();
  if (!data.integrations) {
    data.integrations = {};
  }
  if (!data.integrations.spotify) {
    data.integrations.spotify = {
      enabled: false,
      refreshInterval: 5000
    };
  }
  
  data.integrations.spotify.enabled = !data.integrations.spotify.enabled;
  writeData(data);
  
  res.json({ enabled: data.integrations.spotify.enabled });
});

// Disconnect Spotify
adminApp.post('/api/spotify/disconnect', (req, res) => {
  spotify.disconnect();
  const data = readData();
  if (data.integrations?.spotify) {
    data.integrations.spotify.enabled = false;
  }
  writeData(data);
  res.json({ success: true });
});
```

## Step 6: Update Display Client (2 minutes)

Update `/workspace/solari-app/public/display/script.js` - modify the `loadAndDisplayMessage()` method:

```javascript
async loadAndDisplayMessage() {
  try {
    // Check for Spotify integration via admin port
    const statusResponse = await fetch('http://localhost:3001/api/spotify/status');
    const status = await statusResponse.json();
    
    if (status.connected && status.enabled) {
      // Fetch from Spotify
      const spotifyResponse = await fetch('/api/spotify/current');
      const spotifyData = await spotifyResponse.json();
      
      if (spotifyData.connected && spotifyData.playing) {
        this.displayMessage(spotifyData.text);
        
        // Refresh quickly for live data
        setTimeout(() => this.loadAndDisplayMessage(), status.refreshInterval || 5000);
        return;
      }
    }
    
    // Fall back to regular message rotation
    const response = await fetch('/api/current-message');
    const data = await response.json();
    
    this.rotationInterval = data.rotationInterval || 10000;
    this.displayMessage(data.text || 'NO MESSAGE');
    
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }
    this.rotationTimer = setTimeout(() => this.rotateToNextMessage(), this.rotationInterval);
    
  } catch (error) {
    console.error('Error loading message:', error);
    this.displayMessage('CONNECTION ERROR');
    setTimeout(() => this.loadAndDisplayMessage(), 10000);
  }
}
```

## Step 7: Add Admin UI (2 minutes)

Update `/workspace/solari-app/public/admin/index.html` - add this panel in the `panel-grid` div:

```html
<!-- Spotify Integration Panel -->
<div class="panel">
    <h2>🎵 Spotify Integration</h2>
    <div id="spotifyPanel">
        <div class="form-group">
            <div class="status-indicator" id="spotifyStatus">
                <span class="status-dot offline"></span>
                <span>Not Connected</span>
            </div>
        </div>
        <div class="form-group">
            <button class="btn btn-success" onclick="admin.connectSpotify()">
                🔗 Connect Spotify
            </button>
            <button class="btn btn-secondary" onclick="admin.toggleSpotify()" id="spotifyToggle" disabled>
                ⏯️ Enable/Disable
            </button>
            <button class="btn btn-danger" onclick="admin.disconnectSpotify()" id="spotifyDisconnect" disabled>
                🔌 Disconnect
            </button>
        </div>
    </div>
</div>
```

Add this CSS to `/workspace/solari-app/public/admin/styles.css`:

```css
.status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--bg-color);
    border-radius: 8px;
    margin-bottom: 15px;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
}

.status-dot.online {
    background: var(--success-color);
}

.status-dot.offline {
    background: var(--secondary-color);
    animation: none;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

Update `/workspace/solari-app/public/admin/script.js` - add these methods to the `AdminPanel` class:

```javascript
async connectSpotify() {
    const response = await fetch('/api/spotify/auth-url');
    const data = await response.json();
    window.open(data.url, 'spotify-auth', 'width=600,height=800');
    
    // Poll for connection
    const checkConnection = setInterval(async () => {
        const status = await this.checkSpotifyStatus();
        if (status.connected) {
            clearInterval(checkConnection);
            this.showToast('Spotify connected successfully!', 'success');
        }
    }, 2000);
}

async toggleSpotify() {
    const response = await fetch('/api/spotify/toggle', { method: 'POST' });
    const data = await response.json();
    this.showToast(`Spotify ${data.enabled ? 'enabled' : 'disabled'}!`, 'success');
    await this.checkSpotifyStatus();
}

async disconnectSpotify() {
    if (!confirm('Disconnect Spotify? You will need to reconnect to use it again.')) {
        return;
    }
    
    await fetch('/api/spotify/disconnect', { method: 'POST' });
    this.showToast('Spotify disconnected', 'success');
    await this.checkSpotifyStatus();
}

async checkSpotifyStatus() {
    const response = await fetch('/api/spotify/status');
    const status = await response.json();
    
    const statusEl = document.getElementById('spotifyStatus');
    const toggleBtn = document.getElementById('spotifyToggle');
    const disconnectBtn = document.getElementById('spotifyDisconnect');
    
    if (status.connected) {
        statusEl.innerHTML = `
            <span class="status-dot online"></span>
            <span>Connected ${status.enabled ? '& Enabled' : '(Disabled)'}</span>
        `;
        toggleBtn.disabled = false;
        disconnectBtn.disabled = false;
    } else {
        statusEl.innerHTML = `
            <span class="status-dot offline"></span>
            <span>Not Connected</span>
        `;
        toggleBtn.disabled = true;
        disconnectBtn.disabled = true;
    }
    
    return status;
}
```

Update the `init()` method to check Spotify status on load:

```javascript
init() {
    this.loadSettings();
    this.loadMessages();
    this.checkSpotifyStatus();  // Add this line
    
    document.getElementById('newMessageText').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.addMessage();
        }
    });
}
```

## Step 8: Test It! (5 minutes)

1. **Restart the server:**
```bash
# Kill the old server
pkill -f "node server.js"

# Start the new server
cd /workspace/solari-app
npm start
```

2. **Open Admin Panel:**
   - Go to http://localhost:3001
   - You should see the new Spotify panel

3. **Connect Spotify:**
   - Click "Connect Spotify"
   - Log in to Spotify in the popup
   - Authorize the app
   - Popup should close automatically

4. **Start Playing Music:**
   - Open Spotify (desktop, mobile, or web)
   - Play any song

5. **Check Display:**
   - Open http://localhost:3000
   - You should see your currently playing song!

## Troubleshooting

**"Spotify Not Connected" on display:**
- Make sure you clicked "Connect Spotify" in admin panel
- Check that you authorized the app
- Verify environment variables are set correctly

**Nothing shows up:**
- Make sure music is actually playing in Spotify
- Check browser console for errors (F12)
- Verify the integration is enabled in admin panel

**"401 Unauthorized" errors:**
- Your access token may have expired
- Try disconnecting and reconnecting Spotify
- Check your Client ID and Secret are correct

**Display shows old messages:**
- Make sure Spotify integration is enabled in admin panel
- Refresh the display page (F5)
- Check network tab to see if API calls are working

## What's Next?

Now that you have Spotify working, you can:

1. **Customize the display format** - Edit the text format in `spotify.js`
2. **Add album artwork** - Extend the UI to show album covers
3. **Add more integrations** - Follow the INTEGRATION_GUIDE.md for weather, news, etc.
4. **Make it production-ready** - Store tokens in a database instead of memory

## Example Display Formats

You can customize how the song appears by editing the `getCurrentlyPlaying()` method:

```javascript
// Option 1: Simple
text: `NOW PLAYING: ${song}`

// Option 2: With artist
text: `♪ ${artist} - ${song}`

// Option 3: Detailed
text: `🎵 ${artist.toUpperCase()} | ${song.toUpperCase()}`

// Option 4: Scrolling through details
// Could rotate between artist, song, album, etc.
```

Enjoy your Spotify-connected Solari Board! 🎵
