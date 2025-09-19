// Enhanced AudioPlayer for embedded use in modal with playlist management
class EmbeddedAudioPlayer {
    constructor(options = {}) {
        this.options = {
            track: options.track || {},
            tracks: options.tracks || [],
            currentTrackIndex: options.currentTrackIndex || 0,
            autoplay: options.autoplay || false,
            container: options.container || null,
            modalInstance: options.modalInstance || null,
            config: options.config || {},
            ...options
        };
        
        this.isPlaying = false;
        this.isDragging = false;
        this.isManualSeek = false;
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
        // Set initial track
        if (this.options.tracks && this.options.tracks.length > 0) {
            const currentTrack = this.options.tracks[this.options.currentTrackIndex];
            if (currentTrack && currentTrack.src) {
                this.audio.src = currentTrack.src;
                this.options.track = currentTrack;
            }
        } else if (this.options.track.src) {
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
            
            // Only auto-play next track if the song ended naturally (not from manual seeking)
            if (!this.isDragging && !this.isManualSeek && this.options.tracks && this.options.tracks.length > 1) {
                // Calculate next track index
                const currentIndex = this.options.currentTrackIndex;
                const nextIndex = currentIndex < this.options.tracks.length - 1
                    ? currentIndex + 1
                    : 0;
                
                // Switch to next track
                this.switchToTrack(nextIndex);
                
                // Auto-play the next track (since the previous one was playing)
                this.play().catch(e => {
                    console.log('Auto-play next track was prevented:', e);
                });
            }
            
            // Reset manual seek flag
            this.isManualSeek = false;
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            this._startPlayedInterval();
            
            // Notify modal about play event
            if (this.options.modalInstance) {
                if (this.options.modalInstance.showPlayingAnimation) {
                    this.options.modalInstance.showPlayingAnimation(this.options.currentTrackIndex);
                }
                if (this.options.modalInstance.updatePlayingState) {
                    this.options.modalInstance.updatePlayingState(true);
                }
            }
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this._stopPlayedInterval();
            
            // Notify modal about pause event
            if (this.options.modalInstance) {
                if (this.options.modalInstance.hidePlayingAnimation) {
                    this.options.modalInstance.hidePlayingAnimation();
                }
                if (this.options.modalInstance.updatePlayingState) {
                    this.options.modalInstance.updatePlayingState(false);
                }
            }
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
        this.timeTooltip = this.options.container.querySelector('.progress-time-tooltip');
        this.tooltipTime = this.options.container.querySelector('.tooltip-time');
        
        // Navigation and volume controls are handled by modal's event delegation system
        // this.prevButton = this.options.container.querySelector('[data-action="prev-track"]');
        // this.nextButton = this.options.container.querySelector('[data-action="next-track"]');
        // this.volumeButton = this.options.container.querySelector('.volume-button');
        // this.volumeMuteButton = this.options.container.querySelector('[data-action="toggle-audio-mute"]');
        
        // Store initial play/pause icons
        this.playIcon = this.playButton?.querySelector('img');
        if (this.playIcon) {
            this.playIconSrc = this.playIcon.src;
            // Create pause icon by changing the image source (replace play icon with pause icon)
            this.pauseIconSrc = this.playIconSrc.replace('play', 'pause'); // Change play to pause icon
        }
    }
    
    bindEvents() {
        // All control buttons are handled by modal's event delegation system
        // to avoid double event binding conflicts
        
        // Progress bar interaction - Safe to handle directly as it doesn't use data-action
        if (this.progressBar) {
            // Mouse events
            this.progressBar.addEventListener('mousedown', (e) => this.startDrag(e));
            this.progressBar.addEventListener('click', (e) => {
                if (!this.isDragging) {
                    this.isManualSeek = true; // Mark as manual seek
                    this.seekToPosition(e);
                    // Reset manual seek flag after a short delay
                    setTimeout(() => {
                        this.isManualSeek = false;
                    }, 500);
                }
            });
            
            // Touch events for mobile support
            this.progressBar.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        }
        
        // Progress bar thumb specific events for better interaction
        if (this.progressBarThumb) {
            // Mouse events on thumb
            this.progressBarThumb.addEventListener('mousedown', (e) => this.startDrag(e));
            
            // Touch events on thumb
            this.progressBarThumb.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        }
        
        // Global mouse and touch events for dragging
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());
        document.addEventListener('touchcancel', () => this.endDrag());
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
        this.isManualSeek = true; // Mark as manual seek
        
        // Add visual feedback
        if (this.progressBarThumb) {
            this.progressBarThumb.classList.add('dragging');
        }
        
        // Show tooltip
        if (this.timeTooltip) {
            this.timeTooltip.style.display = 'block';
            this.timeTooltip.classList.add('visible');
        }
        
        this.seekToPosition(e);
        e.preventDefault();
        e.stopPropagation();
    }

