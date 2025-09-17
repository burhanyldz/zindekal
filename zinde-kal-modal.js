/**
 * ZindeKal Modal Plugin
 * A configurable modal plugin for wellness content including exercises, relaxing videos, and music
 * 
 * @version 1.0.0
 * @author ZindeKal Team
 */

class ZindeKalModal {
    constructor(config = {}) {
        this.config = this.validateAndMergeConfig(config);
        this.isInitialized = false;
        this.isModalOpen = false;
        this.currentTab = 'exercise';
        this.audioPlayer = null;
        this.videoPlayer = null;
        this.originalTabContent = null;
        this.originalTabId = null;
        this.modalElement = null;
        this.toastElement = null;
        this.boundEventHandlers = new Map();
        
        // Initialize the plugin
        this.init();
    }

    /**
     * Default configuration structure
     */
    static get DEFAULT_CONFIG() {
        return {
            // Container where modal will be appended
            container: document.body,
            
            // Modal settings
            modal: {
                title: "Zinde Kal",
                closeOnOverlay: true,
                closeOnEscape: true,
                showCloseButton: true
            },
            
            // Tab configuration
            tabs: {
                exercise: { title: "Egzersiz Videoları", enabled: true },
                relaxing: { title: "Dinlendirici Videolar", enabled: true },
                music: { title: "Dinlendirici Müzikler", enabled: true }
            },
            
            // Exercise categories and videos
            exercise: {
                categories: [],
                videos: []
            },
            
            // Relaxing videos
            relaxing: {
                videos: []
            },
            
            // Music playlist
            music: {
                tracks: [],
                currentTrack: 0,
                autoplay: false
            },
            
            // Toast notification settings
            toast: {
                autoHideDelay: 5000,
                icon: "images/kanka_head.png",
                message: "",
                enabled: true
            },
            
            // Asset paths
            assets: {
                basePath: "images/",
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
            },
            
            // Event callbacks
            events: {
                onOpen: null,
                onClose: null,
                onTabChange: null,
                onVideoPlay: null,
                onAudioPlay: null,
                onAudioPause: null
            }
        };
    }

    /**
     * Validate and merge user config with defaults
     */
    validateAndMergeConfig(userConfig) {
        // Create a clean copy of default config to avoid mutations
        const defaultConfig = JSON.parse(JSON.stringify(ZindeKalModal.DEFAULT_CONFIG));
        
        // Create a clean copy of user config to avoid circular references
        let cleanUserConfig = {};
        try {
            cleanUserConfig = userConfig ? JSON.parse(JSON.stringify(userConfig)) : {};
        } catch (error) {
            console.warn('ZindeKalModal: Could not serialize user config, using shallow copy');
            cleanUserConfig = { ...userConfig };
        }
        
        // Handle container element separately since it can't be serialized
        if (userConfig && userConfig.container) {
            cleanUserConfig.container = userConfig.container;
        }
        
        // Deep merge configuration
        const mergedConfig = this.deepMerge(defaultConfig, cleanUserConfig);
        
        // Basic validation
        if (!mergedConfig.container) {
            throw new Error('ZindeKalModal: Container element is required');
        }
        
        if (typeof mergedConfig.container === 'string') {
            const element = document.querySelector(mergedConfig.container);
            if (!element) {
                throw new Error(`ZindeKalModal: Container element "${mergedConfig.container}" not found`);
            }
            mergedConfig.container = element;
        }
        
        return mergedConfig;
    }

