# API Integration Guide

This guide explains how to add third-party API integrations to your Solari Board, starting with Spotify as an example.

## Architecture Overview

The application is designed with extensibility in mind:

```
Display (Port 3000) ← REST API ← Server ← API Integrations → External Services
Admin (Port 3001)   ←          ←        ←                  
```

## Adding a New Integration (Spotify Example)

### Step 1: Install Additional Dependencies

```bash
npm install axios dotenv
```

For Spotify specifically, you might want:
```bash
npm install spotify-web-api-node
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/callback/spotify
```

Update `server.js` to load environment variables:

```javascript
require('dotenv').config();
```

### Step 3: Create an Integration Module

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
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Get authorization URL
  getAuthUrl() {
    const scopes = ['user-read-currently-playing', 'user-read-playback-state'];
    return this.spotifyApi.createAuthorizeURL(scopes, 'state');
  }

  // Exchange code for tokens
  async authorize(code) {
    const data = await this.spotifyApi.authorizationCodeGrant(code);
    this.accessToken = data.body['access_token'];
    this.refreshToken = data.body['refresh_token'];
    this.spotifyApi.setAccessToken(this.accessToken);
    this.spotifyApi.setRefreshToken(this.refreshToken);
    return { success: true };
  }

  // Get currently playing track
  async getCurrentlyPlaying() {
    if (!this.accessToken) {
      return { text: 'SPOTIFY NOT CONNECTED', artist: '', track: '' };
    }

    try {
      // Refresh token if needed
      const data = await this.spotifyApi.refreshAccessToken();
      this.accessToken = data.body['access_token'];
      this.spotifyApi.setAccessToken(this.accessToken);

      // Get current track
      const response = await this.spotifyApi.getMyCurrentPlayingTrack();
      
      if (!response.body || !response.body.item) {
        return { text: 'NOTHING PLAYING', artist: '', track: '' };
      }

      const track = response.body.item;
      const artist = track.artists[0].name;
      const song = track.name;
      
      return {
        text: `♪ ${artist} - ${song}`,
        artist: artist,
        track: song,
        isPlaying: response.body.is_playing
      };
    } catch (error) {
      console.error('Spotify error:', error);
      return { text: 'SPOTIFY ERROR', artist: '', track: '' };
    }
  }

  // Format for display
  formatForDisplay() {
    // This method could be called on a timer
    return this.getCurrentlyPlaying();
  }
}

module.exports = SpotifyIntegration;
```

### Step 4: Update Server with Integration Routes

Add to `server.js`:

```javascript
const SpotifyIntegration = require('./integrations/spotify');
const spotify = new SpotifyIntegration();

// Store integration settings in data.json
function getIntegrationSettings() {
  const data = readData();
  if (!data.integrations) {
    data.integrations = {
      spotify: {
        enabled: false,
        refreshInterval: 5000 // 5 seconds
      }
    };
    writeData(data);
  }
  return data.integrations;
}

// Admin API: Get Spotify auth URL
adminApp.get('/api/integrations/spotify/auth-url', (req, res) => {
  res.json({ url: spotify.getAuthUrl() });
});

// Admin API: Spotify OAuth callback
adminApp.get('/callback/spotify', async (req, res) => {
  const code = req.query.code;
  try {
    await spotify.authorize(code);
    const data = readData();
    data.integrations.spotify.enabled = true;
    writeData(data);
    res.redirect('/');
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' });
  }
});

// Admin API: Toggle Spotify integration
adminApp.post('/api/integrations/spotify/toggle', (req, res) => {
  const data = readData();
  data.integrations.spotify.enabled = !data.integrations.spotify.enabled;
  writeData(data);
  res.json({ enabled: data.integrations.spotify.enabled });
});

// Display API: Get Spotify current track
displayApp.get('/api/spotify/current', async (req, res) => {
  const trackInfo = await spotify.getCurrentlyPlaying();
  res.json(trackInfo);
});
```

### Step 5: Update Display to Show Integration Data

Modify `/workspace/solari-app/public/display/script.js` to support different data sources:

```javascript
async loadAndDisplayMessage() {
  try {
    // Check if integrations are enabled
    const settingsResponse = await fetch('http://localhost:3001/api/settings');
    const settings = await settingsResponse.json();
    
    // If Spotify integration is enabled, fetch from there
    if (settings.integrations?.spotify?.enabled) {
      const spotifyResponse = await fetch('/api/spotify/current');
      const spotifyData = await spotifyResponse.json();
      this.displayMessage(spotifyData.text);
      
      // Refresh more frequently for live data
      const refreshInterval = settings.integrations.spotify.refreshInterval || 5000;
      setTimeout(() => this.loadAndDisplayMessage(), refreshInterval);
      return;
    }
    
    // Otherwise use regular message rotation
    const response = await fetch('/api/current-message');
    const data = await response.json();
    
    this.rotationInterval = data.rotationInterval || 10000;
    this.displayMessage(data.text || 'NO MESSAGE');
    
    setTimeout(() => this.rotateToNextMessage(), this.rotationInterval);
    
  } catch (error) {
    console.error('Error loading message:', error);
    this.displayMessage('CONNECTION ERROR');
  }
}
```

### Step 6: Add Admin UI for Integration

Update `/workspace/solari-app/public/admin/index.html` to include integration controls:

```html
<!-- Add this panel after the settings panel -->
<div class="panel">
    <h2>🎵 Spotify Integration</h2>
    <div id="spotifyStatus" class="integration-status">
        <p>Status: <span id="spotifyStatusText">Disconnected</span></p>
        <button class="btn btn-primary" onclick="admin.connectSpotify()">
            Connect Spotify
        </button>
        <button class="btn btn-secondary" onclick="admin.toggleSpotify()">
            Toggle On/Off
        </button>
    </div>
    <div class="form-group">
        <label>Refresh Interval (seconds)</label>
        <input type="number" id="spotifyRefresh" value="5" min="1" max="60">
    </div>
