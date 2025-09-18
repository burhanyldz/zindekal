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
                exercise: { title: "Egzersizler", enabled: true },
                music: { title: "Müzikler", enabled: true },
                relaxing: { title: "Videolar", enabled: true }
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

        // Initialize mobile viewport handling
        this.initMobileViewportHandler();

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
        
        
        // Music tab
        if (this.config.tabs.music.enabled) {
            content += this.generateMusicTab();
        }
        
            // Relaxing videos tab
        if (this.config.tabs.relaxing.enabled) {
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
        console.log('=== HANDLEACTION START ===');
        console.log('Action:', action);
        console.log('Event target:', event.target);
        console.log('Event current target:', event.currentTarget);
        
        switch (action) {
            case 'close':
                console.log('Handling close action');
                this.close();
                break;
            case 'play-video':
                console.log('Handling play-video action');
                
                const clickedElement = event.target.closest('[data-video-src]');
                console.log('Clicked element with data-video-src:', clickedElement);
                
                const videoSrc = clickedElement?.dataset.videoSrc;
                console.log('Extracted video source:', videoSrc);
                
                if (clickedElement) {
                    const videoCard = clickedElement.closest('.video-card');
                    console.log('Video card:', videoCard);
                    console.log('Video card ID:', videoCard?.getAttribute('data-video-id'));
                    
                    const parentTab = clickedElement.closest('.tab-content');
                    console.log('Parent tab of clicked element:', parentTab?.id);
                    console.log('Parent tab is currently active:', parentTab?.classList.contains('active'));
                    
                    const currentActiveTab = this.modalElement.querySelector('.tab-content.active');
                    console.log('Currently active tab:', currentActiveTab?.id);
                }
                
                if (videoSrc) {
                    console.log('Calling playVideo with source:', videoSrc);
                    this.playVideo(videoSrc);
                } else {
                    console.error('No video source found for play-video action');
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
        console.log('=== SWITCHTAB START ===');
        console.log('Requested tab name:', tabName);
        console.log('Current tab before switch:', this.currentTab);
        console.log('Available tabs config:', Object.keys(this.config.tabs));
        console.log('Tab enabled status:', this.config.tabs[tabName]?.enabled);
        
        if (!this.config.tabs[tabName]?.enabled) {
            console.warn(`ZindeKalModal: Tab "${tabName}" is not enabled`);
            return this;
        }

        // Update current tab
        const oldTab = this.currentTab;
        this.currentTab = tabName;
        console.log('Updated current tab from', oldTab, 'to', this.currentTab);

        // Update tab navigation
        console.log('Updating tab navigation elements...');
        this.modalElement.querySelectorAll('.tab-item').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            console.log(`Tab item ${tab.dataset.tab}: setting active = ${isActive}`);
            tab.classList.toggle('active', isActive);
        });

        // Update tab content
        console.log('Updating tab content elements...');
        this.modalElement.querySelectorAll('.tab-content').forEach(content => {
            const expectedId = `${tabName}-tab`;
            const isActive = content.id === expectedId;
            console.log(`Tab content ${content.id}: should be ${expectedId}, setting active = ${isActive}`);
            content.classList.toggle('active', isActive);
        });

        // Initialize audio player when switching to music tab
        if (tabName === 'music' && !this.audioPlayer) {
            console.log('Initializing audio player for music tab...');
            this.initializeAudioPlayer();
        }

        // Ensure first category is selected when switching to exercise tab
        if (tabName === 'exercise' && 
            this.config.exercise.categories && 
            this.config.exercise.categories.length > 0) {
            
            const firstCategoryId = this.config.exercise.categories[0].id;
            console.log('Selecting first category for exercise tab:', firstCategoryId);
            this.selectCategory(firstCategoryId);
        }

        // Call onTabChange callback
        if (this.config.events.onTabChange) {
            console.log('Calling onTabChange callback...');
            this.config.events.onTabChange(tabName, oldTab, this);
        }

        console.log('=== SWITCHTAB END ===');
        console.log('Final current tab:', this.currentTab);
        
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
        console.log('=== PLAYVIDEO START ===');
        console.log('Video source requested:', videoSrc);
        console.log('Video poster:', videoPoster);
        
        // Pause all other playing videos first
        this.pauseAllOtherVideos();
        
        // FIXED: Find the clicked video element in the CURRENT ACTIVE TAB first
        const currentActiveTab = this.modalElement.querySelector('.tab-content.active');
        console.log('Current active tab:', currentActiveTab?.id);
        
        let playButton = null;
        if (currentActiveTab) {
            // Look for the video in the current active tab first
            playButton = currentActiveTab.querySelector(`[data-video-src="${videoSrc}"]`);
            console.log('Play button found in current tab:', playButton);
        }
        
        // If not found in current tab, search globally (fallback)
        if (!playButton) {
            playButton = this.modalElement.querySelector(`[data-video-src="${videoSrc}"]`);
            console.log('Play button found globally (fallback):', playButton);
        }
        
        if (!playButton) {
            console.error('ZindeKalModal: Could not find video element for src:', videoSrc);
            return this;
        }

        const videoCard = playButton.closest('.video-card');
        console.log('Video card found:', videoCard);
        console.log('Video card data-video-id:', videoCard?.getAttribute('data-video-id'));
        
        const thumbnailContainer = videoCard.querySelector('.video-thumbnail-container');
        console.log('Thumbnail container found:', thumbnailContainer);
        
        if (!thumbnailContainer) {
            console.error('ZindeKalModal: Could not find video thumbnail container');
            return this;
        }

        // Find video data to get poster/thumbnail
        let videoData = null;
        const allVideos = [...(this.config.exercise.videos || []), ...(this.config.relaxing.videos || [])];
        console.log('All available videos:', allVideos.map(v => ({ id: v.id, src: v.src })));
        
        // FIXED: Match by both src AND the video card's data-video-id for precise identification
        const videoCardId = videoCard.getAttribute('data-video-id');
        videoData = allVideos.find(video => video.src === videoSrc && video.id === videoCardId);
        console.log('Found video data by src + id match:', videoData);
        
        // Fallback to src-only match if needed
        if (!videoData) {
            videoData = allVideos.find(video => video.src === videoSrc);
            console.log('Fallback: Found video data by src only:', videoData);
        }
        
        if (videoData && !videoPoster) {
            videoPoster = videoData.thumbnail || '';
        }

        // Check which tab this video belongs to
        const parentTab = thumbnailContainer.closest('.tab-content');
        console.log('Parent tab of clicked video:', parentTab?.id);
        console.log('Parent tab is active:', parentTab?.classList.contains('active'));
        
        // Determine expected tab based on video data
        let expectedTab = 'unknown';
        if (this.config.exercise.videos?.some(v => v.id === videoCardId)) {
            expectedTab = 'exercise';
        } else if (this.config.relaxing.videos?.some(v => v.id === videoCardId)) {
            expectedTab = 'relaxing';
        }
        console.log('Expected tab for this video (by ID):', expectedTab);
        console.log('Current tab matches expected:', currentActiveTab?.id === `${expectedTab}-tab`);

        // Create unique ID for this video player
        const videoId = `inline-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('Generated video ID:', videoId);
        
        // Store original thumbnail content for potential restoration
        const originalContent = thumbnailContainer.innerHTML;
        console.log('Stored original content length:', originalContent.length);
        
        // Replace thumbnail container content with video player
        thumbnailContainer.innerHTML = `
            <div class="inline-video-player" id="${videoId}">
                <video crossorigin class="inline-video" data-poster="${videoPoster}">
                    <source src="${videoSrc}" type="video/mp4">
                </video>
            </div>
        `;
        console.log('Replaced thumbnail with video player HTML');

        // Initialize inline video player
        const videoElement = thumbnailContainer.querySelector('.inline-video');
        const playerContainer = thumbnailContainer.querySelector('.inline-video-player');
        
        console.log('Video element created:', videoElement);
        console.log('Player container created:', playerContainer);
        
        if (!videoElement) {
            console.error('ZindeKalModal: Failed to create video element');
            thumbnailContainer.innerHTML = originalContent;
            return this;
        }

        try {
            // FIXED: Check if we're already in the correct tab - if so, don't switch!
            const parentTab = thumbnailContainer.closest('.tab-content');
            console.log('Checking parent tab visibility...');
            console.log('Parent tab found:', parentTab?.id);
            console.log('Parent tab is active:', parentTab?.classList.contains('active'));
            
            if (parentTab && !parentTab.classList.contains('active')) {
                console.log('>>> TAB NOT ACTIVE - SWITCHING TABS <<<');
                // If tab is not active, make it active first
                const tabId = parentTab.id.replace('-tab', '');
                console.log('Extracted tab ID for switching:', tabId);
                console.log('About to call switchTab with:', tabId);
                
                this.switchTab(tabId);
                
                console.log('Tab switch called, waiting 150ms before initializing video...');
                // Wait a bit for tab switch to complete
                setTimeout(() => {
                    console.log('Timeout completed, calling initializeVideoPlayer...');
                    this.initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc);
                }, 150);
                return this;
            }
            
            console.log('Parent tab is already active, initializing video directly...');
            this.initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc);

        } catch (error) {
            console.error('Failed to initialize inline video player:', error);
            console.error('Error stack:', error.stack);
            thumbnailContainer.innerHTML = originalContent;
        }

        console.log('=== PLAYVIDEO END ===');
        return this;
    }

    /**
     * Initialize video player with proper timing and visibility handling
     */
    initializeVideoPlayer(videoElement, playerContainer, originalContent, videoSrc) {
        console.log('=== INITIALIZEVIDEOPLAYER START ===');
        console.log('Video element:', videoElement);
        console.log('Player container:', playerContainer);
        console.log('Video source:', videoSrc);
        
        // Check current tab state
        const currentActiveTab = this.modalElement.querySelector('.tab-content.active');
        console.log('Current active tab during initialization:', currentActiveTab?.id);
        
        const parentTab = playerContainer.closest('.tab-content');
        console.log('Parent tab of video being initialized:', parentTab?.id);
        console.log('Parent tab is active:', parentTab?.classList.contains('active'));
        
        // Force layout refresh before initializing Plyr
        playerContainer.offsetHeight;
        
        // Initialize Plyr for this specific video
        const player = new Plyr(videoElement, this.getInlinePlayerConfig());
        console.log('Plyr instance created:', player);
        
        // Store player reference on the container for cleanup
        playerContainer._plyrInstance = player;
        playerContainer._originalContent = originalContent;
        
        // Add loading state to help with visibility
        playerContainer.classList.add('plyr-loading');
        console.log('Added plyr-loading class');
        
        player.on('ready', () => {
            console.log('=== PLYR READY EVENT ===');
            console.log('Inline video player ready for:', videoSrc);
            
            // Check tab state when ready
            const activeTabNow = this.modalElement.querySelector('.tab-content.active');
            console.log('Active tab when player ready:', activeTabNow?.id);
            
            // Remove loading state and ensure visibility
            playerContainer.classList.remove('plyr-loading');
            playerContainer.style.visibility = 'visible';
            playerContainer.style.opacity = '1';
            console.log('Removed loading state and set visibility');
            
            // Force another layout refresh
            playerContainer.offsetHeight;
            
            // Auto-play the video
            player.play().catch(error => {
                console.warn('Auto-play failed:', error);
            });
            
            if (this.config.events.onVideoPlay) {
                this.config.events.onVideoPlay(videoSrc, this);
            }
            console.log('=== PLYR READY EVENT END ===');
        });

        // Add event listener for when video actually starts playing
        player.on('play', () => {
            console.log('=== VIDEO PLAY EVENT ===');
            console.log('Video started playing:', videoSrc);
            console.log('Player container ID:', playerContainer.id);
            
            // Pause all OTHER videos when this one starts playing
            this.pauseAllOtherVideos(playerContainer);
            
            console.log('=== VIDEO PLAY EVENT END ===');
        });

        // Add event listener for when video is paused
        player.on('pause', () => {
            console.log('=== VIDEO PAUSE EVENT ===');
            console.log('Video paused:', videoSrc);
            console.log('Player container ID:', playerContainer.id);
            console.log('=== VIDEO PAUSE EVENT END ===');
        });

        player.on('loadstart', () => {
            console.log('Video load started for:', videoSrc);
            playerContainer.style.visibility = 'visible';
        });

        player.on('loadeddata', () => {
            console.log('Video data loaded for:', videoSrc);
            playerContainer.style.opacity = '1';
        });

        player.on('ended', () => {
            console.log('Inline video ended:', videoSrc);
            // Optionally restore thumbnail after video ends
            // this.restoreVideoThumbnail(thumbnailContainer);
        });

        player.on('error', (error) => {
            console.error('Inline video player error:', error);
            this.restoreVideoThumbnail(playerContainer.closest('.video-thumbnail-container'));
        });

        // Set initial visibility
        setTimeout(() => {
            playerContainer.style.visibility = 'visible';
            playerContainer.style.opacity = '1';
            playerContainer.offsetHeight; // Force layout
            console.log('Set delayed visibility for player container');
        }, 100);
        
        console.log('=== INITIALIZEVIDEOPLAYER END ===');

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
        console.log('=== PAUSEALLOTHERVIDEOS START ===');
        console.log('Exclude container:', excludeContainer?.id);
        
        const allVideoPlayers = this.modalElement.querySelectorAll('.inline-video-player');
        console.log('Found video players:', allVideoPlayers.length);
        
        let pausedCount = 0;
        allVideoPlayers.forEach(playerContainer => {
            // Skip the container we want to exclude (current playing video)
            if (excludeContainer && playerContainer === excludeContainer) {
                console.log('Skipping current video player:', playerContainer.id);
                return;
            }
            
            if (playerContainer._plyrInstance) {
                try {
                    // Pause the video if it's playing
                    if (!playerContainer._plyrInstance.paused) {
                        playerContainer._plyrInstance.pause();
                        pausedCount++;
                        console.log('Paused video player:', playerContainer.id);
                    } else {
                        console.log('Video player already paused:', playerContainer.id);
                    }
                } catch (error) {
                    console.warn('Failed to pause video player:', error);
                }
            } else {
                console.log('No Plyr instance found for container:', playerContainer.id);
            }
        });
        
        console.log('Total videos paused:', pausedCount);
        console.log('=== PAUSEALLOTHERVIDEOS END ===');
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

        // Clean up any inline video players
        this.cleanupInlineVideoPlayers();

        // Call onClose callback
        if (this.config.events.onClose) {
            this.config.events.onClose(this);
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