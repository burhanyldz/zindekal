# ZindeKal Modal Plugin Documentation

## Overview

The ZindeKal Modal Plugin is a comprehensive, configurable modal system designed for wellness content including exercise videos, relaxing videos, and music playlists. The plugin accepts JSON configuration data and dynamically generates modal content.

## Features

- **Tabbed Interface**: Exercise videos, relaxing videos, and music tabs
- **Exercise Categories**: Organize exercise videos by type
- **Audio Player**: Built-in music player with playlist support
- **Toast Notifications**: Configurable notification system
- **Responsive Design**: Works with existing CSS styles
- **Event System**: Comprehensive callback system for custom interactions
- **Keyboard Support**: ESC key to close modal
- **Memory Management**: Proper cleanup and event handler removal

## Installation

1. Include the required files in your HTML:

```html
<!-- Required CSS -->
<link rel="stylesheet" href="global.css">

<!-- Required JavaScript -->
<script src="audio-player.js"></script>
<script src="zinde-kal-modal.js"></script>

<!-- Optional: Rive animation support -->
<script src="https://unpkg.com/@rive-app/canvas"></script>
```

## Basic Usage

```javascript
// Create configuration object
const modalConfig = {
    container: document.body,
    
    // Exercise content
    exercise: {
        categories: [
            {
                id: "ankle",
                title: "Ayak Bileği Egzersizi",
                icon: "ayak.svg",
                iconClass: "icon-ayak",
                videoCount: 2
            },
            {
                id: "shoulder",
                title: "Ayakta Omuz Egzersizi", 
                icon: "ayakta_omuz.svg",
                iconClass: "icon-omuz",
                videoCount: 6
            }
        ],
        videos: [
            {
                id: "ankle-1",
                categoryId: "ankle",
                title: "Ayak Bileği Egzersizi",
                description: "Bu egzersizde ayak bileği çevrilir...",
                thumbnail: "images/exercise-feature.png",
                src: "videos/ankle-exercise-1.mp4",
                duration: "02dk 15s"
            }
        ]
    },
    
    // Relaxing videos
    relaxing: {
        videos: [
            {
                id: "peaceful-1",
                title: "Dinlendirici Video",
                description: "Rahatlatıcı doğa sesleri...",
                thumbnail: "images/peaceful-1.png",
                src: "videos/peaceful-1.mp4",
                duration: "05:30"
            }
        ]
    },
    
    // Music playlist
    music: {
        currentTrack: 0,
        autoplay: false,
        tracks: [
            {
                id: "track-1",
                title: "Sessiz Akşam",
                artist: "Dinlendirici Müzikler",
                src: "music/track-1.mp3",
                duration: "4:12"
            },
            {
                id: "track-2", 
                title: "Huzur Melodisi",
                artist: "Dinlendirici Müzikler",
                src: "music/track-2.mp3", 
                duration: "3:28"
            }
        ]
    },
    
    // Toast notification
    toast: {
        message: "2 saattir çalışıyorsunuz. Kısa bir mola vermek ister misiniz?",
        icon: "images/kanka_head.png",
        autoHideDelay: 5000
    },
    
    // Event callbacks
    events: {
        onOpen: (modal) => console.log('Modal opened'),
        onClose: (modal) => console.log('Modal closed'),
        onTabChange: (newTab, oldTab, modal) => console.log(`Tab changed: ${oldTab} -> ${newTab}`),
        onVideoPlay: (videoSrc, modal) => console.log('Playing video:', videoSrc)
    }
};

// Initialize the modal
const zindeKalModal = new ZindeKalModal(modalConfig);

// Open the modal
zindeKalModal.open();

// Show toast notification
zindeKalModal.showToast("Time for a break!");
```

## Configuration Schema

### Root Configuration Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `container` | Element/String | `document.body` | Container element or CSS selector |
| `modal` | Object | See below | Modal behavior settings |
| `tabs` | Object | See below | Tab configuration |
| `exercise` | Object | See below | Exercise content configuration |
| `relaxing` | Object | See below | Relaxing videos configuration |
| `music` | Object | See below | Music player configuration |
| `toast` | Object | See below | Toast notification settings |
| `assets` | Object | See below | Asset paths configuration |
| `events` | Object | See below | Event callback functions |