</div>
```

Add methods to admin script:

```javascript
async connectSpotify() {
    const response = await fetch('/api/integrations/spotify/auth-url');
    const data = await response.json();
    window.open(data.url, '_blank');
}

async toggleSpotify() {
    const response = await fetch('/api/integrations/spotify/toggle', {
        method: 'POST'
    });
    const data = await response.json();
    this.showToast(`Spotify ${data.enabled ? 'enabled' : 'disabled'}!`, 'success');
    this.loadIntegrationStatus();
}
```

## Other Integration Examples

### Weather Integration

```javascript
// integrations/weather.js
const axios = require('axios');

class WeatherIntegration {
  async getCurrentWeather(zipCode) {
    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zipCode}&appid=${apiKey}&units=imperial`;
    
    const response = await axios.get(url);
    const temp = Math.round(response.data.main.temp);
    const condition = response.data.weather[0].main;
    
    return {
      text: `WEATHER: ${temp}°F ${condition.toUpperCase()}`
    };
  }
}
```

### Calendar Integration (Google Calendar)

```javascript
// integrations/calendar.js
const { google } = require('googleapis');

class CalendarIntegration {
  async getNextEvent() {
    // Initialize Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: this.auth });
    
    const now = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    const event = response.data.items[0];
    if (event) {
      const startTime = new Date(event.start.dateTime || event.start.date);
      return {
        text: `NEXT: ${event.summary} AT ${startTime.toLocaleTimeString()}`
      };
    }
    
    return { text: 'NO UPCOMING EVENTS' };
  }
}
```

### News Integration

```javascript
// integrations/news.js
const axios = require('axios');

class NewsIntegration {
  async getTopHeadline() {
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    
    const response = await axios.get(url);
    const article = response.data.articles[0];
    
    return {
      text: `BREAKING: ${article.title.toUpperCase()}`
    };
  }
}
```

## Integration Best Practices

1. **Error Handling**: Always provide fallback messages when APIs fail
2. **Rate Limiting**: Respect API rate limits (cache responses when appropriate)
3. **Authentication**: Store tokens securely (consider using a proper secrets manager in production)
4. **Refresh Logic**: Different integrations need different refresh intervals
   - Spotify: 5-10 seconds (live playback)
   - Weather: 10-15 minutes
   - News: 5-10 minutes
   - Calendar: 1-5 minutes

5. **User Configuration**: Allow users to:
   - Enable/disable integrations
   - Set refresh intervals
   - Configure which data to display
   - Set fallback messages

6. **Multiple Integrations**: Consider rotating between multiple active integrations

## Getting API Keys

### Spotify
1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Copy Client ID and Client Secret
4. Add redirect URI: `http://localhost:3001/callback/spotify`

### OpenWeatherMap
1. Go to https://openweathermap.org/api
2. Sign up for free API key
3. Copy API key

### News API
1. Go to https://newsapi.org/
2. Sign up for free API key
3. Copy API key

## Testing Integrations

```bash
# Test Spotify endpoint
curl http://localhost:3000/api/spotify/current

# Test Weather endpoint
curl http://localhost:3000/api/weather/current

# View integration settings
curl http://localhost:3001/api/integrations
```

## Production Considerations

1. **Environment Variables**: Use proper secret management
2. **Token Storage**: Store OAuth tokens in a database, not just in memory
3. **Error Recovery**: Implement retry logic with exponential backoff
4. **Monitoring**: Log integration failures and monitor API health
5. **Graceful Degradation**: Fall back to manual messages if integrations fail

## Future Integration Ideas

- GitHub commit activity
- Stock prices
- Sports scores
- Public transit arrivals (real transit data!)
- RSS feeds
- Social media mentions
- Package delivery tracking
- Meeting room availability
- Server status/uptime
- Currency exchange rates