    drag(e) {
        if (!this.isDragging) return;
        this.seekToPosition(e);
        this.updateTooltipPosition(e);
        e.preventDefault();
    }

    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            
            // Remove visual feedback
            if (this.progressBarThumb) {
                this.progressBarThumb.classList.remove('dragging');
            }
            
            // Hide tooltip
            if (this.timeTooltip) {
                this.timeTooltip.classList.remove('visible');
                // Hide after transition
                setTimeout(() => {
                    if (!this.isDragging) {
                        this.timeTooltip.style.display = 'none';
                    }
                }, 200);
            }
            
            // Reset manual seek flag after a short delay to prevent auto-advance
            setTimeout(() => {
                this.isManualSeek = false;
            }, 500);
        }
    }

    seekToPosition(e) {
        if (!this.progressBar || this.duration === 0) return;
        
        // Handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newTime = percentage * this.duration;
        
        this.audio.currentTime = newTime;
        this.currentTime = newTime;
        this.updateTimeline();
        this.updateTimeDisplay();
        
        // Update tooltip if dragging
        if (this.isDragging) {
            this.updateTooltipTime(newTime);
            this.updateTooltipPosition(e);
        }
    }

    updateTooltipPosition(e) {
        if (!this.timeTooltip || !this.progressBar) return;
        
        // Handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        
        // Position tooltip at the mouse/touch position
        this.timeTooltip.style.left = percentage * 100 + '%';
    }

    updateTooltipTime(time) {
        if (!this.tooltipTime) return;
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.tooltipTime.textContent = timeStr;
    }    toggleMute() {
        if (this.isMuted) {
            // Unmute: restore previous volume (or set to 0.5 if previous was 0)
            this.isMuted = false;
            this.volume = this.previousVolume > 0 ? this.previousVolume : 0.5;
            this.audio.volume = this.volume;
            this.audio.muted = false;
        } else {
            // Mute: save current volume and set to 0
            this.previousVolume = this.volume > 0 ? this.volume : 0.5;
            this.isMuted = true;
            this.volume = 0;
            this.audio.volume = 0;
            this.audio.muted = true;
        }
        
        this.updateVolumeButton();
    }
    
    updateVolumeButton() {
        // Delegate volume button updates to modal since modal handles the UI
        if (this.options.modalInstance && this.options.modalInstance.updateVolumePopupUI) {
            this.options.modalInstance.updateVolumePopupUI();
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
    
    togglePlay() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(e => {
                console.log('Play was prevented:', e);
            });
        }
    }
    
    setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        
        // Handle automatic mute/unmute based on volume level
        if (volume === 0 && !this.isMuted) {
            // Volume set to 0, should be marked as muted
            this.isMuted = true;
            this.audio.muted = true;
        } else if (volume > 0 && this.isMuted) {
            // Volume moved above 0 while muted, should be unmuted
            this.isMuted = false;
            this.audio.muted = false;
            this.previousVolume = volume;
        } else if (!this.isMuted) {
            // Normal volume change while not muted
            this.previousVolume = volume;
        }
        
        this.volume = volume;
        this.audio.volume = volume;
        
        // Volume UI updates are handled by modal
        if (this.options.modalInstance && this.options.modalInstance.updateVolumePopupUI) {
            this.options.modalInstance.updateVolumePopupUI();
        }
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
    
    // Track navigation methods
    nextTrack() {
        if (!this.options.tracks || this.options.tracks.length === 0) return this;

        const wasPlaying = this.isPlaying;
        
        // Calculate next index
        const currentIndex = this.options.currentTrackIndex;
        const newIndex = currentIndex < this.options.tracks.length - 1
            ? currentIndex + 1
            : 0;
        
        this.switchToTrack(newIndex);
        
        // If audio was playing, continue playing the new track
        if (wasPlaying) {
            this.play().catch(e => {
                console.log('Play was prevented:', e);
            });
        }
        
        return this;
    }
    
    previousTrack() {
        if (!this.options.tracks || this.options.tracks.length === 0) return this;

        const wasPlaying = this.isPlaying;
        
        // Calculate previous index
        const currentIndex = this.options.currentTrackIndex;
        const newIndex = currentIndex > 0 
            ? currentIndex - 1 
            : this.options.tracks.length - 1;
        
        this.switchToTrack(newIndex);
        
        // If audio was playing, continue playing the new track
        if (wasPlaying) {
            this.play().catch(e => {
                console.log('Play was prevented:', e);
            });
        }
        
        return this;
    }
    
    selectTrack(trackIndex) {
        if (!this.options.tracks || trackIndex < 0 || trackIndex >= this.options.tracks.length) return;
        
        // If clicking the same track that's currently selected
        if (trackIndex === this.options.currentTrackIndex) {
            // Toggle play/pause instead of restarting
            this.togglePlay();
        } else {
            // Switch to new track and start playing
            this.switchToTrack(trackIndex);
            
            // Start playing the selected track
            this.play().then(() => {
                // Notify modal about playing animation for the selected track
                if (this.options.modalInstance && this.options.modalInstance.showPlayingAnimation) {
                    this.options.modalInstance.showPlayingAnimation(trackIndex);
                }
            }).catch(e => {
                console.log('Play was prevented:', e);
            });
        }
        
        return this;
    }
    
    // Switch to a specific track by index
    switchToTrack(trackIndex) {
        if (!this.options.tracks || trackIndex < 0 || trackIndex >= this.options.tracks.length) {
            return this;
        }

        const oldIndex = this.options.currentTrackIndex;
        
        // Update our current track index
        this.options.currentTrackIndex = trackIndex;
        const newTrack = this.options.tracks[trackIndex];

        // Update current track data
        this.options.track = newTrack;

        // Update audio source
        if (newTrack.src) {
            this.audio.src = newTrack.src;
            this.audio.load();
        }

        // Notify modal to update visual states AND sync the modal's current track
        if (this.options.modalInstance) {
            // Sync the modal's config with our current track index
            if (this.options.modalInstance.config && this.options.modalInstance.config.music) {
                this.options.modalInstance.config.music.currentTrack = trackIndex;
            }
            
            if (this.options.modalInstance.updateTrackDisplay) {
                this.options.modalInstance.updateTrackDisplay(trackIndex, newTrack);
            }
            if (this.options.modalInstance.updatePlaylistVisualState) {
                this.options.modalInstance.updatePlaylistVisualState(trackIndex);
            }
        }

        return this;
    }
    
    // Volume popup control methods
    toggleVolumePopup() {
        if (this.options.modalInstance && this.options.modalInstance.toggleVolumePopup) {
            this.options.modalInstance.toggleVolumePopup();
        }
        return this;
    }
    
    showVolumePopup() {
        if (this.options.modalInstance && this.options.modalInstance.showVolumePopup) {
            this.options.modalInstance.showVolumePopup();
        }
        return this;
    }
    
    hideVolumePopup() {
        if (this.options.modalInstance && this.options.modalInstance.hideVolumePopup) {
            this.options.modalInstance.hideVolumePopup();
        }
        return this;
    }
    
    updateVolumeFromSlider(volume) {
        this.setVolume(volume);
        
        // Notify modal to update volume UI
        if (this.options.modalInstance && this.options.modalInstance.updateVolumePopupUI) {
            this.options.modalInstance.updateVolumePopupUI();
        }
        
        return this;
    }
}