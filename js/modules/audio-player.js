/**
 * Audio player and playback control functionality
 */
import { CONFIG } from '../config.js';
import { DOMHelpers } from '../utils/dom-helpers.js';
import { TimeHelpers } from '../utils/time-helpers.js';

export class AudioPlayer {
    constructor(audioElement) {
        this.audio = audioElement;
        this.vttCues = [];
        this.currentCueIndex = 0;
        this.isPlaying = false;
        this.currentSpeed = 1.0; // Start with 100% speed
        this.lastPlayClickTime = 0; // For double-click detection
        this.pausedPosition = null; // Track paused position
        this.isAtSentenceStart = true; // Track if at sentence start
        
        // DOM elements
        this.playBtn = null;
        this.prevBtn = null;
        this.nextBtn = null;
        this.speedBtn = null;
        this.progressBar = null;
        this.timeDisplay = null;
        
        // Callbacks
        this.onPlay = null;
        this.onPause = null;
        this.onTimeUpdate = null;
        this.onSentenceChange = null;
        this.onLoadComplete = null;
        this.onError = null;
        
        this.initializeAudioEvents();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.playBtn = DOMHelpers.getElementById('playBtn');
        this.prevBtn = DOMHelpers.getElementById('prevBtn');
        this.nextBtn = DOMHelpers.getElementById('nextBtn');
        this.speedBtn = DOMHelpers.getElementById('speedBtn');
        this.progressBar = DOMHelpers.getElementById('progressBar');
        this.timeDisplay = DOMHelpers.getElementById('timeDisplay');
        
        this.setupEventListeners();
        this.initializeSpeedButton();
    }
    
    /**
     * Setup event listeners for controls
     */
    setupEventListeners() {
        DOMHelpers.addEventListener(this.playBtn, 'click', () => this.togglePlayback());
        DOMHelpers.addEventListener(this.prevBtn, 'click', () => this.goToPreviousSentence());
        DOMHelpers.addEventListener(this.nextBtn, 'click', () => this.goToNextSentence());
        DOMHelpers.addEventListener(this.speedBtn, 'click', () => this.toggleSpeed());
    }
    
    /**
     * Initialize audio element event listeners
     */
    initializeAudioEvents() {
        if (!this.audio) return;
        
        DOMHelpers.addEventListener(this.audio, 'play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            if (this.onPlay) this.onPlay();
        });
        
