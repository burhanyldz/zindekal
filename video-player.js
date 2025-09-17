/**
 * ZindeKal Video Player - Enhanced Plyr Implementation for Modal
 * Simplified video player based on BookVideoPlayer for modal integration
 */

class ZindeKalVideoPlayer {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      // Player settings
      player: {
        autoHideControls: true,
        skipSeconds: 10,
        controlsTimeout: 3000,
        ...config.player
      },
      
      // UI settings
      ui: {
        mobileBreakpoint: 500,
        ...config.ui
      },
      
      // Video source and poster
      videoSrc: config.videoSrc || '',
      videoPoster: config.videoPoster || '',
      
      // Container element
      container: config.container || null,
      
      // Callbacks
      callbacks: {
        onPlayerReady: null,
        onPlay: null,
        onPause: null,
        onEnded: null,
        onBackClick: null,
        ...config.callbacks
      }
    };

    // Initialize state
    this.state = {
      initialized: false,
      firstPlay: false,
      currentTime: 0,
      areControlsVisible: true,
      hideControls: false
    };

    // Initialize timeouts
    this.timeouts = {
      controlTimeout: null
    };

    // Initialize DOM elements
    this.elements = {
      container: null,
      videoContainer: null,
      backButton: null,
      fastForwardArea: null,
      fastRewindArea: null
    };

    // Initialize player instance
    this.player = null;
  }

  /**
   * Initialize the player with configuration
   */
  async init() {
    try {
      if (!this.config.container) {
        throw new Error('Container element is required');
      }
      
      this.createPlayerStructure();
      this.player = await this.initPlayer();
      
      this.setupPlayerUI();
      this.bindPlayerEvents();
      
      if (this.config.callbacks.onPlayerReady) {
        this.config.callbacks.onPlayerReady(this.player);
      }
      
      return this.player;
    } catch (error) {
      console.error('Failed to initialize ZindeKalVideoPlayer:', error);
      throw error;
    }
  }

  /**
   * Create the player HTML structure
   */
  createPlayerStructure() {
    const containerElement = this.config.container;
    
    containerElement.innerHTML = `
      <div class="zindekal-video-player">
        <button class="back-button" id="video-back-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Geri
        </button>
        <div class="video-container-wrapper">
          <div id="zindekal-video-container">
            <video crossorigin id="zindekal-player" data-poster="${this.config.videoPoster}">
              <source src="${this.config.videoSrc}" type="video/mp4">
            </video>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize the Plyr player
   */
  async initPlayer() {
    return new Promise((resolve, reject) => {
      // Determine if controls should be hidden based on device type
      this.state.hideControls = this.isMouseConnected() && this.config.player.autoHideControls;

      const playerElement = document.getElementById("zindekal-player");
      if (!playerElement) {
        reject(new Error("Player element not found"));
        return;
      }

      this.player = new Plyr(playerElement, this.getPlayerConfig());

      this.player.on("ready", (event) => {
        setTimeout(() => {
          resolve(this.player);
        }, 500);

        if (!this.state.initialized) {
          this.state.initialized = true;
          this.initializeOverlayPlayButton();
        }
      });
    });
  }

  /**
   * Get Plyr configuration
   */
  getPlayerConfig() {
    return {
      clickToPlay: false,
      invertTime: false,
      playsinline: true,
      hideControls: this.state.hideControls,
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'duration', 
        'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
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
   * Setup player UI elements
   */
  setupPlayerUI() {
    this.elements.container = document.querySelector(".plyr");
    this.elements.videoContainer = document.getElementById("zindekal-video-container");
    this.elements.backButton = document.getElementById("video-back-button");
    
    // Setup back button click handler
    if (this.elements.backButton) {
      this.elements.backButton.addEventListener('click', () => {
        if (this.config.callbacks.onBackClick) {
          this.config.callbacks.onBackClick();
        }
      });
    }

    // Setup responsive layout
    this.setupResponsiveLayout();
  }

  /**
   * Setup responsive layout based on screen size
   */
  setupResponsiveLayout() {
    const width = this.elements.videoContainer ? this.elements.videoContainer.offsetWidth : window.innerWidth;
    const isMobile = width < this.config.ui.mobileBreakpoint;

    if (isMobile) {
      this.setupMobileLayout();
    } else {
      this.setupDesktopLayout();
    }
  }

  /**
   * Setup mobile layout
   */
  setupMobileLayout() {
    if (this.elements.container) {
      this.elements.container.classList.add("mobile-frame");
      this.elements.container.classList.remove("desktop-frame");
    }
  }

  /**
   * Setup desktop layout
   */
  setupDesktopLayout() {
    if (this.elements.container) {
      this.elements.container.classList.add("desktop-frame");
      this.elements.container.classList.remove("mobile-frame");
    }
  }

  /**
   * Bind player events
   */
  bindPlayerEvents() {
    this.player.on("play", (event) => this.handlePlay(event));
    this.player.on("pause", (event) => this.handlePause(event));
    this.player.on("ended", (event) => this.handleEnded(event));
    this.player.on("controlshidden", (event) => this.handleControlsHidden(event));
    this.player.on("controlsshown", (event) => this.handleControlsShown(event));
    this.player.on("enterfullscreen", (event) => this.handleEnterFullscreen(event));
    this.player.on("exitfullscreen", (event) => this.handleExitFullscreen(event));
    
    // Also listen to the native video element events as backup
    const videoElement = this.player.media;
    if (videoElement) {
      videoElement.addEventListener('play', () => {
        this.hideOverlayPlayButton();
      });
      videoElement.addEventListener('pause', () => {
        this.showOverlayPlayButton();
      });
      videoElement.addEventListener('ended', () => {
        this.showOverlayPlayButton();
      });
    }
  }

  /**
   * Handle play event
   */
  handlePlay(event) {
    if (!this.state.firstPlay) {
      this.state.firstPlay = true;
      this.createFastControlAreas();
    }

    // Hide the overlay play button when playing
    setTimeout(() => {
      this.hideOverlayPlayButton();
    }, 100);

    if (!this.state.hideControls) {
      this.hideControlsWithDelay();
    }

    if (this.config.callbacks.onPlay) {
      this.config.callbacks.onPlay(event);
    }
  }

  /**
   * Handle pause event
   */
  handlePause(event) {
    // Show the overlay play button when paused
    this.showOverlayPlayButton();

    if (!this.state.hideControls) {
      this.showControls();
    }

    if (this.config.callbacks.onPause) {
      this.config.callbacks.onPause(event);
    }
  }

  /**
   * Handle ended event
   */
  handleEnded(event) {
    // Show the overlay play button when video ends
    this.showOverlayPlayButton();

    if (this.config.callbacks.onEnded) {
      this.config.callbacks.onEnded(event);
    }
  }

  /**
   * Handle controls hidden event
   */
  handleControlsHidden(event) {
    this.state.areControlsVisible = false;
    this.hideBackButton();
  }

  /**
   * Handle controls shown event
   */
  handleControlsShown(event) {
    this.state.areControlsVisible = true;
    this.showBackButton();
  }

  /**
   * Handle enter fullscreen event
   */
  handleEnterFullscreen(event) {
    this.hideBackButton();
  }

  /**
   * Handle exit fullscreen event
   */
  handleExitFullscreen(event) {
    this.showBackButton();
  }

  /**
   * Create fast forward/rewind areas
   */
  createFastControlAreas() {
    if (!this.elements.container) return;

    // Fast forward area
    this.elements.fastForwardArea = this.createElement("div", "fast-forward-area", this.getFastForwardHTML());
    this.elements.fastForwardArea.addEventListener("click", () => this.fastForward());
    this.elements.container.appendChild(this.elements.fastForwardArea);

    // Fast rewind area
    this.elements.fastRewindArea = this.createElement("div", "fast-rewind-area", this.getFastRewindHTML());
    this.elements.fastRewindArea.addEventListener("click", () => this.fastRewind());
    this.elements.container.appendChild(this.elements.fastRewindArea);
  }

  /**
   * Get fast forward HTML
   */
  getFastForwardHTML() {
    return `
      <button>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 19L20 12L13 5V19Z" fill="currentColor"/>
          <path d="M4 19L11 12L4 5V19Z" fill="currentColor"/>
        </svg>
      </button>
    `;
  }

  /**
   * Get fast rewind HTML
   */
  getFastRewindHTML() {
    return `
      <button>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 5L4 12L11 19V5Z" fill="currentColor"/>
          <path d="M20 5L13 12L20 19V5Z" fill="currentColor"/>
        </svg>
      </button>
    `;
  }

  /**
   * Fast forward video
   */
  fastForward() {
    if (this.player) {
      this.player.forward(this.config.player.skipSeconds);
    }
  }

  /**
   * Fast rewind video
   */
  fastRewind() {
    if (this.player) {
      this.player.rewind(this.config.player.skipSeconds);
    }
  }

  /**
   * Hide controls with delay
   */
  hideControlsWithDelay() {
    if (this.timeouts.controlTimeout) {
      clearTimeout(this.timeouts.controlTimeout);
    }
    
    this.timeouts.controlTimeout = setTimeout(() => {
      if (this.player && this.player.playing) {
        this.player.toggleControls(false);
      }
    }, this.config.player.controlsTimeout);
  }

  /**
   * Show controls immediately
   */
  showControls() {
    if (this.timeouts.controlTimeout) {
      clearTimeout(this.timeouts.controlTimeout);
    }
    
    if (this.player) {
      this.player.toggleControls(true);
    }
  }

  /**
   * Hide back button
   */
  hideBackButton() {
    if (this.elements.backButton) {
      this.elements.backButton.classList.add('hidden');
    }
  }

  /**
   * Show back button
   */
  showBackButton() {
    if (this.elements.backButton) {
      this.elements.backButton.classList.remove('hidden');
    }
  }

  /**
   * Hide overlay play button
   */
  hideOverlayPlayButton() {
    const playButton = document.querySelector('.plyr__control--overlaid');
    if (playButton) {
      playButton.style.display = 'none';
    }
  }

  /**
   * Show overlay play button
   */
  showOverlayPlayButton() {
    const playButton = document.querySelector('.plyr__control--overlaid');
    if (playButton) {
      playButton.style.display = 'block';
    }
  }

  /**
   * Initialize overlay play button state
   */
  initializeOverlayPlayButton() {
    // Show overlay play button initially (when video is not playing)
    this.showOverlayPlayButton();
  }

  /**
   * Check if mouse is connected (non-touch device)
   */
  isMouseConnected() {
    return window.matchMedia("(pointer: fine)").matches;
  }

  /**
   * Create element helper
   */
  createElement(tag, className, innerHTML) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
  }

  /**
   * Update video source
   */
  updateVideoSource(src, poster = '') {
    if (this.player && this.player.media) {
      this.player.source = {
        type: 'video',
        sources: [{
          src: src,
          type: 'video/mp4'
        }],
        poster: poster
      };
      
      this.config.videoSrc = src;
      this.config.videoPoster = poster;
    }
  }

  /**
   * Play video
   */
  play() {
    if (this.player) {
      this.player.play();
    }
  }

  /**
   * Pause video
   */
  pause() {
    if (this.player) {
      this.player.pause();
    }
  }

  /**
   * Destroy the player and clean up
   */
  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    // Clear timeouts
    if (this.timeouts.controlTimeout) {
      clearTimeout(this.timeouts.controlTimeout);
    }

    // Reset state
    this.state.initialized = false;
    this.state.firstPlay = false;

    return this;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZindeKalVideoPlayer;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return ZindeKalVideoPlayer; });
} else {
    window.ZindeKalVideoPlayer = ZindeKalVideoPlayer;
}