    /**
     * Deep merge two objects with circular reference protection
     */
    deepMerge(target, source, visited = new WeakSet()) {
        // Handle null/undefined
        if (!target || !source) {
            return source || target || {};
        }
        
        // Prevent circular references
        if (visited.has(source)) {
            return target;
        }
        
        const result = { ...target };
        visited.add(source);
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                const sourceValue = source[key];
                const targetValue = target[key];
                
                // Handle arrays by replacing them completely
                if (Array.isArray(sourceValue)) {
                    result[key] = [...sourceValue];
                }
                // Handle objects by deep merging
                else if (sourceValue && typeof sourceValue === 'object' && sourceValue.constructor === Object) {
                    result[key] = this.deepMerge(targetValue || {}, sourceValue, visited);
                }
                // Handle primitive values and functions
                else {
                    result[key] = sourceValue;
                }
            }
        }
        
        return result;
    }

    /**
     * Initialize the modal plugin
     */
    init() {
        if (this.isInitialized) {
            console.warn('ZindeKalModal: Already initialized');
            return this;
        }

        // Create modal HTML structure
        this.createModalStructure();
        
        // Create toast notification if enabled
        if (this.config.toast.enabled) {
            this.createToastStructure();
        }
        
        // Bind event handlers
        this.bindEvents();
        
        // Initialize first category as active and filter videos if on exercise tab
        this.initializeDefaultCategory();
        
        this.isInitialized = true;
        
        return this;
    }

    /**
     * Initialize the first category as active and filter videos for exercise tab
     */
    initializeDefaultCategory() {
        // Only initialize if we're on exercise tab and have categories
        if (this.currentTab === 'exercise' && 
            this.config.exercise.categories && 
            this.config.exercise.categories.length > 0) {
            
            const firstCategoryId = this.config.exercise.categories[0].id;
            this.filterVideosByCategory(firstCategoryId);
        }
        
        return this;
    }

    /**
     * Create the modal HTML structure dynamically
     */
    createModalStructure() {
        // Create modal overlay
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal-overlay';
        this.modalElement.id = 'zindeKalModalOverlay';
        
        this.modalElement.innerHTML = this.generateModalHTML();
        
        // Append to container
        this.config.container.appendChild(this.modalElement);
    }

    /**
     * Generate the complete modal HTML structure
     */
    generateModalHTML() {
        return `
            <div class="modal-container">
                ${this.generateModalHeader()}
                ${this.generateTabsContent()}
            </div>
        `;
    }

    /**
     * Generate modal header with tabs and close button
     */
    generateModalHeader() {
        const enabledTabs = Object.entries(this.config.tabs)
            .filter(([key, tab]) => tab.enabled)
            .map(([key, tab]) => `
                <a href="#" class="tab-item ${key === this.currentTab ? 'active' : ''}" data-tab="${key}">
                    ${tab.title}
                </a>
            `).join('');

        return `
            <header class="widget-header">
                <nav class="tabs-nav">
                    ${enabledTabs}
                </nav>
                ${this.config.modal.showCloseButton ? `
                    <button class="close-button" data-action="close">
                        <img src="${this.config.assets.basePath}${this.config.assets.icons.close}" alt="Close">
                    </button>
                ` : ''}
            </header>
        `;
    }

    /**
     * Generate all tab content sections
     */
    generateTabsContent() {
        let content = '';
        
        // Exercise tab
        if (this.config.tabs.exercise.enabled) {
            content += this.generateExerciseTab();
        }
        
        // Relaxing videos tab
        if (this.config.tabs.relaxing.enabled) {
            content += this.generateRelaxingTab();
        }
        
        // Music tab
        if (this.config.tabs.music.enabled) {
            content += this.generateMusicTab();
        }
        
        return content;
    }

    /**
     * Generate exercise tab content
     */
    generateExerciseTab() {
        const isActive = this.currentTab === 'exercise';
        
        return `
            <div id="exercise-tab" class="tab-content ${isActive ? 'active' : ''}">
                ${this.generateCategoryNavigation()}
                ${this.generateVideoGrid(this.config.exercise.videos)}
            </div>
        `;
    }

    /**
     * Generate category navigation for exercise tab
     */
    generateCategoryNavigation() {
        if (!this.config.exercise.categories.length) {
            return '';
        }

        const categories = this.config.exercise.categories.map((category, index) => {
            // Calculate actual video count for this category
            const videoCount = this.config.exercise.videos.filter(video => video.categoryId === category.id).length;
            
            return `
                <a href="#" class="category-item ${index === 0 ? 'active' : ''}" data-category="${category.id}">
                    ${category.badge ? `<span class="badge">${category.badge}</span>` : ''}
                    <div class="category-icon ${category.iconClass || ''}">
                        <img src="${this.config.assets.basePath}${category.icon}" alt="${category.title}">
                    </div>
                    <div class="category-text">
                        <span class="category-title">${category.title}</span>
                        <span class="category-count">${videoCount} Video</span>
                    </div>
                </a>
            `;
        }).join('');

        return `
            <nav class="category-nav-scroll">
                <div class="category-nav">
                    ${categories}
                </div>
            </nav>
        `;
    }

    /**
     * Generate video grid for any tab
     */
    generateVideoGrid(videos, withParentDiv = true) {
        if (!videos || !videos.length) {
            let emptyMessage = `
                    <div class="empty-category-message">
                        <div class="empty-icon">📽️</div>
                        <h3>Bu kategoride video bulunamadı</h3>
                        <p>Şu anda bu kategori için mevcut video bulunmuyor.</p>
                    </div>
            `;

            return withParentDiv ? `<div class="video-grid">${emptyMessage}</div>` : emptyMessage;

        }

        const videoCards = videos.map(video => `
            <article class="video-card" data-video-id="${video.id}">
                <figure class="video-thumbnail-container">
                    <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                    <button class="play-button" data-action="play-video" data-video-src="${video.src}">
                        <img src="${this.config.assets.basePath}${this.config.assets.icons.thumbnailPlay}" 
                             alt="Play" 
                             style="position: absolute; top: 20.25px; left: 20.25px; width: 31.5px; height: 31.5px;">
                    </button>
                </figure>
                <div class="video-info">
                    <div class="video-title-bar">
                        <h3>${video.title}</h3>
                        <span>${video.duration}</span>
                    </div>
                    <p>${video.description}</p>
                </div>
            </article>
        `).join('');

        return withParentDiv ? `<div class="video-grid">${videoCards}</div>` : videoCards;
    }

    /**
     * Generate relaxing videos tab content
     */
    generateRelaxingTab() {
        const isActive = this.currentTab === 'relaxing';
        
        return `
            <div id="relaxing-tab" class="tab-content ${isActive ? 'active' : ''}">
                ${this.generateVideoGrid(this.config.relaxing.videos)}
            </div>
        `;
    }

    /**
     * Generate music tab content
     */
    generateMusicTab() {
        const isActive = this.currentTab === 'music';
        
        return `
            <div id="music-tab" class="tab-content ${isActive ? 'active' : ''}" style="padding: 0;">
                <div class="music-content">
                    ${this.generatePlaylist()}
                </div>
                ${this.generateMusicPlayer()}
            </div>
        `;
    }

    /**
     * Generate playlist HTML
     */
    generatePlaylist() {
        if (!this.config.music.tracks.length) {
            return '<p>No tracks available</p>';
        }

        const playlistItems = this.config.music.tracks.map((track, index) => `
            <li class="playlist-item ${index === this.config.music.currentTrack ? 'active' : ''}" 
                data-track-index="${index}">
                <div class="playlist-item-content">
                    <div class="song-info">
                        <div class="song-number-icon">
                            <span class="song-number">${index + 1}</span>
                            <img class="play-icon" src="${this.config.assets.basePath}${this.config.assets.icons.playSmall}" alt="Play">
                            <img class="pause-icon" src="${this.config.assets.basePath}${this.config.assets.icons.pause}" alt="Pause">
                        </div>
                        <div class="song-details">
                            <span class="song-title">${track.title}</span>
                            ${track.artist ? `<span class="song-artist">${track.artist}</span>` : ''}
                        </div>
                    </div> 
                    <span>${track.duration}</span>
                </div>
            </li>
        `).join('');

        return `
            <ul class="playlist">
                ${playlistItems}
            </ul>
        `;
    }

    /**
     * Generate music player footer
     */
    generateMusicPlayer() {
        const currentTrack = this.config.music.tracks[this.config.music.currentTrack];
        if (!currentTrack) {
            return '';
        }

        return `
            <footer class="music-player">
                <div class="player-song-details">
                    <div class="player-song-title-container">
                        <canvas id="player-playing-riv" width="24" height="24" style="display: none;"></canvas>
                        <span class="player-song-title">${currentTrack.title}</span>
                    </div>
                    <span class="player-song-artist">${currentTrack.artist || 'Unknown Artist'}</span>
                </div>
                <div class="player-controls-container">
                    <div class="player-controls">
                        <button class="control-button prev-track" data-action="prev-track">
                            <img src="${this.config.assets.basePath}${this.config.assets.icons.prev}" alt="Previous">
                        </button>
                        <button class="control-button play-pause-button" data-action="toggle-play">
                            <img src="${this.config.assets.basePath}${this.config.assets.icons.play}" alt="Play">
                        </button>
                        <button class="control-button next-track" data-action="next-track">
                            <img src="${this.config.assets.basePath}${this.config.assets.icons.next}" alt="Next">
                        </button>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="cursor: pointer;">
                            <div class="progress-bar-filled" style="width: 0%;"></div>
                            <div class="progress-bar-thumb" style="left: 0%;"></div>
                        </div>
                        <div class="time-display">
                            <span>00:00</span> / <span>00:00</span>
                        </div>
                        <div class="volume-control-container">
                            <button class="control-button volume-button" data-action="toggle-volume">
                                <img class="volume-button-icon" src="${this.config.assets.basePath}${this.config.assets.icons.unmuted}" alt="Volume">
                            </button>
                            <div class="volume-popup" style="display: none;">
                                <div class="volume-content">
                                    <button class="volume-mute-btn" data-action="toggle-audio-mute">
                                        <img src="${this.config.assets.basePath}${this.config.assets.icons.unmuted}" alt="Mute">
                                    </button>
                                    <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1">
                                    <span class="volume-percentage">100%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        `;
    }

    /**
     * Create toast notification structure
     */
    createToastStructure() {
        this.toastElement = document.createElement('div');
        this.toastElement.className = 'toast-notification';
        this.toastElement.id = 'zindeKalToastNotification';
        
        this.toastElement.innerHTML = `
            <div class="alert-content">
                <img src="${this.config.toast.icon}" alt="Alert Icon" class="alert-icon">
                <p class="alert-text">${this.config.toast.message}</p>
            </div>
            <button class="close-button" data-action="close-toast">
                <img src="${this.config.assets.basePath}${this.config.assets.icons.closeActive}" alt="Close">
            </button>
        `;
        
        this.config.container.appendChild(this.toastElement);
    }

    /**
     * Bind all event handlers
     */
    bindEvents() {
        // Modal overlay click (close on overlay)
        if (this.config.modal.closeOnOverlay) {
            this.addEventHandler(this.modalElement, 'click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }

        // Escape key handler
        if (this.config.modal.closeOnEscape) {
            this.addEventHandler(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isModalOpen) {
                    this.close();
                }
            });
        }

        // Event delegation for all modal interactions
        this.addEventHandler(this.modalElement, 'click', (e) => {
            this.handleModalClick(e);
        });

        // Close volume popup when clicking outside
        this.addEventHandler(document, 'click', (e) => {
            const volumePopup = this.modalElement.querySelector('.volume-popup');
            const volumeButton = this.modalElement.querySelector('[data-action="toggle-volume"]');
            if (volumePopup && volumePopup.style.display !== 'none' && 
                !volumePopup.contains(e.target) && !volumeButton.contains(e.target)) {
                this.hideVolumePopup();
            }
        });

        // Volume slider input
        this.addEventHandler(this.modalElement, 'input', (e) => {
            if (e.target.classList.contains('volume-slider')) {
                const volume = parseFloat(e.target.value);
                const percent = Math.round(volume * 100) + '%';

                // Update CSS variable to show the fill
                e.target.style.setProperty('--range-fill-percent', percent);

                if (this.audioPlayer) {
                    this.audioPlayer.updateVolumeFromSlider(volume);
                } else {
                    this.updateVolume(volume);
                }
            }
        });

        // Toast close button
        if (this.toastElement) {
            this.addEventHandler(this.toastElement, 'click', (e) => {
                if (e.target.closest('[data-action="close-toast"]')) {
                    this.hideToast();
                }
            });
        }
    }

    /**
     * Add event handler and track it for cleanup
     */
    addEventHandler(element, event, handler) {
        element.addEventListener(event, handler);
        
        if (!this.boundEventHandlers.has(element)) {
            this.boundEventHandlers.set(element, []);
        }
        
        this.boundEventHandlers.get(element).push({ event, handler });
    }

    /**
     * Handle all modal click events through delegation
     */
    handleModalClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const tabElement = e.target.closest('[data-tab]');
        const categoryElement = e.target.closest('[data-category]');
        const trackElement = e.target.closest('[data-track-index]');

        if (action) {
            this.handleAction(action, e);
        } else if (tabElement) {
            this.switchTab(tabElement.dataset.tab);
        } else if (categoryElement) {
            this.selectCategory(categoryElement.dataset.category);
        } else if (trackElement) {
            const trackIndex = parseInt(trackElement.dataset.trackIndex);
            if (this.audioPlayer) {
                this.audioPlayer.selectTrack(trackIndex);
            } else {
                this.selectTrack(trackIndex);
            }
        }
    }

    /**
     * Handle specific actions
     */
    handleAction(action, event) {
        switch (action) {
            case 'close':
                this.close();
                break;
            case 'play-video':
                const videoSrc = event.target.closest('[data-video-src]')?.dataset.videoSrc;
                if (videoSrc) {
                    this.playVideo(videoSrc);
                }
                break;
            case 'toggle-play':
                if (this.audioPlayer) {
                    this.audioPlayer.togglePlay();
                }
                break;
            case 'prev-track':
                if (this.audioPlayer) {
                    this.audioPlayer.previousTrack();
                }
                break;
            case 'next-track':
                if (this.audioPlayer) {
                    this.audioPlayer.nextTrack();
                }
                break;
            case 'toggle-audio-mute':
                if (this.audioPlayer) {
                    this.audioPlayer.toggleMute();
                }
                break;
            case 'toggle-volume':
                if (this.audioPlayer) {
                    this.audioPlayer.toggleVolumePopup();
                } else {
                    this.toggleVolumePopup();
                }
                break;
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        if (!this.config.tabs[tabName]?.enabled) {
            console.warn(`ZindeKalModal: Tab "${tabName}" is not enabled`);
            return this;
        }

        // Update current tab
        const oldTab = this.currentTab;
        this.currentTab = tabName;

        // Update tab navigation
        this.modalElement.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.modalElement.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Initialize audio player when switching to music tab
        if (tabName === 'music' && !this.audioPlayer) {
            this.initializeAudioPlayer();
        }

        // Ensure first category is selected when switching to exercise tab
        if (tabName === 'exercise' && 
            this.config.exercise.categories && 
            this.config.exercise.categories.length > 0) {
            
            const firstCategoryId = this.config.exercise.categories[0].id;
            this.selectCategory(firstCategoryId);
        }

        // Call onTabChange callback
        if (this.config.events.onTabChange) {
            this.config.events.onTabChange(tabName, oldTab, this);
        }

        return this;
    }

    /**
     * Select exercise category
     */
    selectCategory(categoryId) {
        // Remove active class from all categories
        this.modalElement.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected category
        const selectedCategory = this.modalElement.querySelector(`[data-category="${categoryId}"]`);
        if (selectedCategory) {
            selectedCategory.classList.add('active');
        }

        // Filter videos by category (this would need to be implemented based on your data structure)
        this.filterVideosByCategory(categoryId);

        return this;
    }

    /**
     * Filter videos by category
     */
    filterVideosByCategory(categoryId) {
        // Filter exercise videos by category and update the video grid
        const filteredVideos = this.config.exercise.videos.filter(video => 
            video.categoryId === categoryId
        );

        const exerciseTab = this.modalElement.querySelector('#exercise-tab');
        const videoGrid = exerciseTab.querySelector('.video-grid');
        
        if (videoGrid) {
            videoGrid.innerHTML = this.generateVideoGrid(filteredVideos,false);
        }

        return this;
    }

    /**
     * Play a video - Enhanced implementation with video player
     */
    playVideo(videoSrc, videoPoster = '') {
        // Find video data to get poster/thumbnail
        let videoData = null;
        const allVideos = [...(this.config.exercise.videos || []), ...(this.config.relaxing.videos || [])];
        videoData = allVideos.find(video => video.src === videoSrc);
        
        if (videoData && !videoPoster) {
            videoPoster = videoData.thumbnail || '';
        }

        // Clean current tab content and show video player
        const activeTabContent = this.modalElement.querySelector('.tab-content.active');
        if (!activeTabContent) {
            console.error('ZindeKalModal: No active tab found');
            return this;
        }

        // Store original content for restoration
        this.originalTabContent = activeTabContent.innerHTML;
        this.originalTabId = activeTabContent.id;

        // Create video player container
        const videoPlayerContainer = document.createElement('div');
        videoPlayerContainer.className = 'video-player-container';
        videoPlayerContainer.id = 'zindekal-video-player-container';

        // Clear tab content and add video player
        activeTabContent.innerHTML = '';
        activeTabContent.appendChild(videoPlayerContainer);

        // Initialize video player
        this.videoPlayer = new ZindeKalVideoPlayer({
            container: videoPlayerContainer,
            videoSrc: videoSrc,
            videoPoster: videoPoster,
            callbacks: {
                onPlayerReady: (player) => {
                    console.log('ZindeKal Video Player ready');
                    if (this.config.events.onVideoPlay) {
                        this.config.events.onVideoPlay(videoSrc, this);
                    }
                },
                onBackClick: () => {
                    this.closeVideoPlayer();
                },
                onPlay: () => {
                    console.log('Video started playing');
                },
                onPause: () => {
                    console.log('Video paused');
                },
                onEnded: () => {
                    console.log('Video ended');
                }
            }
        });

        // Initialize the player
        this.videoPlayer.init().catch(error => {
            console.error('Failed to initialize video player:', error);
            // Restore original content on error
            this.closeVideoPlayer();
        });

        return this;
    }

    /**
     * Close video player and restore original tab content
     */
    closeVideoPlayer() {
        // Destroy video player if it exists
        if (this.videoPlayer) {
            this.videoPlayer.destroy();
            this.videoPlayer = null;
        }

        // Restore original tab content
        if (this.originalTabContent && this.originalTabId) {
            const activeTabContent = this.modalElement.querySelector(`#${this.originalTabId}`);
            if (activeTabContent) {
                activeTabContent.innerHTML = this.originalTabContent;
                
                // Re-filter videos if we're in exercise tab and have categories
                if (this.originalTabId === 'exercise-tab' && 
                    this.config.exercise.categories && 
                    this.config.exercise.categories.length > 0) {
                    
                    // Find currently active category
                    const activeCategory = this.modalElement.querySelector('.category-item.active');
                    if (activeCategory) {
                        const categoryId = activeCategory.dataset.category;
                        this.filterVideosByCategory(categoryId);
                    } else {
                        // Default to first category
                        const firstCategoryId = this.config.exercise.categories[0].id;
                        this.selectCategory(firstCategoryId);
                    }
                }
            }
        }

        // Clean up stored content
        this.originalTabContent = null;
        this.originalTabId = null;

        return this;
    }

    /**
     * Initialize audio player for music tab
     */
    initializeAudioPlayer() {
        const musicPlayerFooter = this.modalElement.querySelector('.music-player');
        
        if (musicPlayerFooter && this.config.music.tracks.length > 0 && !this.audioPlayer) {
            // Import the existing EmbeddedAudioPlayer class
            if (typeof EmbeddedAudioPlayer !== 'undefined') {
                this.audioPlayer = new EmbeddedAudioPlayer({
                    container: musicPlayerFooter,
                    tracks: this.config.music.tracks,
                    currentTrackIndex: this.config.music.currentTrack,
                    track: this.config.music.tracks[this.config.music.currentTrack],
                    autoplay: this.config.music.autoplay,
                    modalInstance: this,
                    config: this.config
                });

                // Bind audio events for callbacks
                if (this.audioPlayer.audio) {
                    this.audioPlayer.audio.addEventListener('play', () => {
                        if (this.config.events.onAudioPlay) {
                            this.config.events.onAudioPlay(this.config.music.tracks[this.config.music.currentTrack], this);
                        }
                    });

                    this.audioPlayer.audio.addEventListener('pause', () => {
                        if (this.config.events.onAudioPause) {
                            this.config.events.onAudioPause(this.config.music.tracks[this.config.music.currentTrack], this);
                        }
                    });
                }
            } else {
                console.error('ZindeKalModal: EmbeddedAudioPlayer class not found. Please include audio-player.js');
            }
        }

        return this;
    }

    // Helper methods for audio player integration
    
    /**
     * Update track display in player footer
     */
    updateTrackDisplay(trackIndex, track) {
        // Update current track index in config
        this.config.music.currentTrack = trackIndex;
        
        // Update player details
        const playerDetails = this.modalElement.querySelector('.player-song-details');
        if (playerDetails) {
            const titleElement = playerDetails.querySelector('.player-song-title');
            const artistElement = playerDetails.querySelector('.player-song-artist');
            
            if (titleElement) titleElement.textContent = track.title;
            if (artistElement) artistElement.textContent = track.artist || 'Unknown Artist';
        }
        
        return this;
    }
    
    /**
     * Update playlist visual state
     */
    updatePlaylistVisualState(trackIndex) {
        this.modalElement.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.classList.toggle('active', index === trackIndex);
            // Clear playing state for all items
            item.classList.remove('playing');
            
            const songInfo = item.querySelector('.song-info');
            const canvas = songInfo.querySelector('canvas');
            
            // Remove any existing canvas animations
            if (canvas) {
                canvas.remove();
            }
        });
        
        return this;
    }

    /**
     * Show playing animation for a specific track
     */
    showPlayingAnimation(trackIndex) {
        const playlistItems = this.modalElement.querySelectorAll('.playlist-item');
        const targetItem = playlistItems[trackIndex];
        
        if (targetItem) {
            const songInfo = targetItem.querySelector('.song-info');
            const songNumberIcon = songInfo.querySelector('.song-number-icon');
            const canvas = songInfo.querySelector('canvas');
            const track = this.config.music.tracks[trackIndex];
            
            if (songNumberIcon && !canvas) {
                // Add the canvas for Rive animation
                const canvasElement = document.createElement('canvas');
                canvasElement.id = 'playing-riv';
                canvasElement.width = 24;
                canvasElement.height = 24;
                songNumberIcon.appendChild(canvasElement);
                
                this.initializeRiveAnimation();
            }
        }

        // Also show animation in the player
        this.showPlayerPlayingAnimation();
    }

    /**
     * Hide playing animation for all tracks
     */
    hidePlayingAnimation() {
        const playlistItems = this.modalElement.querySelectorAll('.playlist-item');
        
        playlistItems.forEach((item, index) => {
            const songInfo = item.querySelector('.song-info');
            const songNumberIcon = songInfo.querySelector('.song-number-icon');
            const canvas = songInfo.querySelector('canvas');
            
            if (canvas) {
                canvas.remove();
            }
        });

        // Also hide animation in the player
        this.hidePlayerPlayingAnimation();
    }

    /**
     * Update playing state for current track
     */
    updatePlayingState(isPlaying) {
        const playlistItems = this.modalElement.querySelectorAll('.playlist-item');
        const currentItem = playlistItems[this.config.music.currentTrack];
        
        if (currentItem) {
            if (isPlaying) {
                currentItem.classList.add('playing');
            } else {
                currentItem.classList.remove('playing');
            }
        }
        
        return this;
    }

    /**
     * Show playing animation in the music player
     */
    showPlayerPlayingAnimation() {
        const playerCanvas = this.modalElement.querySelector('#player-playing-riv');
        if (playerCanvas) {
            playerCanvas.style.display = 'block';
            this.initializePlayerRiveAnimation();
        }
        
        return this;
    }

    /**
     * Hide playing animation in the music player
     */
    hidePlayerPlayingAnimation() {
        const playerCanvas = this.modalElement.querySelector('#player-playing-riv');
        if (playerCanvas) {
            playerCanvas.style.display = 'none';
        }
        
        return this;
    }

    /**
     * Toggle volume popup visibility
     */
    toggleVolumePopup() {
        const volumePopup = this.modalElement.querySelector('.volume-popup');
        if (volumePopup) {
            const isVisible = volumePopup.style.display !== 'none';
            if (isVisible) {
                this.hideVolumePopup();
            } else {
                this.showVolumePopup();
            }
        }

        return this;
    }

    /**
     * Show volume popup
     */
    showVolumePopup() {
        const volumePopup = this.modalElement.querySelector('.volume-popup');
        if (volumePopup) {
            volumePopup.style.display = 'block';
            
            // Update volume slider and percentage
            this.updateVolumePopupUI();
        }

        return this;
    }

    /**
     * Hide volume popup
     */
    hideVolumePopup() {
        const volumePopup = this.modalElement.querySelector('.volume-popup');
        if (volumePopup) {
            volumePopup.style.display = 'none';
        }

        return this;
    }

    /**
     * Update volume popup UI elements
     */
    updateVolumePopupUI() {
        if (!this.audioPlayer) return;

        const volumeSlider = this.modalElement.querySelector('.volume-slider');
        const volumePercentage = this.modalElement.querySelector('.volume-percentage');
        const volumeMuteBtn = this.modalElement.querySelector('.volume-mute-btn img');
        const volumeButtonIcon = this.modalElement.querySelector('.volume-button-icon');

        if (volumeSlider) {
            volumeSlider.value = this.audioPlayer.volume;
            // update the CSS custom property to show the fill percent
            const percent = Math.round(this.audioPlayer.volume * 100) + '%';
            volumeSlider.style.setProperty('--range-fill-percent', percent);
        }

        if (volumePercentage) {
            volumePercentage.textContent = Math.round(this.audioPlayer.volume * 100) + '%';
        }

        // Update both popup mute button and main volume button icons
        const iconSrc = this.audioPlayer.isMuted 
            ? this.config.assets.basePath + this.config.assets.icons.muted
            : this.config.assets.basePath + this.config.assets.icons.unmuted;
        const altText = this.audioPlayer.isMuted ? 'Unmute' : 'Mute';

        if (volumeMuteBtn) {
            volumeMuteBtn.src = iconSrc;
            volumeMuteBtn.alt = altText;
        }

        if (volumeButtonIcon) {
            volumeButtonIcon.src = iconSrc;
            volumeButtonIcon.alt = 'Volume';
        }

        return this;
    }

    /**
     * Update volume from slider input
     */
    updateVolume(volume) {
        if (!this.audioPlayer) return;
        
        this.audioPlayer.setVolume(volume);
        this.updateVolumePopupUI();
        
        return this;
    }

    /**
     * Initialize Rive animation for playing indicator
     */
    initializeRiveAnimation() {
        // This requires the Rive library to be loaded
        if (typeof rive !== 'undefined') {
            const canvas = this.modalElement.querySelector("#playing-riv");
            
            if (canvas) {
                canvas.width = 24;
                canvas.height = 24;
                canvas.style.width = '24px';
                canvas.style.height = '24px';
                
                try {
                    new rive.Rive({
                        src: `${this.config.assets.basePath}playing.riv`,
                        canvas: canvas,
                        autoplay: true,
                        stateMachines: "State Machine",
                        layout: new rive.Layout({
                            fit: rive.Fit.Contain,
                            alignment: rive.Alignment.Center
                        }),
                        onLoad: () => {
                            canvas.width = 24;
                            canvas.height = 24;
                            canvas.style.width = '24px';
                            canvas.style.height = '24px';
                        }
                    });
                } catch (error) {
                    console.warn('ZindeKalModal: Could not load Rive animation:', error);
                }
            }
        }
    }

    /**
     * Initialize Rive animation for player playing indicator
     */
    initializePlayerRiveAnimation() {
        // This requires the Rive library to be loaded
        if (typeof rive !== 'undefined') {
            const canvas = this.modalElement.querySelector("#player-playing-riv");
            
            if (canvas) {
                canvas.width = 24;
                canvas.height = 24;
                canvas.style.width = '24px';
                canvas.style.height = '24px';
                
                try {
                    new rive.Rive({
                        src: `${this.config.assets.basePath}playing.riv`,
                        canvas: canvas,
                        autoplay: true,
                        stateMachines: "State Machine",
                        layout: new rive.Layout({
                            fit: rive.Fit.Contain,
                            alignment: rive.Alignment.Center
                        }),
                        onLoad: () => {
                            canvas.width = 24;
                            canvas.height = 24;
                            canvas.style.width = '24px';
                            canvas.style.height = '24px';
                        }
                    });
                } catch (error) {
                    console.warn('ZindeKalModal: Could not load player Rive animation:', error);
                }
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message = null) {
        if (!this.toastElement) {
            console.warn('ZindeKalModal: Toast notifications are disabled');
            return this;
        }

        // Update message if provided
        if (message) {
            const alertText = this.toastElement.querySelector('.alert-text');
            if (alertText) {
                alertText.textContent = message;
            }
        }

        this.toastElement.classList.add('show');

        // Auto-hide after configured delay
        if (this.config.toast.autoHideDelay > 0) {
            setTimeout(() => {
                this.hideToast();
            }, this.config.toast.autoHideDelay);
        }

        return this;
    }

    /**
     * Hide toast notification
     */
    hideToast() {
        if (this.toastElement) {
            this.toastElement.classList.remove('show');
        }

        return this;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        // Create a fresh copy to avoid circular references
        const cleanConfig = JSON.parse(JSON.stringify(newConfig));
        this.config = this.deepMerge(this.config, cleanConfig);
        
        // Rebuild modal if it's initialized
        if (this.isInitialized) {
            const wasOpen = this.isModalOpen;
            this.destroy();
            this.init();
            if (wasOpen) {
                this.open();
            }
        }

        return this;
    }

    /**
     * Get current configuration
     */
    getConfig() {
        try {
            // Return a clean copy to prevent external mutations
            const configCopy = JSON.parse(JSON.stringify(this.config));
            // Note: container element will be lost in JSON serialization
            configCopy.container = this.config.container;
            return configCopy;
        } catch (error) {
            console.warn('ZindeKalModal: Could not serialize config, returning shallow copy');
            return { ...this.config };
        }
    }

    /**
     * Check if modal is currently open
     */
    isOpen() {
        return this.isModalOpen;
    }

    /**
     * Get current tab
     */
    getCurrentTab() {
        return this.currentTab;
    }

    /**
     * Get current track info
     */
    getCurrentTrack() {
        return this.config.music.tracks[this.config.music.currentTrack] || null;
    }

    /**
     * Open the modal
     */
    open() {
        if (!this.isInitialized) {
            console.error('ZindeKalModal: Plugin not initialized');
            return this;
        }

        this.modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.isModalOpen = true;

        // Initialize audio player if music tab is active
        if (this.currentTab === 'music' && !this.audioPlayer) {
            this.initializeAudioPlayer();
        }

        // Ensure first category is selected and videos filtered if on exercise tab
        if (this.currentTab === 'exercise' && 
            this.config.exercise.categories && 
            this.config.exercise.categories.length > 0) {
            
            // Check if any category is currently active
            const activeCategory = this.modalElement.querySelector('.category-item.active');
            if (!activeCategory) {
                const firstCategoryId = this.config.exercise.categories[0].id;
                this.selectCategory(firstCategoryId);
            }
        }

        // Call onOpen callback
        if (this.config.events.onOpen) {
            this.config.events.onOpen(this);
        }

        return this;
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.isModalOpen) return this;

        this.modalElement.classList.remove('active');
        document.body.style.overflow = 'auto';
        this.isModalOpen = false;

        // Pause audio if playing
        if (this.audioPlayer) {
            this.audioPlayer.pause();
        }

        // Close video player if open
        if (this.videoPlayer) {
            this.closeVideoPlayer();
        }

        // Call onClose callback
        if (this.config.events.onClose) {
            this.config.events.onClose(this);
        }

        return this;
    }

    /**
     * Destroy the modal and clean up
     */
    destroy() {
        if (this.isModalOpen) {
            this.close();
        }

        // Clean up audio player
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        // Clean up video player
        if (this.videoPlayer) {
            this.videoPlayer.destroy();
            this.videoPlayer = null;
        }

        // Remove event listeners
        this.boundEventHandlers.forEach((handlers, element) => {
            handlers.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.boundEventHandlers.clear();

        // Remove DOM elements
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }

        if (this.toastElement) {
            this.toastElement.remove();
            this.toastElement = null;
        }

        this.isInitialized = false;

        return this;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZindeKalModal;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return ZindeKalModal; });
} else {
    window.ZindeKalModal = ZindeKalModal;
}