### Modal Settings (`modal`)

```javascript
modal: {
    title: "Zinde Kal",           // Modal title
    closeOnOverlay: true,         // Close when clicking overlay
    closeOnEscape: true,          // Close with Escape key
    showCloseButton: true         // Show close button in header
}
```

### Tab Configuration (`tabs`)

```javascript
tabs: {
    exercise: { 
        title: "Egzersiz Videoları", 
        enabled: true 
    },
    relaxing: { 
        title: "Dinlendirici Videolar", 
        enabled: true 
    },
    music: { 
        title: "Dinlendirici Müzikler", 
        enabled: true 
    }
}
```

### Exercise Configuration (`exercise`)

```javascript
exercise: {
    categories: [
        {
            id: "unique-id",           // Unique category identifier
            title: "Category Name",    // Display name
            icon: "icon.svg",          // Icon filename
            iconClass: "css-class",    // CSS class for styling
            videoCount: 5,             // Number of videos in category
            badge: "Yeni"              // Optional badge text
        }
    ],
    videos: [
        {
            id: "unique-video-id",     // Unique video identifier
            categoryId: "category-id", // Associated category ID
            title: "Video Title",      // Video title
            description: "Description", // Video description
            thumbnail: "thumb.png",    // Thumbnail image path
            src: "video.mp4",          // Video source URL
            duration: "02dk 15s"       // Duration display text
        }
    ]
}
```

### Relaxing Videos Configuration (`relaxing`)

```javascript
relaxing: {
    videos: [
        // Same structure as exercise videos, but without categoryId
        {
            id: "relaxing-1",
            title: "Peaceful Nature",
            description: "Calming nature sounds...",
            thumbnail: "images/peaceful.png",
            src: "videos/peaceful.mp4",
            duration: "10:00"
        }
    ]
}
```

### Music Configuration (`music`)

```javascript
music: {
    currentTrack: 0,              // Index of initially selected track
    autoplay: false,              // Start playing automatically
    tracks: [
        {
            id: "track-id",           // Unique track identifier
            title: "Track Title",     // Song title
            artist: "Artist Name",    // Artist name (optional)
            src: "audio.mp3",         // Audio source URL
            duration: "3:45"          // Duration display text
        }
    ]
}
```

### Toast Configuration (`toast`)

```javascript
toast: {
    enabled: true,                // Enable toast notifications
    message: "Default message",   // Default notification text
    icon: "icon.png",            // Notification icon
    autoHideDelay: 5000          // Auto-hide delay in milliseconds (0 = no auto-hide)
}
```

### Assets Configuration (`assets`)

```javascript
assets: {
    basePath: "images/",         // Base path for all assets
    icons: {
        close: "close.svg",
        closeActive: "close-active.svg",
        play: "play.svg",
        pause: "pause.svg",
        next: "next.svg",
        prev: "prev.svg",
        playSmall: "play-sm.svg",
        thumbnailPlay: "thumbnail-play.svg",
        muted: "muted.svg",
        unmuted: "unmuted.svg"
    }
}
```

### Event Callbacks (`events`)

```javascript
events: {
    onOpen: (modal) => {},                           // Modal opened
    onClose: (modal) => {},                          // Modal closed  
    onTabChange: (newTab, oldTab, modal) => {},      // Tab switched
    onVideoPlay: (videoSrc, modal) => {},            // Video play requested
    onAudioPlay: (track, modal) => {},               // Audio started
    onAudioPause: (track, modal) => {}               // Audio paused
}
```

## API Methods

### Core Methods

#### `open()`
Opens the modal.
```javascript
modal.open();
```

#### `close()`
Closes the modal.
```javascript
modal.close();
```

#### `destroy()`
Destroys the modal and cleans up all resources.
```javascript
modal.destroy();
```

### Tab Management

