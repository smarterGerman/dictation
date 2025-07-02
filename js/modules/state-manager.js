/**
 * Central state management for the German Dictation Tool
 */
export class StateManager {
    constructor() {
        this.state = {
            // Lesson state
            currentLessonId: '',
            allLessons: {},
            vttCues: [],
            currentCueIndex: 0,
            
            // Audio state
            isPlaying: false,
            currentSpeed: 1.0,
            
            // Text state
            referenceText: '',
            userInput: '',
            
            // Session state
            hasStartedTyping: false,
            sentenceStartTime: null,
            totalSessionTime: 0,
            sessionResults: [],
            
            // UI state
            ignoreCaseActive: true,
            isHintVisible: false,
            isStatsVisible: false,
            
            // Navigation state
            canGoNext: false,
            canGoPrev: false
        };
        
        this.subscribers = new Set();
        this.history = [];
        this.maxHistorySize = 50;
    }
    
    /**
     * Get current state or specific path
     */
    get(path = null) {
        if (!path) {
            return { ...this.state }; // Return copy of entire state
        }
        
        return this.getNestedValue(this.state, path);
    }
    
    /**
     * Update state at specific path
     */
    update(path, value) {
        const oldValue = this.getNestedValue(this.state, path);
        
        if (oldValue === value) {
            return; // No change
        }
        
        // Store previous state in history
        this.addToHistory();
        
        // Update the state
        this.setNestedValue(this.state, path, value);
        
        // Notify subscribers
        this.notifySubscribers(path, value, oldValue);
    }
    
    /**
     * Update multiple state values at once
     */
    updateBatch(updates) {
        if (Object.keys(updates).length === 0) return;
        
        this.addToHistory();
        
        const changes = [];
        
        Object.entries(updates).forEach(([path, value]) => {
            const oldValue = this.getNestedValue(this.state, path);
            if (oldValue !== value) {
                this.setNestedValue(this.state, path, value);
                changes.push({ path, value, oldValue });
            }
        });
        
        // Notify subscribers of all changes
        changes.forEach(({ path, value, oldValue }) => {
            this.notifySubscribers(path, value, oldValue);
        });
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(callback, path = null) {
        const subscription = {
            callback,
            path,
            id: Date.now() + Math.random()
        };
        
        this.subscribers.add(subscription);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(subscription);
        };
    }
    