        DOMHelpers.addEventListener(this.audio, 'pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            if (this.onPause) this.onPause();
        });
        
        DOMHelpers.addEventListener(this.audio, 'timeupdate', () => {
            this.handleTimeUpdate();
            if (this.onTimeUpdate) this.onTimeUpdate();
        });
        
        DOMHelpers.addEventListener(this.audio, 'loadedmetadata', () => {
            this.updatePlayButton();
            this.audio.playbackRate = this.currentSpeed;
            this.updateProgress();
            if (this.onLoadComplete) this.onLoadComplete();
        });
        
        DOMHelpers.addEventListener(this.audio, 'error', (e) => {
            const error = e.target.error;
            console.error('Audio Loading Error:', { event: e });
            this.updatePlayButton();
            if (this.onError) this.onError(error);
        });
    }
    
    /**
     * Load audio source
     */
    loadAudio(audioUrl) {
        if (!this.audio) {
            throw new Error('Audio element not available');
        }
        
        this.audio.src = audioUrl;
    }
    
    /**
     * Set VTT cues for sentence-based playback
     */
    setVTTCues(cues) {
        this.vttCues = cues || [];
        this.currentCueIndex = 0;
        this.updateNavigationButtons();
    }
    
    /**
     * Toggle playback (play/pause)
     */
    togglePlayback() {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - this.lastPlayClickTime;
        
        // Double-click detection (within 300ms)
        if (timeDiff < 300) {
            // Double-click: restart sentence from beginning
            this.restartCurrentSentence();
            return;
        }
        
        
        if (!this.audio) return;
        
        if (this.vttCues.length === 0) {
            // No cues - use normal play/pause
            if (!this.audio.paused) {
                this.audio.pause();
            } else {
                this.audio.play().catch(error => {
                    alert('Audio could not be played. Please check your internet connection.');
                });
            }
        } else {
            // With cues - use smart resume/pause
            if (!this.audio.paused) {
                // Currently playing - pause and remember position
                this.pausedPosition = this.audio.currentTime;
                this.audio.pause();
                if (this.playBtn) this.playBtn.classList.add('mid-sentence');
                this.isAtSentenceStart = false;
            } else {
                // Currently paused - resume from paused position or start from beginning
                this.playCurrentSentenceFromPosition();
            }
        }
        
        this.lastPlayClickTime = currentTime;
    }
    
    /**
     * Play audio
     */
    async play() {
        if (!this.audio) return false;
        
        try {
            await this.audio.play();
            return true;
        } catch (error) {
            console.error('Audio Playback Promise Rejected:', {
                name: error.name,
                message: error.message,
                networkState: this.audio.networkState,
                errorObject: error
            });
            if (this.onError) this.onError(error);
            return false;
        }
    }
    
    /**
     * Pause audio
     */
    pause() {
        if (!this.audio) return;
        this.audio.pause();
    }
    
    /**
     * Play current sentence from start
     */
    playCurrentSentence() {
        if (this.currentCueIndex >= 0 && this.currentCueIndex < this.vttCues.length) {
            const cue = this.vttCues[this.currentCueIndex];
            this.audio.currentTime = cue.start;
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                }).catch(error => {
                    console.error('Audio Playback Promise Rejected:', {
                        name: error.name,
                        message: error.message,
                        networkState: this.audio.networkState,
                        errorObject: error
                    });
                    alert('Audio could not be played. Please check your internet connection.');
                });
            }
        }
    }

    /**
     * Go to previous sentence
     */
    goToPreviousSentence() {
        if (this.currentCueIndex > 0) {
            this.currentCueIndex--;
            this.pausedPosition = null; // Reset pause state
            this.isAtSentenceStart = true;
            if (this.playBtn) this.playBtn.classList.remove('mid-sentence');
            this.updateCurrentSentence();
            this.seekToCurrentCue();
            if (this.onSentenceChange) {
                this.onSentenceChange(this.currentCueIndex, this.getCurrentCue());
            }
        }
    }
    
    /**
     * Go to next sentence
     */
    goToNextSentence() {
        if (this.currentCueIndex < this.vttCues.length - 1) {
            this.currentCueIndex++;
            this.pausedPosition = null; // Reset pause state
            this.isAtSentenceStart = true;
            if (this.playBtn) this.playBtn.classList.remove('mid-sentence');
            this.updateCurrentSentence();
            this.seekToCurrentCue();
            if (this.onSentenceChange) {
                this.onSentenceChange(this.currentCueIndex, this.getCurrentCue());
            }
        }
    }
    
    /**
     * Seek to current cue start time
     */
    seekToCurrentCue() {
        const cue = this.getCurrentCue();
        if (cue && this.audio) {
            this.audio.currentTime = cue.start;
        }
    }
    
    /**
     * Get current cue
     */
    getCurrentCue() {
        return this.vttCues[this.currentCueIndex] || null;
    }
    
    /**
     * Get current cue text
     */
    getCurrentText() {
        const cue = this.getCurrentCue();
        return cue ? cue.text : '';
    }
    
    /**
     * Update current sentence and navigation
     */
    updateCurrentSentence() {
        this.updateNavigationButtons();
    }
    
    /**
     * Toggle playback speed
     */
    toggleSpeed() {
        if (this.speedBtn) {
            this.speedBtn.classList.remove('speed-100', 'speed-75', 'speed-50');
        }
        
        if (this.currentSpeed === 1.0) {
            this.currentSpeed = 0.75;
            this.speedBtn.textContent = '75';
            this.speedBtn.classList.add('speed-75');
        } else if (this.currentSpeed === 0.75) {
            this.currentSpeed = 0.5;
            this.speedBtn.textContent = '50';
            this.speedBtn.classList.add('speed-50');
        } else {
            this.currentSpeed = 1.0;
            this.speedBtn.textContent = '100';
            this.speedBtn.classList.add('speed-100');
        }
        
        if (this.audio) {
            this.audio.playbackRate = this.currentSpeed;
        }
    }
    
    /**
     * Initialize speed button
     */
    initializeSpeedButton() {
        if (this.speedBtn) {
            this.speedBtn.textContent = '100';
            this.speedBtn.classList.add('speed-100');
        }
    }
    
    /**
     * Update play button state
     */
    updatePlayButton() {
        if (!this.playBtn) return;
        
        const isDisabled = !this.audio || this.audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
        
        this.playBtn.disabled = isDisabled;
        DOMHelpers.toggleClass(this.playBtn, 'playing', this.isPlaying);
    }
    
    /**
     * Update navigation buttons state
     */
    updateNavigationButtons() {
        if (this.prevBtn) {
            this.prevBtn.disabled = (this.currentCueIndex <= 0);
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = (this.currentCueIndex >= this.vttCues.length - 1);
        }
    }
    
    /**
     * Handle time update event
     */
    handleTimeUpdate() {
        this.updateProgress();
        
        // Check if current sentence should end
        if (this.vttCues.length > 0 && this.isPlaying) {
            const currentTime = this.audio.currentTime;
            const currentCue = this.vttCues[this.currentCueIndex];
            
            if (currentCue && currentTime >= currentCue.end) {
                this.pause();
            }
        }
    }
    
    /**
     * Update progress bar and time display
     */
    updateProgress() {
        if (!this.audio || !this.timeDisplay || !this.progressBar) return;
        
        const currentTime = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (duration && !isNaN(duration)) {
            const progress = (currentTime / duration) * 100;
            this.progressBar.style.width = progress + '%';
            
            DOMHelpers.setContent(
                this.timeDisplay, 
                `${TimeHelpers.formatTime(currentTime)} / ${TimeHelpers.formatTime(duration)}`
            );
        }
    }
    
    /**
     * Set current cue index
     */
    setCurrentCueIndex(index) {
        if (index >= 0 && index < this.vttCues.length) {
            this.currentCueIndex = index;
            this.updateCurrentSentence();
            this.seekToCurrentCue();
            return true;
        }
        return false;
    }
    
    /**
     * Get current cue index
     */
    getCurrentCueIndex() {
        return this.currentCueIndex;
    }
    
    /**
     * Check if at last sentence
     */
    isLastSentence() {
        return this.currentCueIndex >= this.vttCues.length - 1;
    }
    
    /**
     * Check if at first sentence
     */
    isFirstSentence() {
        return this.currentCueIndex <= 0;
    }
    
    /**
     * Get total number of sentences
     */
    getTotalSentences() {
        return this.vttCues.length;
    }
    
    /**
     * Reset to first sentence
     */
    reset() {
        this.currentCueIndex = 0;
        this.pause();
        if (this.audio) {
            this.audio.currentTime = 0;
        }
        this.updateCurrentSentence();
    }
    
    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        Object.assign(this, callbacks);
    }
    
    /**
     * Get current playback state
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            currentCueIndex: this.currentCueIndex,
            currentSpeed: this.currentSpeed,
            currentTime: this.audio ? this.audio.currentTime : 0,
            duration: this.audio ? this.audio.duration : 0,
            totalCues: this.vttCues.length
        };
    }
    
    /**
     * Restart current sentence from beginning
     */
    restartCurrentSentence() {
        if (this.currentCueIndex >= 0 && this.currentCueIndex < this.vttCues.length) {
            const cue = this.vttCues[this.currentCueIndex];
            this.audio.currentTime = cue.start;
            this.pausedPosition = null;
            this.isAtSentenceStart = true;
            
            if (this.playBtn) {
                DOMHelpers.toggleClass(this.playBtn, 'mid-sentence', false);
            }
            
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                }).catch(error => {
                    console.error('Audio playback failed:', error);
                    alert('Audio could not be played. Please check your internet connection.');
                });
            }
        }
    }
    
    /**
     * Play current sentence from position (resume or start)
     */
    playCurrentSentenceFromPosition() {
        if (this.currentCueIndex >= 0 && this.currentCueIndex < this.vttCues.length) {
            const cue = this.vttCues[this.currentCueIndex];
            
            if (this.pausedPosition !== null && this.pausedPosition > cue.start && this.pausedPosition < cue.end) {
                // Resume from paused position
                this.audio.currentTime = this.pausedPosition;
            } else {
                // Start from beginning
                this.audio.currentTime = cue.start;
                this.pausedPosition = null;
                this.isAtSentenceStart = true;
                if (this.playBtn) this.playBtn.classList.remove('mid-sentence');
            }
            
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Audio playback failed:', error);
                    alert('Audio could not be played. Please check your internet connection.');
                });
            }
        }
    }
}
