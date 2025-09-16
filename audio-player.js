// Simplified AudioPlayer for embedded use in modal
class EmbeddedAudioPlayer {
    constructor(options = {}) {
        this.options = {
            track: options.track || {},
            autoplay: options.autoplay || false,
            container: options.container || null,
            ...options
        };
        
        this.isPlaying = false;
        this.isDragging = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 1;
        this.isMuted = false;
        this.previousVolume = 1;
        
        this.audio = new Audio();
        this.playedSeconds = 0;
        this._playedInterval = null;
        
        this.setupAudio();
        this.bindElements();
        this.bindEvents();
    }
    
    setupAudio() {
        if (this.options.track.src) {
            this.audio.src = this.options.track.src;
        }
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.duration = this.audio.duration;
            this.updateTimeline();
            this.updateTimeDisplay();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            if (!this.isDragging) {
                this.currentTime = this.audio.currentTime;
                this.updateTimeline();
                this.updateTimeDisplay();
            }
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this._stopPlayedInterval();
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            this._startPlayedInterval();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this._stopPlayedInterval();
        });
    }
    
    bindElements() {
        if (!this.options.container) {
            console.error('Container element required for embedded audio player');
            return;
        }
        
        // Find control elements within the container
        this.playButton = this.options.container.querySelector('.play-pause-button');
        this.progressBar = this.options.container.querySelector('.progress-bar');
        this.progressBarFilled = this.options.container.querySelector('.progress-bar-filled');
        this.progressBarThumb = this.options.container.querySelector('.progress-bar-thumb');
        this.timeDisplay = this.options.container.querySelector('.time-display');
        this.volumeButton = this.options.container.querySelector('.volume-button');
        
        // Store initial play/pause icons
        this.playIcon = this.playButton?.querySelector('img');
        if (this.playIcon) {
            this.playIconSrc = this.playIcon.src;
            // Create pause icon by changing the image source (replace play icon with pause icon)
            this.pauseIconSrc = this.playIconSrc.replace('play', 'pause'); // Change play to pause icon
        }
    }
    
    bindEvents() {
        // Play/pause button
        if (this.playButton) {
            this.playButton.addEventListener('click', () => this.togglePlay());
        }
        
        // Progress bar interaction
        if (this.progressBar) {
            this.progressBar.addEventListener('mousedown', (e) => this.startDrag(e));
            this.progressBar.addEventListener('click', (e) => this.seekToPosition(e));
        }
        
        // Volume button
        if (this.volumeButton) {
            this.volumeButton.addEventListener('click', () => this.toggleMute());
        }
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(e => {
                console.log('Play was prevented:', e);
            });
        }
    }
    
    updatePlayButton() {
        if (!this.playIcon) return;
        
        if (this.isPlaying) {
            // Show pause icon
            this.playIcon.src = this.pauseIconSrc;
            this.playIcon.alt = 'Pause';
        } else {
            // Show play icon
            this.playIcon.src = this.playIconSrc;
            this.playIcon.alt = 'Play';
        }
    }
    
    updateTimeline() {
        if (!this.progressBarFilled || !this.progressBarThumb || this.duration === 0) return;
        
        const percentage = (this.currentTime / this.duration) * 100;
        this.progressBarFilled.style.width = percentage + '%';
        this.progressBarThumb.style.left = percentage + '%';
    }
    
    updateTimeDisplay() {
        if (!this.timeDisplay) return;
        
        const currentMinutes = Math.floor(this.currentTime / 60);
        const currentSeconds = Math.floor(this.currentTime % 60);
        const totalMinutes = Math.floor(this.duration / 60);
        const totalSeconds = Math.floor(this.duration % 60);
        
        const currentTimeStr = `${currentMinutes.toString().padStart(2, '0')}:${currentSeconds.toString().padStart(2, '0')}`;
        const totalTimeStr = `${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
        
        this.timeDisplay.innerHTML = `<span>${currentTimeStr}</span> / <span>${totalTimeStr}</span>`;
    }
    
    startDrag(e) {
        this.isDragging = true;
        this.seekToPosition(e);
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging) return;
        this.seekToPosition(e);
        e.preventDefault();
    }
    
    endDrag() {
        this.isDragging = false;
    }
    
    seekToPosition(e) {
        if (!this.progressBar || this.duration === 0) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percentage * this.duration;
        
        this.audio.currentTime = newTime;
        this.currentTime = newTime;
        this.updateTimeline();
        this.updateTimeDisplay();
    }
    
    toggleMute() {
        if (this.isMuted) {
            this.isMuted = false;
            this.volume = this.previousVolume;
            this.audio.volume = this.volume;
        } else {
            this.previousVolume = this.volume;
            this.isMuted = true;
            this.volume = 0;
            this.audio.volume = 0;
        }
        
        this.audio.muted = this.isMuted;
        this.updateVolumeButton();
    }
    
    updateVolumeButton() {
        if (!this.volumeButton) return;
        
        const volumeIcon = this.volumeButton.querySelector('img');
        if (!volumeIcon) return;
        
        // Store original icon source for unmuted state
        if (!this.originalVolumeIcon) {
            this.originalVolumeIcon = volumeIcon.src;
        }
        
        if (this.isMuted) {
            // Change to muted icon (try to find a muted version by replacing the icon number)
            volumeIcon.src = this.originalVolumeIcon.replace('unmuted', 'muted'); // Replace with muted icon if available
            volumeIcon.alt = 'Unmute';
        } else {
            // Change to unmuted icon
            volumeIcon.src = this.originalVolumeIcon;
            volumeIcon.alt = 'Volume';
        }
    }
    
    _startPlayedInterval() {
        if (this._playedInterval) return;
        this._playedInterval = setInterval(() => {
            this.playedSeconds += 1;
        }, 1000);
    }
    
    _stopPlayedInterval() {
        if (this._playedInterval) {
            clearInterval(this._playedInterval);
            this._playedInterval = null;
        }
    }
    
    // Public methods
    play() {
        return this.audio.play();
    }
    
    pause() {
        this.audio.pause();
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
        this.updateVolumeButton();
    }
    
    getCurrentTime() {
        return this.currentTime;
    }
    
    getDuration() {
        return this.duration;
    }
    
    getPlayedSeconds() {
        return this.playedSeconds;
    }
}