#### `switchTab(tabName)`
Switch to a specific tab.
```javascript
modal.switchTab('exercise'); // 'exercise', 'relaxing', or 'music'
```

#### `getCurrentTab()`
Get the currently active tab.
```javascript
const currentTab = modal.getCurrentTab();
```

### Exercise Methods

#### `selectCategory(categoryId)`
Select an exercise category.
```javascript
modal.selectCategory('ankle');
```

#### `filterVideosByCategory(categoryId)`
Filter exercise videos by category.
```javascript
modal.filterVideosByCategory('shoulder');
```

### Music Methods

#### `toggleAudioPlay()`
Toggle audio play/pause.
```javascript
modal.toggleAudioPlay();
```

#### `nextTrack()`
Play next track in playlist.
```javascript
modal.nextTrack();
```

#### `previousTrack()`
Play previous track in playlist.
```javascript
modal.previousTrack();
```

#### `selectTrack(trackIndex)`
Select and play a specific track.
```javascript
modal.selectTrack(1);
```

#### `getCurrentTrack()`
Get current track information.
```javascript
const track = modal.getCurrentTrack();
```

#### `toggleAudioMute()`
Toggle audio mute.
```javascript
modal.toggleAudioMute();
```

### Notification Methods

#### `showToast(message)`
Show toast notification with optional custom message.
```javascript
modal.showToast("Time for a break!");
modal.showToast(); // Uses default message
```

#### `hideToast()`
Hide the toast notification.
```javascript
modal.hideToast();
```

### Configuration Methods

#### `updateConfig(newConfig)`
Update the configuration and rebuild the modal.
```javascript
modal.updateConfig({
    music: {
        tracks: [/* new tracks */]
    }
});
```

#### `getConfig()`
Get a copy of the current configuration.
```javascript
const config = modal.getConfig();
```

### State Methods

#### `isOpen()`
Check if the modal is currently open.
```javascript
if (modal.isOpen()) {
    console.log('Modal is open');
}
```

## Video Integration

The plugin provides a `playVideo()` method that you can override or extend for your video player integration:

```javascript
const modal = new ZindeKalModal({
    // ... config
    events: {
        onVideoPlay: (videoSrc, modal) => {
            // Your custom video player logic
            console.log('Playing video:', videoSrc);
            
            // Example: Open video in a lightbox
            openVideoLightbox(videoSrc);
            
            // Example: Embed video in modal
            // modal.embedVideo(videoSrc);
        }
    }
});
```

## Styling

The plugin uses existing CSS classes and doesn't modify any styles. Make sure your CSS includes:

- `.modal-overlay` and `.modal-overlay.active`
- `.modal-container`
- `.tab-item` and `.tab-item.active`
- `.tab-content` and `.tab-content.active`
- `.video-card`, `.playlist-item`, etc.
- `.toast-notification` and `.toast-notification.show`

## Browser Support

- Modern browsers with ES6+ support
- Requires existing CSS framework for styling
- Optional Rive animation support for music player

## Dependencies

- `audio-player.js` - For music player functionality
- Existing CSS styles
- Optional: Rive library for animations

## Migration from Static HTML

If you have existing static HTML modal, here's how to migrate:

1. **Extract data** from your HTML into JSON format
2. **Replace static HTML** with plugin initialization
3. **Update event handlers** to use plugin API methods
4. **Configure assets paths** in the plugin configuration

Example migration:

```javascript
// Before: Static HTML with inline JavaScript
function openModal() {
    document.getElementById('modalOverlay').classList.add('active');
}

// After: Plugin-based approach
const modal = new ZindeKalModal(config);
modal.open();
```

## Troubleshooting

### Common Issues

1. **Modal doesn't appear**: Check container element and CSS includes
2. **Audio not working**: Ensure `audio-player.js` is loaded before the plugin
3. **Icons not loading**: Verify `assets.basePath` and icon filenames
4. **Events not firing**: Check event callback configuration

### Debug Mode

Enable console logging for development:

```javascript
const modal = new ZindeKalModal({
    // ... config
    debug: true // Add this for development
});
```

## Examples

See the example HTML file for a complete working implementation with sample data.