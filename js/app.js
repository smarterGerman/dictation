/**
 * Main application controller for the German Dictation Tool
 */
import { CONFIG } from './config.js';
import { StateManager } from './modules/state-manager.js';
import { AutoResize } from './modules/auto-resize.js';
import { LessonLoader } from './modules/lesson-loader.js';
import { AudioPlayer } from './modules/audio-player.js';
import { UIControls } from './modules/ui-controls.js';
import { KeyboardShortcuts } from './modules/keyboard-shortcuts.js';
import { Statistics } from './modules/statistics.js';
import { Exporter } from './modules/export.js';
import { DOMHelpers } from './utils/dom-helpers.js';

export class DictationApp {
    constructor() {
        // Core modules
        this.state = new StateManager();
        this.autoResize = new AutoResize();
        this.lessonLoader = new LessonLoader();
        this.audioPlayer = null;
        this.uiControls = new UIControls();
        this.keyboard = new KeyboardShortcuts();
        this.statistics = new Statistics();
        this.exporter = new Exporter();
        
        // Initialization flag
        this.initialized = false;
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initialized) {
            console.warn('DictationApp already initialized');
            return;
        }
        
        try {
            
            // Update loading text
            this.updateLoadingText('Initializing interface...');
            
            // Initialize auto-resize first
            this.autoResize.initialize();
            
            // Initialize audio player
            const audioElement = DOMHelpers.getElementById('audioPlayer', true);
            this.audioPlayer = new AudioPlayer(audioElement);
            this.audioPlayer.initializeElements();
            
            // Initialize UI controls
            this.uiControls.initialize();
            
            // Initialize keyboard shortcuts
            this.keyboard.initialize();
            this.keyboard.setUserInputElement(this.uiControls.userInput);
            
            // Initialize exporter
            this.exporter.initialize();
            
            // Setup callbacks and event handlers
            this.setupCallbacks();
            this.setupStateSubscriptions();
            
            // Update loading text
            this.updateLoadingText('Loading lesson data...');
            
            // Load lessons and initial lesson
            await this.loadInitialData();
            
            // Update loading text
            this.updateLoadingText('Ready!');
            
            // Hide loading overlay after a brief delay
            setTimeout(() => {
                this.hideLoadingOverlay();
                // Focus input
                this.uiControls.focusInput();
            }, 500);
            
            this.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize DictationApp:', error);
            this.showLoadingError(`Failed to initialize: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Setup callbacks between modules
     */
    setupCallbacks() {
        // Audio player callbacks
        this.audioPlayer.setCallbacks({
            onPlay: () => {
                this.state.setPlaying(true);
                this.uiControls.focusInput();
            },
            onPause: () => {
                this.state.setPlaying(false);
            },
            onSentenceChange: (index, cue) => {
                this.handleSentenceChange(index, cue);
            },
            onError: (error) => {
                alert('Audio could not be played. Please check your internet connection.');
            }
        });
        
        // UI controls callbacks
        this.uiControls.setCallbacks({
            onInputChange: (value) => {
                this.handleInputChange(value);
            },
            onEndDictation: () => {
                this.showFinalResult();
            },
            onHintShown: () => {
                this.state.showHint();
                setTimeout(() => this.autoResize.triggerResize(), 100);
            },
            onHintHidden: () => {
                this.state.hideHint();
            }
        });
        
        // Keyboard shortcuts callbacks
        this.keyboard.setHandlers({
            onPlayPause: () => this.audioPlayer.togglePlayback(),
            onPreviousSentence: () => this.goToPreviousSentence(),
            onNextSentence: () => this.goToNextSentence(),
            onPlayCurrentSentence: () => this.audioPlayer.playCurrentSentence(),
            onToggleSpeed: () => this.audioPlayer.toggleSpeed(),
            onShowHint: () => {
                this.uiControls.showHint();
                if (this.uiControls.hintBtn) this.uiControls.hintBtn.focus();
            },
            onProcessSentence: () => this.processCurrentSentenceAndAdvance()
        });
    }
    
    /**
     * Setup state change subscriptions
     */
    setupStateSubscriptions() {
        // Subscribe to cue changes to update reference text
        this.state.subscribe(({ path, newValue }) => {
            if (path === 'currentCueIndex' || path === 'vttCues') {
                const cues = this.state.getVTTCues();
                const index = this.state.getCurrentCueIndex();
                
                if (cues && cues[index]) {
                    this.uiControls.setReferenceText(cues[index].text);
                    this.state.setReferenceText(cues[index].text);
                }
            }
        });
        
        // Subscribe to user input changes
        this.state.subscribe(({ newValue }) => {
            if (!this.statistics.hasStartedCurrentSentence() && newValue && newValue.trim().length > 0) {
                this.statistics.startSentenceTiming();
            }
        }, 'userInput');
    }
    
    /**
     * Load initial data (lessons and default lesson)
     */
    async loadInitialData() {
        try {
            // Load all lessons
            const lessons = await this.lessonLoader.loadAllLessons();
            this.state.setAllLessons(lessons);
            
            // Get lesson ID from URL or use default
            const lessonId = this.getLessonIdFromUrl() || CONFIG.defaultLesson;
            
            // Load the lesson
            await this.loadLesson(lessonId);
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }
    
    /**
     * Load a specific lesson
     */
    async loadLesson(lessonId) {
        try {
            
            // Disable play button during loading
            if (this.audioPlayer.playBtn) {
                this.audioPlayer.playBtn.disabled = true;
            }
            
            // Get lesson data
            const lessonData = this.lessonLoader.getLessonData(lessonId);
            
            // Load VTT cues
            const cues = await this.lessonLoader.loadVTTFromUrl(lessonData.vttUrl);
            
            if (cues.length === 0) {
                throw new Error(`Failed to load VTT for lesson ${lessonId}`);
            }
            
            // Update state
            this.state.setCurrentLesson(lessonId);
            this.state.setVTTCues(cues);
            
            // Set audio source
            this.audioPlayer.loadAudio(lessonData.audioUrl);
            this.audioPlayer.setVTTCues(cues);
            
            // Reset UI
            this.resetSession();
            
            // Set initial reference text
            if (cues[0]) {
                this.uiControls.setReferenceText(cues[0].text);
                this.state.setReferenceText(cues[0].text);
            }
            
            
        } catch (error) {
            console.error(`Failed to load lesson ${lessonId}:`, error);
            throw error;
        }
    }
    
    /**
     * Handle user input changes
     */
    handleInputChange(value) {
        this.state.setUserInput(value);
        
        // Start timing if not already started
        if (!this.statistics.hasStartedCurrentSentence() && value.trim().length > 0) {
            this.statistics.startSentenceTiming();
        }
    }
    
    /**
     * Handle sentence navigation
     */
    handleSentenceChange(index, cue) {
        this.state.setCurrentCueIndex(index);
        this.uiControls.clearInput();
        this.uiControls.updatePlaceholder(index);
        this.statistics.resetSentenceTiming();
        this.statistics.hideStatsSection();
        
        setTimeout(() => this.autoResize.triggerResize(), 100);
    }
    
    /**
     * Go to previous sentence
     */
    goToPreviousSentence() {
        this.audioPlayer.goToPreviousSentence();
    }
    
    /**
     * Go to next sentence
     */
    goToNextSentence() {
        this.audioPlayer.goToNextSentence();
    }
    
    /**
     * Process current sentence and advance
     */
    processCurrentSentenceAndAdvance() {
        const userInput = this.uiControls.getUserInput();
        
        if (!userInput.trim()) {
            this.audioPlayer.playCurrentSentence();
            return;
        }
        
        // Record the result
        const referenceText = this.state.getReferenceText();
        const currentIndex = this.state.getCurrentCueIndex();
        
        this.statistics.recordSentenceResult(
            currentIndex,
            referenceText,
            userInput,
            { 
                ignoreCase: this.uiControls.getIgnoreCase(),
                ignorePunctuation: true
            }
        );
        
        // Move to next sentence or show final results
        if (!this.audioPlayer.isLastSentence()) {
            this.goToNextSentence();
            this.audioPlayer.playCurrentSentence();
        } else {
            this.showFinalResult();
        }
    }
    
    /**
     * Show final results
     */
    showFinalResult() {
        
        const userInput = this.uiControls.getUserInput();
        
        // If there's text in the current sentence and it hasn't been processed yet
        const currentIndex = this.state.getCurrentCueIndex();
        const sessionResults = this.statistics.getSessionResults();
        
        if (userInput.trim() && sessionResults.length === currentIndex) {
            const referenceText = this.state.getReferenceText();
            
            this.statistics.recordSentenceResult(
                currentIndex,
                referenceText,
                userInput,
                { 
                    ignoreCase: this.uiControls.getIgnoreCase(),
                    ignorePunctuation: true
                }
            );
        }
        
        // Show final statistics
        const stats = this.statistics.showFinalResults();
        this.state.showStats();
        
        // Setup export functionality
        this.setupExportHandlers();
        
        setTimeout(() => this.autoResize.triggerResize(), 100);
        
        return stats;
    }
    
    /**
     * Setup export button handlers
     */
    setupExportHandlers() {
        const exportBtn = DOMHelpers.getElementById('exportCsvBtn');
        if (exportBtn) {
            // Remove existing listeners
            exportBtn.replaceWith(exportBtn.cloneNode(true));
            const newExportBtn = DOMHelpers.getElementById('exportCsvBtn');
            
            DOMHelpers.addEventListener(newExportBtn, 'click', () => {
                this.exportResults();
            });
        }
        
        const restartBtn = DOMHelpers.getElementById('restartBtn');
        if (restartBtn) {
            // Remove existing listeners
            restartBtn.replaceWith(restartBtn.cloneNode(true));
            const newRestartBtn = DOMHelpers.getElementById('restartBtn');
            
            DOMHelpers.addEventListener(newRestartBtn, 'click', () => {
                this.restartDictation();
            });
        }
    }
    
    /**
     * Export results to CSV
     */
    exportResults() {
        const sessionResults = this.statistics.getSessionResults();
        const lessonId = this.state.getCurrentLesson();
        const totalTime = this.statistics.getSessionTime();
        
        this.exporter.exportSessionResults(sessionResults, lessonId, totalTime);
    }
    
    /**
     * Restart dictation
     */
    restartDictation() {
        
        // Reset state
        this.state.setCurrentCueIndex(0);
        
        // Reset audio
        this.audioPlayer.reset();
        
        // Reset UI
        this.uiControls.reset();
        this.uiControls.updatePlaceholder(0);
        
        // Reset statistics
        this.statistics.clear();
        
        // Set reference text for first sentence
        const cues = this.state.getVTTCues();
        if (cues && cues[0]) {
            this.uiControls.setReferenceText(cues[0].text);
            this.state.setReferenceText(cues[0].text);
        }
        
        // Focus input
        this.uiControls.focusInput();
        
    }
    
    /**
     * Reset session but keep lesson loaded
     */
    resetSession() {
        // Clear statistics
        this.statistics.clear();
        
        // Reset UI
        this.uiControls.reset();
        this.uiControls.updatePlaceholder(0);
        
        // Reset audio player
        this.audioPlayer.reset();
        
        // Hide stats
        this.state.hideStats();
        this.state.hideHint();
        
        setTimeout(() => this.autoResize.triggerResize(), 500);
    }
    
    /**
     * Get lesson ID from URL parameters
     */
    getLessonIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('lesson');
    }
    
    /**
     * Get current application state
     */
    getState() {
        return {
            app: this.state.get(),
            audio: this.audioPlayer.getState(),
            ui: this.uiControls.getState(),
            stats: {
                sessionResults: this.statistics.getSessionResults(),
                sessionTime: this.statistics.getSessionTime()
            }
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.autoResize.destroy();
        this.keyboard.destroy();
        this.initialized = false;
    }
    
    /**
     * Update loading overlay text
     */
    updateLoadingText(text) {
        const loadingText = DOMHelpers.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }
    
    /**
     * Hide the loading overlay
     */
    hideLoadingOverlay() {
        const loadingOverlay = DOMHelpers.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    /**
     * Show loading error
     */
    showLoadingError(message) {
        const loadingError = DOMHelpers.getElementById('loadingError');
        const errorMessage = DOMHelpers.getElementById('errorMessage');
        
        if (loadingError) loadingError.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }
}

// Global app instance
let app = null;

/**
 * Initialize the application when DOM is ready
 */
window.addEventListener('load', async function() {
    try {
        app = new DictationApp();
        await app.initialize();
        
        // Make app available globally for debugging
        window.dictationApp = app;
        
    } catch (error) {
        console.error('Failed to start application:', error);
        alert('Failed to start the dictation tool. Please refresh the page and try again.');
    }
});