    /**
     * Subscribe to specific state paths
     */
    subscribeToPath(path, callback) {
        return this.subscribe(callback, path);
    }
    
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        if (typeof path !== 'string') return undefined;
        
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }
    
    /**
     * Add current state to history
     */
    addToHistory() {
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Undo last state change
     */
    undo() {
        if (this.history.length === 0) return false;
        
        const previousState = this.history.pop();
        this.state = previousState;
        
        // Notify all subscribers of the state reset
        this.notifySubscribers('*', this.state, null);
        return true;
    }
    
    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
    }
    
    /**
     * Notify subscribers of state changes
     */
    notifySubscribers(path, newValue, oldValue) {
        this.subscribers.forEach(subscription => {
            // If subscriber has no specific path or path matches
            if (!subscription.path || subscription.path === '*' || path.startsWith(subscription.path)) {
                try {
                    subscription.callback({
                        path,
                        newValue,
                        oldValue,
                        state: { ...this.state }
                    });
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            }
        });
    }
    
    /**
     * Reset entire state to initial values
     */
    reset() {
        const initialState = {
            currentLessonId: '',
            allLessons: {},
            vttCues: [],
            currentCueIndex: 0,
            isPlaying: false,
            currentSpeed: 1.0,
            referenceText: '',
            userInput: '',
            hasStartedTyping: false,
            sentenceStartTime: null,
            totalSessionTime: 0,
            sessionResults: [],
            ignoreCaseActive: true,
            isHintVisible: false,
            isStatsVisible: false,
            canGoNext: false,
            canGoPrev: false
        };
        
        this.addToHistory();
        this.state = initialState;
        this.notifySubscribers('*', this.state, null);
    }
    
    /**
     * Get state snapshot for debugging
     */
    getSnapshot() {
        return {
            state: JSON.parse(JSON.stringify(this.state)),
            subscriberCount: this.subscribers.size,
            historyLength: this.history.length,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Load state from snapshot
     */
    loadSnapshot(snapshot) {
        if (snapshot && snapshot.state) {
            this.addToHistory();
            this.state = { ...snapshot.state };
            this.notifySubscribers('*', this.state, null);
            return true;
        }
        return false;
    }
    
    /**
     * Helper methods for common state operations
     */
    
    // Lesson state helpers
    setCurrentLesson(lessonId) {
        this.update('currentLessonId', lessonId);
    }
    
    getCurrentLesson() {
        return this.get('currentLessonId');
    }
    
    setAllLessons(lessons) {
        this.update('allLessons', lessons);
    }
    
    getAllLessons() {
        return this.get('allLessons');
    }
    
    // VTT cues helpers
    setVTTCues(cues) {
        this.updateBatch({
            'vttCues': cues,
            'currentCueIndex': 0,
            'canGoNext': cues && cues.length > 1,
            'canGoPrev': false
        });
    }
    
    getVTTCues() {
        return this.get('vttCues');
    }
    
    setCurrentCueIndex(index) {
        const cues = this.get('vttCues');
        const maxIndex = cues ? cues.length - 1 : 0;
        
        this.updateBatch({
            'currentCueIndex': index,
            'canGoNext': index < maxIndex,
            'canGoPrev': index > 0
        });
    }
    
    getCurrentCueIndex() {
        return this.get('currentCueIndex');
    }
    
    // Audio state helpers
    setPlaying(isPlaying) {
        this.update('isPlaying', isPlaying);
    }
    
    isPlaying() {
        return this.get('isPlaying');
    }
    
    setSpeed(speed) {
        this.update('currentSpeed', speed);
    }
    
    getSpeed() {
        return this.get('currentSpeed');
    }
    
    // Text state helpers
    setReferenceText(text) {
        this.update('referenceText', text);
    }
    
    getReferenceText() {
        return this.get('referenceText');
    }
    
    setUserInput(input) {
        this.update('userInput', input);
    }
    
    getUserInput() {
        return this.get('userInput');
    }
    
    // Session state helpers
    startSentenceTiming() {
        this.updateBatch({
            'hasStartedTyping': true,
            'sentenceStartTime': Date.now()
        });
    }
    
    resetSentenceTiming() {
        this.updateBatch({
            'hasStartedTyping': false,
            'sentenceStartTime': null
        });
    }
    
    addSessionResult(result) {
        const results = this.get('sessionResults') || [];
        this.update('sessionResults', [...results, result]);
    }
    
    getSessionResults() {
        return this.get('sessionResults') || [];
    }
    
    clearSessionResults() {
        this.updateBatch({
            'sessionResults': [],
            'totalSessionTime': 0
        });
    }
    
    // UI state helpers
    setIgnoreCase(ignoreCase) {
        this.update('ignoreCaseActive', ignoreCase);
    }
    
    getIgnoreCase() {
        return this.get('ignoreCaseActive');
    }
    
    showHint() {
        this.update('isHintVisible', true);
    }
    
    hideHint() {
        this.update('isHintVisible', false);
    }
    
    isHintVisible() {
        return this.get('isHintVisible');
    }
    
    showStats() {
        this.update('isStatsVisible', true);
    }
    
    hideStats() {
        this.update('isStatsVisible', false);
    }
    
    isStatsVisible() {
        return this.get('isStatsVisible');
    }
    
    // Navigation helpers
    canGoNext() {
        return this.get('canGoNext');
    }
    
    canGoPrev() {
        return this.get('canGoPrev');
    }
}
