# Solari Board - Split-Flap Display

A beautiful, configurable web-based solari (split-flap) board reminiscent of classic train and airline schedules. This application features a public display view and a separate admin interface for configuration.

![Solari Board](https://img.shields.io/badge/status-ready-green)

## Features

- 🎯 **Classic Split-Flap Animation** - Authentic solari board appearance with smooth character transitions
- ⚙️ **Admin Interface** - Easy-to-use control panel on a separate port
- 🔄 **Message Rotation** - Automatically cycles through multiple messages
- ⏱️ **Configurable Timer** - Adjust how long each message displays
- 💾 **Persistent Storage** - Messages and settings saved to JSON file
- 📱 **Responsive Design** - Works on various screen sizes
- 🚀 **Ready for API Integration** - Extensible architecture for future integrations (Spotify, weather, etc.)

## Quick Start

### Installation

```bash
cd solari-app
npm install
```

### Running the Application

```bash
npm start
```

This will start two servers:

- **Display Board**: http://localhost:3000 (public view)
- **Admin Panel**: http://localhost:3001 (configuration interface)

## Usage

### Display Board (Port 3000)

The display board is the public-facing view that shows your messages with a beautiful split-flap animation. Simply open http://localhost:3000 in a browser and enjoy the display!

Features:
- Real-time clock display
- Smooth character-by-character flip animations
- Automatic message rotation
- Staggered character updates for authentic feel

### Admin Panel (Port 3001)

The admin interface at http://localhost:3001 allows you to:

1. **Add Messages** - Create new messages to display on the board
2. **Edit Messages** - Update existing message text
3. **Enable/Disable Messages** - Control which messages are in rotation
4. **Delete Messages** - Remove unwanted messages
5. **Configure Timer** - Set rotation interval (in seconds)
6. **Reset Rotation** - Jump back to the first message

## Configuration

### Message Management

- Messages are stored in `data.json`
- Each message can be individually enabled/disabled
- Messages rotate in the order they appear in the admin panel
- Only enabled messages are shown on the display

### Rotation Settings

- **Rotation Interval**: Configure how long each message displays before rotating to the next
- Default: 10 seconds
- Range: 1-300 seconds

## File Structure

```
solari-app/
├── server.js                 # Main server (handles both apps)
├── package.json             # Dependencies
├── data.json               # Message and settings storage (auto-created)
├── public/
│   ├── display/           # Display board (port 3000)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── script.js
│   └── admin/            # Admin interface (port 3001)
│       ├── index.html
│       ├── styles.css
│       └── script.js
└── README.md
```

## API Endpoints

### Display API (Port 3000)

- `GET /api/current-message` - Get the current message to display
- `POST /api/next-message` - Rotate to the next message

### Admin API (Port 3001)

- `GET /api/messages` - Get all messages
- `POST /api/messages` - Add a new message
- `PUT /api/messages/:id` - Update a message
- `DELETE /api/messages/:id` - Delete a message
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `POST /api/reset-rotation` - Reset rotation to first message

## Future Enhancements

The application is designed to be extensible for API integrations:

### Planned Integrations

1. **Spotify** - Display currently playing song and artist
2. **Weather** - Show current weather conditions
3. **News** - Display breaking news headlines
4. **Calendar** - Show upcoming events
5. **Custom APIs** - Connect to any REST API

### Architecture Notes

The server-side architecture makes it easy to add new data sources:
- Add new API endpoints in `server.js`
- Create integration modules for external services
- Update admin panel to configure integration settings
- Display will automatically show the integrated data

## Customization

### Styling

Edit the CSS files to customize the appearance:
- `/public/display/styles.css` - Display board styling
- `/public/admin/styles.css` - Admin panel styling

### Animation Timing

Adjust animation speeds in `/public/display/script.js`:
- Character flip duration: Line 50-60
- Stagger delay between characters: Line 160

### Port Configuration

Set custom ports via environment variables:

```bash
DISPLAY_PORT=8000 ADMIN_PORT=8001 npm start
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Tips

1. **Full-Screen Display** - Press F11 in your browser for an immersive display experience
2. **Multiple Displays** - Open the display URL on multiple screens simultaneously
3. **Long Messages** - Messages automatically wrap, but keep them concise for best effect
4. **Rotation Speed** - Shorter intervals (5-10s) work well for brief messages, longer for detailed info

## Troubleshooting

**Messages not updating?**
- Check that messages are enabled in the admin panel
- Ensure at least one message is enabled
- Try resetting the rotation

**Can't access admin panel?**
- Verify both servers are running (check console output)
- Try http://127.0.0.1:3001 instead of localhost
- Check firewall settings

**Display looks wrong?**
- Try refreshing the browser
- Clear browser cache
- Check browser console for errors

## License

MIT License - Feel free to use and modify for your projects!

## Credits

Inspired by classic split-flap displays found in train stations and airports worldwide.
