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
        this.modalElement = null;
        this.toastElement = null;
        this.boundEventHandlers = new Map();
        
        // Event handlers (not in config anymore)
        this.eventHandlers = {
            onOpen: null,
            onClose: null,
            onTabChange: null,
            onVideoPlay: null,
            onVideoPause: null,
            onAudioPlay: null,
            onAudioPause: null
        };
        
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
            
            // Exercise categories and videos
            exercise: {
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
            }
        };
    }

    /**
     * Internal asset paths (not configurable)
     */
    static get ASSETS() {
        return {
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
        };
    }

    /**
     * Hardcoded exercise categories (not configurable)
     */
    static get CATEGORIES() {
        return [
            {
                id: "ankle",
                title: "Ayak Bileği Egzersizi",
                icon: "ayak.svg",
                iconClass: "icon-ayak",
                videoCount: 2
            },
            {
                id: "shoulder-standing",
                title: "Ayakta Omuz Egzersizi",
                icon: "ayakta_omuz.svg",
                iconClass: "icon-omuz",
                videoCount: 6
            },
            {
                id: "shoulder-sitting",
                title: "Oturarak Omuz Egzersizi",
                icon: "oturarak_omuz.svg",
                iconClass: "icon-oturarak-omuz",
                videoCount: 4
            },
            {
                id: "walking",
                title: "Yürüyüş Egzersizi",
                icon: "yuruyus.svg",
                iconClass: "icon-yuruyus",
                videoCount: 3,
                badge: "Yeni"
            },
            {
                id: "eye",
                title: "Göz Egzersizi",
                icon: "goz.svg",
                iconClass: "icon-goz",
                videoCount: 3,
                badge: "Yeni"
            },
            {
                id: "back-standing",
                title: "Ayakta Bel Egzersizi",
                icon: "ayakta_bel.svg",
                iconClass: "icon-ayakta-bel",
                videoCount: 1,
                badge: "Yeni"
            },
            {
                id: "breathing",
                title: "Nefes Egzersizi",
                icon: "nefes.svg",
                iconClass: "icon-nefes",
                videoCount: 1,
                badge: "Yeni"
            }
        ];
    }

    /**
     * Hardcoded tab configuration (not configurable)
     */
    static get TABS() {
        return {
            exercise: { title: "Egzersizler", enabled: true },
            music: { title: "Müzikler", enabled: true },
            relaxing: { title: "Videolar", enabled: true }
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
     * Event binding methods
     */
    onOpen(callback) {
        this.eventHandlers.onOpen = callback;
        return this;
    }

    onClose(callback) {
        this.eventHandlers.onClose = callback;
        return this;
    }

    onTabChange(callback) {
        this.eventHandlers.onTabChange = callback;
        return this;
    }

    onVideoPlay(callback) {
        this.eventHandlers.onVideoPlay = callback;
        return this;
    }

    onVideoPause(callback) {
        this.eventHandlers.onVideoPause = callback;
        return this;
    }

    onAudioPlay(callback) {
        this.eventHandlers.onAudioPlay = callback;
        return this;
    }

    onAudioPause(callback) {
        this.eventHandlers.onAudioPause = callback;
        return this;
    }

    /**
     * Initialize the modal plugin
     */
    init() {
        if (this.isInitialized) {
            return this;
        }

        // Initialize mobile viewport handling
        this.initMobileViewportHandler();

        // Create modal HTML structure
        this.createModalStructure();
        
        // Create toast notification
        this.createToastStructure();
        
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
            ZindeKalModal.CATEGORIES && 
            ZindeKalModal.CATEGORIES.length > 0) {
            
            const firstCategoryId = ZindeKalModal.CATEGORIES[0].id;
            this.filterVideosByCategory(firstCategoryId);
            
            // Center the first category in the viewport (with a small delay to ensure DOM is ready)
            setTimeout(() => {
                const firstCategoryElement = this.modalElement.querySelector(`[data-category="${firstCategoryId}"]`);
                if (firstCategoryElement) {
                    this.centerSelectedCategory(firstCategoryElement);
                }
            }, 100);
        }
        
        return this;
    }

    /**
     * Initialize mobile viewport handling for better mobile browser support
     */
    initMobileViewportHandler() {
        // Only run on mobile devices
        if (!this.isMobileDevice()) {
            return;
        }

        // Set initial viewport height
        this.setViewportHeight();

        // Update on resize and orientation change
        const updateViewport = () => {
            // Small delay to allow browser UI to settle
            setTimeout(() => {
                this.setViewportHeight();
            }, 100);
        };

        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);
        
        // Store handlers for cleanup
        this.boundEventHandlers.set('viewportResize', updateViewport);
    }

    /**
     * Set CSS custom property for accurate viewport height
     */
    setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Reset offsets to prevent unwanted gaps
        document.documentElement.style.setProperty('--modal-top-offset', '0px');
        document.documentElement.style.setProperty('--modal-bottom-offset', '0px');
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768 && 'ontouchstart' in window);
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
        const enabledTabs = Object.entries(ZindeKalModal.TABS)
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
                        <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.close}" alt="Close">
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
        if (ZindeKalModal.TABS.exercise.enabled) {
            content += this.generateExerciseTab();
        }
        
        
        // Music tab
        if (ZindeKalModal.TABS.music.enabled) {
            content += this.generateMusicTab();
        }
        
            // Relaxing videos tab
        if (ZindeKalModal.TABS.relaxing.enabled) {
            content += this.generateRelaxingTab();
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
        if (!ZindeKalModal.CATEGORIES.length) {
            return '';
        }

        const categories = ZindeKalModal.CATEGORIES.map((category, index) => {
            // Calculate actual video count for this category
            const videoCount = this.config.exercise.videos.filter(video => video.categoryId === category.id).length;
            
            return `
                <a href="#" class="category-item ${index === 0 ? 'active' : ''}" data-category="${category.id}">
                    ${category.badge ? `<span class="badge">${category.badge}</span>` : ''}
                    <div class="category-icon ${category.iconClass || ''}">
                        <img src="${ZindeKalModal.ASSETS.basePath}${category.icon}" alt="${category.title}">
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
                        <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.thumbnailPlay}" 
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
                            <img class="play-icon" src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.playSmall}" alt="Play">
                            <img class="pause-icon" src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.pause}" alt="Pause">
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
                            <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.prev}" alt="Previous">
                        </button>
                        <button class="control-button play-pause-button" data-action="toggle-play">
                            <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.play}" alt="Play">
                        </button>
                        <button class="control-button next-track" data-action="next-track">
                            <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.next}" alt="Next">
                        </button>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="cursor: pointer;">
                            <div class="progress-bar-filled" style="width: 0%;"></div>
                            <div class="progress-bar-thumb" style="left: 0%;"></div>
                            <div class="progress-time-tooltip" style="display: none;">
                                <span class="tooltip-time">00:00</span>
                            </div>
                        </div>
                        <div class="time-display">
                            <span>00:00</span> / <span>00:00</span>
                        </div>
                        <div class="volume-control-container">
                            <button class="control-button volume-button" data-action="toggle-volume">
                                <img class="volume-button-icon" src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.unmuted}" alt="Volume">
                            </button>
                            <div class="volume-popup" style="display: none;">
                                <div class="volume-content">
                                    <button class="volume-mute-btn" data-action="toggle-audio-mute">
                                        <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.unmuted}" alt="Mute">
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
                <img src="images/kanka.png" alt="Alert Icon" class="alert-icon">
                <p class="alert-text"></p>
            </div>
            <button class="close-button" data-action="close-toast">
                <img src="${ZindeKalModal.ASSETS.basePath}${ZindeKalModal.ASSETS.icons.closeActive}" alt="Close">
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
                const clickedElement = event.target.closest('[data-video-src]');
                const videoSrc = clickedElement?.dataset.videoSrc;
                
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
        if (!ZindeKalModal.TABS[tabName]?.enabled) {
            return this;
        }

        // Update current tab
        const oldTab = this.currentTab;
        this.currentTab = tabName;

        // Update tab navigation
        this.modalElement.querySelectorAll('.tab-item').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('active', isActive);
        });

        // Update tab content
        this.modalElement.querySelectorAll('.tab-content').forEach(content => {
            const expectedId = `${tabName}-tab`;
            const isActive = content.id === expectedId;
            content.classList.toggle('active', isActive);
        });

        // Initialize audio player when switching to music tab
        if (tabName === 'music' && !this.audioPlayer) {
            this.initializeAudioPlayer();
        }

        // Ensure first category is selected when switching to exercise tab
        if (tabName === 'exercise' && 
            ZindeKalModal.CATEGORIES && 
            ZindeKalModal.CATEGORIES.length > 0) {
            
            const firstCategoryId = ZindeKalModal.CATEGORIES[0].id;
            this.selectCategory(firstCategoryId);
        }

        // Call onTabChange callback
        if (this.eventHandlers.onTabChange) {
            this.eventHandlers.onTabChange(tabName, oldTab, this);
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
            
            // Center the selected category in the viewport
            this.centerSelectedCategory(selectedCategory);
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
     * Center the selected category card in the viewport
     */
    centerSelectedCategory(categoryElement) {
        if (!categoryElement) {
            return this;
        }

        const categoryNavScroll = this.modalElement.querySelector('.category-nav-scroll');
        if (!categoryNavScroll) {
            return this;
        }

        // Get the category element's position relative to the scroll container
        const categoryRect = categoryElement.getBoundingClientRect();
        const scrollRect = categoryNavScroll.getBoundingClientRect();
        
        // Calculate the category's position within the scroll container
        const categoryLeftRelativeToScroll = categoryRect.left - scrollRect.left;
        const categoryWidth = categoryRect.width;
        const scrollWidth = scrollRect.width;
        
        // Calculate the center position
        const targetScrollLeft = categoryNavScroll.scrollLeft + categoryLeftRelativeToScroll - (scrollWidth / 2) + (categoryWidth / 2);
        
        // Scroll to center the category
        categoryNavScroll.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });

        return this;
    }

    /**
     * Play a video inline within the video card
     */
    playVideo(videoSrc, videoPoster = '') {
        // Pause all other playing videos first
        this.pauseAllOtherVideos();
        
        // Find the clicked video element in the current active tab first
        const currentActiveTab = this.modalElement.querySelector('.tab-content.active');
        
        let playButton = null;
        if (currentActiveTab) {
            // Look for the video in the current active tab first
            playButton = currentActiveTab.querySelector(`[data-video-src="${videoSrc}"]`);
        }
        
        // If not found in current tab, search globally (fallback)
        if (!playButton) {
            playButton = this.modalElement.querySelector(`[data-video-src="${videoSrc}"]`);
        }
        
        if (!playButton) {
            return this;
        }

        const videoCard = playButton.closest('.video-card');
        const thumbnailContainer = videoCard.querySelector('.video-thumbnail-container');
        
        if (!thumbnailContainer) {
            return this;
        }

        // Find video data to get poster/thumbnail
        let videoData = null;
        const allVideos = [...(this.config.exercise.videos || []), ...(this.config.relaxing.videos || [])];
        
        // Match by both src AND the video card's data-video-id for precise identification
        const videoCardId = videoCard.getAttribute('data-video-id');
        videoData = allVideos.find(video => video.src === videoSrc && video.id === videoCardId);
        
        // Fallback to src-only match if needed
        if (!videoData) {
            videoData = allVideos.find(video => video.src === videoSrc);
        }
        
        if (videoData && !videoPoster) {
            videoPoster = videoData.thumbnail || '';
        }

        // Check which tab this video belongs to
        const parentTab = thumbnailContainer.closest('.tab-content');
        
        // Determine expected tab based on video data
        let expectedTab = 'unknown';
        if (this.config.exercise.videos?.some(v => v.id === videoCardId)) {
            expectedTab = 'exercise';
        } else if (this.config.relaxing.videos?.some(v => v.id === videoCardId)) {
            expectedTab = 'relaxing';
        }

        // Create unique ID for this video player
        const videoId = `inline-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store original thumbnail content for potential restoration
        const originalContent = thumbnailContainer.innerHTML;
        
        // Replace thumbnail container content with video player
        thumbnailContainer.innerHTML = `
            <div class="inline-video-player" id="${videoId}">
                <video crossorigin class="inline-video" data-poster="${videoPoster}">
                    <source src="${videoSrc}" type="video/mp4">
                </video>
            </div>
        `;

        // Initialize inline video player
        const videoElement = thumbnailContainer.querySelector('.inline-video');
        const playerContainer = thumbnailContainer.querySelector('.inline-video-player');
        
        if (!videoElement) {
            thumbnailContainer.innerHTML = originalContent;
            return this;
        }

        try {
            // Check if we're already in the correct tab - if so, don't switch!
            const parentTab = thumbnailContainer.closest('.tab-content');
            
            if (parentTab && !parentTab.classList.contains('active')) {
                // If tab is not active, make it active first
                const tabId = parentTab.id.replace('-tab', '');
                
                this.switchTab(tabId);
                
                // Wait a bit for tab switch to complete
                setTimeout(() => {
                    this.initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc);
                }, 150);
                return this;
            }
            
            this.initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc);

        } catch (error) {
            thumbnailContainer.innerHTML = originalContent;
        }

        return this;
    }

    /**
     * Initialize video player with proper timing and visibility handling
     */
    initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc) {
        // Check current tab state
        const currentActiveTab = this.modalElement.querySelector('.tab-content.active');
        const parentTab = playerContainer.closest('.tab-content');
        
        // Force layout refresh before initializing Plyr
        playerContainer.offsetHeight;
        
        // Initialize Plyr for this specific video
        const player = new Plyr(videoElement, this.getInlinePlayerConfig());
        
        // Store player reference on the container for cleanup
        playerContainer._plyrInstance = player;
        playerContainer._originalContent = originalContent;
        
        // Add loading state to help with visibility
        playerContainer.classList.add('plyr-loading');
        
        player.on('ready', () => {
            // Check tab state when ready
            const activeTabNow = this.modalElement.querySelector('.tab-content.active');
            
            // Remove loading state and ensure visibility
            playerContainer.classList.remove('plyr-loading');
            playerContainer.style.visibility = 'visible';
            playerContainer.style.opacity = '1';
            
            // Force another layout refresh
            playerContainer.offsetHeight;
            
            // Auto-play the video
            player.play().catch(error => {
                // Silently handle auto-play failures
            });
            
            if (this.eventHandlers.onVideoPlay) {
                this.eventHandlers.onVideoPlay(videoSrc, this);
            }
        });

        // Add event listener for when video actually starts playing
        player.on('play', () => {
            // Pause all OTHER videos when this one starts playing
            this.pauseAllOtherVideos(playerContainer);
        });

        // Add event listener for when video is paused
        player.on('pause', () => {
            // Video paused handling can go here if needed
            if (this.eventHandlers.onVideoPause) {
                this.eventHandlers.onVideoPause(videoSrc, this);
            }
        });

        player.on('loadstart', () => {
            playerContainer.style.visibility = 'visible';
        });

        player.on('loadeddata', () => {
            playerContainer.style.opacity = '1';
        });

        player.on('ended', () => {
            // Optionally restore thumbnail after video ends
            // this.restoreVideoThumbnail(thumbnailContainer);
        });

        player.on('error', (error) => {
            this.restoreVideoThumbnail(playerContainer.closest('.video-thumbnail-container'));
        });

        // Set initial visibility
        setTimeout(() => {
            playerContainer.style.visibility = 'visible';
            playerContainer.style.opacity = '1';
            playerContainer.offsetHeight; // Force layout
        }, 100);

        return this;
    }

    /**
     * Get Plyr configuration for inline video players
     */
    getInlinePlayerConfig() {
        return {
            clickToPlay: true,
            invertTime: false,
            playsinline: true,
            hideControls: false,
            controls: [
                'play-large', 'play', 'progress', 'current-time', 'duration', 
                'mute', 'volume', 'fullscreen'
            ],
            i18n: {
                restart: "Tekrar başlat",
                rewind: "{seektime}s geri",
                play: "Oynat",
                pause: "Duraklat",
                fastForward: "{seektime}s İleri",
                seek: "Git",
                seekLabel: "{currentTime}/{duration}",
                played: "Oynatılan",
                buffered: "Önbellek",
                currentTime: "Şimdiki zaman",
                duration: "Süre",
                volume: "Ses",
                mute: "Sessiz",
                unmute: "Ses aç",
                enableCaptions: "Altyazıları aç",
                disableCaptions: "Altyazıları kapat",
                download: "İndir",
                enterFullscreen: "Tam ekran",
                exitFullscreen: "Tam ekranı kapat",
                frameTitle: "Player for {title}",
                captions: "Altyazılar",
                settings: "Ayarlar",
                pip: "Resim içinde resim",
                menuBack: "Önceki menüye dön",
                speed: "Hız",
                normal: "Normal",
                quality: "Kalite",
                loop: "Döngü",
                start: "Başlangıç",
                end: "Son",
                all: "Tümü",
                reset: "Sıfırla",
                disabled: "Kapalı",
                enabled: "Açık",
            }
        };
    }

    /**
     * Pause all currently playing videos
     * @param {Element} excludeContainer - Optional container to exclude from pausing
     */
    pauseAllOtherVideos(excludeContainer = null) {
        const allVideoPlayers = this.modalElement.querySelectorAll('.inline-video-player');
        
        let pausedCount = 0;
        allVideoPlayers.forEach(playerContainer => {
            // Skip the container we want to exclude (current playing video)
            if (excludeContainer && playerContainer === excludeContainer) {
                return;
            }
            
            if (playerContainer._plyrInstance) {
                try {
                    // Pause the video if it's playing
                    if (!playerContainer._plyrInstance.paused) {
                        playerContainer._plyrInstance.pause();
                        pausedCount++;
                    }
                } catch (error) {
                    // Silently handle pause errors
                }
            }
        });
    }

    /**
     * Restore video thumbnail (optional method for future use)
     */
    restoreVideoThumbnail(thumbnailContainer) {
        const playerContainer = thumbnailContainer.querySelector('.inline-video-player');
        if (playerContainer && playerContainer._plyrInstance) {
            // Destroy Plyr instance
            playerContainer._plyrInstance.destroy();
            
            // Restore original content
            if (playerContainer._originalContent) {
                thumbnailContainer.innerHTML = playerContainer._originalContent;
            }
        }
        
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
                        if (this.eventHandlers.onAudioPlay) {
                            this.eventHandlers.onAudioPlay(this.config.music.tracks[this.config.music.currentTrack], this);
                        }
                    });

                    this.audioPlayer.audio.addEventListener('pause', () => {
                        if (this.eventHandlers.onAudioPause) {
                            this.eventHandlers.onAudioPause(this.config.music.tracks[this.config.music.currentTrack], this);
                        }
                    });
                }
            } else {
                // EmbeddedAudioPlayer class not found - fail silently
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
            ? ZindeKalModal.ASSETS.basePath + ZindeKalModal.ASSETS.icons.muted
            : ZindeKalModal.ASSETS.basePath + ZindeKalModal.ASSETS.icons.unmuted;
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
                        src: `${ZindeKalModal.ASSETS.basePath}playing.riv`,
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
                    // Silently handle Rive animation loading errors
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
                        src: `${ZindeKalModal.ASSETS.basePath}playing.riv`,
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
                    // Silently handle player Rive animation loading errors
                }
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, options = {}) {
        if (!this.toastElement) {
            return this;
        }

        // Default options
        const defaultOptions = {
            autoHideDelay: 5000,
            icon: 'images/kanka.png'
        };
        
        const finalOptions = { ...defaultOptions, ...options };

        // Update message
        const alertText = this.toastElement.querySelector('.alert-text');
        if (alertText && message) {
            alertText.textContent = message;
        }

        // Update icon if provided
        const alertIcon = this.toastElement.querySelector('.alert-icon');
        if (alertIcon && finalOptions.icon) {
            alertIcon.src = finalOptions.icon;
        }

        this.toastElement.classList.add('show');

        // Auto-hide after configured delay
        if (finalOptions.autoHideDelay > 0) {
            setTimeout(() => {
                this.hideToast();
            }, finalOptions.autoHideDelay);
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
            ZindeKalModal.CATEGORIES && 
            ZindeKalModal.CATEGORIES.length > 0) {
            
            // Check if any category is currently active
            const activeCategory = this.modalElement.querySelector('.category-item.active');
            if (!activeCategory) {
                const firstCategoryId = ZindeKalModal.CATEGORIES[0].id;
                this.selectCategory(firstCategoryId);
            }
        }

        // Call onOpen callback
        if (this.eventHandlers.onOpen) {
            this.eventHandlers.onOpen(this);
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

        // Clean up any inline video players
        this.cleanupInlineVideoPlayers();

        // Call onClose callback
        if (this.eventHandlers.onClose) {
            this.eventHandlers.onClose(this);
        }

        return this;
    }

    /**
     * Clean up all inline video players
     */
    cleanupInlineVideoPlayers() {
        const inlineVideoPlayers = this.modalElement.querySelectorAll('.inline-video-player');
        inlineVideoPlayers.forEach(playerContainer => {
            if (playerContainer._plyrInstance) {
                playerContainer._plyrInstance.destroy();
            }
            
            // Restore original thumbnail if available
            if (playerContainer._originalContent) {
                const thumbnailContainer = playerContainer.closest('.video-thumbnail-container');
                if (thumbnailContainer) {
                    thumbnailContainer.innerHTML = playerContainer._originalContent;
                }
            }
        });
        
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

        // Clean up any remaining inline video players
        this.cleanupInlineVideoPlayers();

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