/**
 * UI Controls and interactions
 */
import { CONFIG } from '../config.js';
import { DOMHelpers } from '../utils/dom-helpers.js';
import { GermanChars } from './german-chars.js';
import { TextComparison } from './text-comparison.js';

export class UIControls {
    constructor() {
        // DOM elements
        this.userInput = null;
        this.liveFeedback = null;
        this.hintDisplay = null;
        this.hintContent = null;
        this.referenceTextDiv = null;
        this.ignoreCaseBtn = null;
        this.focusModeBtn = null;
        this.hintBtn = null;
        this.endDictationBtn = null;
        
        // State
        this.ignoreCaseActive = true;
        this.focusModeActive = false;
        this.referenceText = '';
        this.hintTimeout = null;
        
        // Callbacks
        this.onInputChange = null;
        this.onProcessSentence = null;
        this.onEndDictation = null;
        this.onHintShown = null;
        this.onHintHidden = null;
    }
    
    /**
     * Initialize UI elements and event listeners
     */
    initialize() {
        this.initializeElements();
        this.setupEventListeners();
        this.updatePlaceholder();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.userInput = DOMHelpers.getElementById('userInput');
        this.liveFeedback = DOMHelpers.getElementById('liveFeedback');
        this.hintDisplay = DOMHelpers.getElementById('hintDisplay');
        this.hintContent = DOMHelpers.getElementById('hintContent');
        this.referenceTextDiv = DOMHelpers.getElementById('referenceText');
        this.ignoreCaseBtn = DOMHelpers.getElementById('ignoreCaseBtn');
        this.focusModeBtn = DOMHelpers.getElementById('focusModeBtn');
        this.hintBtn = DOMHelpers.getElementById('hintBtn');
        this.endDictationBtn = DOMHelpers.getElementById('endDictationBtn');
        
        // Set initial state
        if (this.userInput) {
            this.userInput.placeholder = CONFIG.initialPlaceholderText;
        }
        
        if (this.liveFeedback) {
            DOMHelpers.setContent(this.liveFeedback, CONFIG.liveFeedbackDefault);
        }
        
        // Set initial case sensitivity state
        if (this.ignoreCaseBtn) {
            DOMHelpers.toggleClass(this.ignoreCaseBtn, 'active', false);
            this.ignoreCaseBtn.title = "Capitalization checking OFF";
        }
        
        // Set initial focus mode state
        if (this.focusModeBtn) {
            DOMHelpers.toggleClass(this.focusModeBtn, 'active', false);
            this.focusModeBtn.title = "Focus Mode OFF - Show live feedback";
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Input field events
        if (this.userInput) {
            DOMHelpers.addEventListener(this.userInput, 'input', (e) => this.handleUserInput(e));
        }
        
        // Button events
        if (this.ignoreCaseBtn) {
            DOMHelpers.addEventListener(this.ignoreCaseBtn, 'click', () => this.toggleIgnoreCase());
        }
        
        if (this.focusModeBtn) {
            DOMHelpers.addEventListener(this.focusModeBtn, 'click', () => this.toggleFocusMode());
        }
        
        if (this.hintBtn) {
            DOMHelpers.addEventListener(this.hintBtn, 'click', () => this.showHint());
        }
        
        if (this.endDictationBtn) {
            DOMHelpers.addEventListener(this.endDictationBtn, 'click', () => {
                if (this.onEndDictation) this.onEndDictation();
            });
        }
    }
    
    /**
     * Handle user input changes
     */
    handleUserInput(e) {
        this.hideHint();
        
        // Notify that typing has started
        if (this.onInputChange) {
            this.onInputChange(e.target.value);
        }
        
        // Convert German characters
        const cursorPos = e.target.selectionStart;
        const convertedText = GermanChars.convert(e.target.value);
        
        if (convertedText !== e.target.value) {
            e.target.value = convertedText;
            e.target.setSelectionRange(cursorPos, cursorPos);
        }
        
        // Update live feedback
        this.updateLiveFeedback();
    }
    
    /**
     * Update live feedback display
     */
    updateLiveFeedback() {
        if (!this.userInput || !this.liveFeedback) return;
        
        const userText = this.userInput.value;
        
        if (userText.trim() === '') {
            DOMHelpers.setContent(this.liveFeedback, CONFIG.liveFeedbackDefault);
            return;
        }
        
        if (!this.referenceText) {
            return;
        }
        
        const comparison = TextComparison.compareTexts(
            this.referenceText, 
            userText, 
            { ignoreCase: this.ignoreCaseActive }
        );
        
        // Build word-to-punctuation mapping from original text
        const originalText = this.referenceText;
        const words = originalText.split(/\s+/);
        const wordPunctuation = [];
        
        words.forEach(word => {
            // Extract punctuation from the end of each word
            const punctMatch = word.match(/([.,!?;:""''()„""''‚'«»]+)$/);
            const cleanWord = word.replace(/[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]+/g, '');
            
            wordPunctuation.push({
                word: cleanWord,
                punctuation: punctMatch ? punctMatch[1] : ''
            });
        });
        
        // Build the feedback HTML with punctuation insertion
        let feedbackHTML = '';
        let currentWordIndex = 0;
        let isInWord = false;
        
        comparison.chars.forEach((item, index) => {
            let char = item.char;
            
            // Handle spacing
            if (char === ' ') {
                if (item.status === 'word-boundary') {
                    // End of word - add punctuation if any
                    if (currentWordIndex < wordPunctuation.length && wordPunctuation[currentWordIndex].punctuation) {
                        if (this.focusModeActive) {
                            feedbackHTML += wordPunctuation[currentWordIndex].punctuation;
                        } else {
                            feedbackHTML += `<span class="char-punctuation">${wordPunctuation[currentWordIndex].punctuation}</span>`;
                        }
                    }
                    currentWordIndex++;
                    char = '&nbsp;&nbsp;&nbsp;';
                    isInWord = false;
                } else if (item.status === 'char-space') {
                    char = '&nbsp;';
                } else {
                    char = '&nbsp;';
                }
            } else if (char === '\n') {
                char = '<br>';
            } else {
                // Regular character - we're in a word
                isInWord = true;
            }
            
            // In focus mode, don't apply color classes
            if (this.focusModeActive) {
                feedbackHTML += char;
            } else {
                feedbackHTML += `<span class="char-${item.status}">${char}</span>`;
            }
        });
        
        // Add punctuation for the last word if we ended in a word
        if (isInWord && currentWordIndex < wordPunctuation.length && wordPunctuation[currentWordIndex].punctuation) {
            if (this.focusModeActive) {
                feedbackHTML += wordPunctuation[currentWordIndex].punctuation;
            } else {
                feedbackHTML += `<span class="char-punctuation">${wordPunctuation[currentWordIndex].punctuation}</span>`;
            }
        }
        
        DOMHelpers.setContent(this.liveFeedback, feedbackHTML, true);
    }
    
    /**
     * Toggle case sensitivity
     */
    toggleIgnoreCase() {
        this.ignoreCaseActive = !this.ignoreCaseActive;
        
        if (this.ignoreCaseBtn) {
            if (this.ignoreCaseActive) {
                DOMHelpers.toggleClass(this.ignoreCaseBtn, 'active', false);
                this.ignoreCaseBtn.title = "Capitalization checking OFF";
            } else {
                DOMHelpers.toggleClass(this.ignoreCaseBtn, 'active', true);
                this.ignoreCaseBtn.title = "Capitalization checking ON";
            }
        }
        
        this.updateLiveFeedback();
    }
    
    /**
     * Toggle focus mode
     */
    toggleFocusMode() {
        this.focusModeActive = !this.focusModeActive;
        
        if (this.focusModeBtn) {
            if (this.focusModeActive) {
                DOMHelpers.toggleClass(this.focusModeBtn, 'active', true);
                this.focusModeBtn.title = "Focus Mode ON - Hide feedback colors";
            } else {
                DOMHelpers.toggleClass(this.focusModeBtn, 'active', false);
                this.focusModeBtn.title = "Focus Mode OFF - Show live feedback";
            }
        }
        
        this.updateLiveFeedback();
    }
    
    /**
     * Show hint with reference text
     */
    showHint() {
        if (!this.referenceText) return;
        
        if (this.hintDisplay && this.hintContent) {
            DOMHelpers.setContent(this.hintContent, this.referenceText);
            DOMHelpers.toggleDisplay(this.hintDisplay, true);
            
            // Auto-hide after configured delay
            if (this.hintTimeout) {
                clearTimeout(this.hintTimeout);
            }
            
            this.hintTimeout = setTimeout(() => {
                this.hideHint();
            }, CONFIG.hintAutoHideDelay);
            
            if (this.onHintShown) {
                this.onHintShown(this.referenceText);
            }
        }
    }
    
    /**
     * Hide hint display
     */
    hideHint() {
        if (this.hintDisplay && this.hintDisplay.style.display !== 'none') {
            DOMHelpers.toggleDisplay(this.hintDisplay, false);
            
            if (this.hintTimeout) {
                clearTimeout(this.hintTimeout);
                this.hintTimeout = null;
            }
            
            if (this.onHintHidden) {
                this.onHintHidden();
            }
        }
    }
    
    /**
     * Set reference text for current sentence
     */
    setReferenceText(text) {
        this.referenceText = text;
        
        if (this.referenceTextDiv) {
            DOMHelpers.setContent(this.referenceTextDiv, text);
        }
        
        this.updateLiveFeedback();
    }
    
    /**
     * Clear user input
     */
    clearInput() {
        if (this.userInput) {
            this.userInput.value = '';
            this.updateLiveFeedback();
        }
    }
    
    /**
     * Get current user input
     */
    getUserInput() {
        return this.userInput ? this.userInput.value : '';
    }
    
    /**
     * Set user input value
     */
    setUserInput(value) {
        if (this.userInput) {
            this.userInput.value = value;
            this.updateLiveFeedback();
        }
    }
    
    /**
     * Focus input field
     */
    focusInput() {
        if (this.userInput) {
            DOMHelpers.focus(this.userInput);
        }
    }
    
    /**
     * Update placeholder text based on progress
     */
    updatePlaceholder(sentenceIndex = 0) {
        if (!this.userInput) return;
        
        if (sentenceIndex < 2) {
            this.userInput.placeholder = CONFIG.initialPlaceholderText;
        } else {
            this.userInput.placeholder = CONFIG.laterPlaceholderText;
        }
    }
    
    /**
     * Get ignore case setting
     */
    getIgnoreCase() {
        return this.ignoreCaseActive;
    }
    
    /**
     * Set ignore case setting
     */
    setIgnoreCase(ignore) {
        this.ignoreCaseActive = ignore;
        
        if (this.ignoreCaseBtn) {
            DOMHelpers.toggleClass(this.ignoreCaseBtn, 'active', !ignore);
            this.ignoreCaseBtn.title = ignore ? "Capitalization checking OFF" : "Capitalization checking ON";
        }
        
        this.updateLiveFeedback();
    }
    
    /**
     * Show/hide reference text section
     */
    toggleReferenceText(show) {
        if (this.referenceTextDiv) {
            DOMHelpers.toggleDisplay(this.referenceTextDiv, show);
        }
    }
    
    /**
     * Set callback handlers
     */
    setCallbacks(callbacks) {
        Object.assign(this, callbacks);
    }
    
    /**
     * Get current UI state
     */
    getState() {
        return {
            userInput: this.getUserInput(),
            referenceText: this.referenceText,
            ignoreCaseActive: this.ignoreCaseActive,
            isHintVisible: this.hintDisplay ? this.hintDisplay.style.display !== 'none' : false
        };
    }
    
    /**
     * Reset UI to initial state
     */
    reset() {
        this.clearInput();
        this.hideHint();
        this.setReferenceText('');
        this.updatePlaceholder(0);
        
        if (this.liveFeedback) {
            DOMHelpers.setContent(this.liveFeedback, CONFIG.liveFeedbackDefault);
        }
    }
    
    /**
     * Validate current input
     */
    validateInput() {
        const input = this.getUserInput();
        return {
            isEmpty: input.trim() === '',
            hasContent: input.trim().length > 0,
            length: input.length,
            wordCount: input.trim().split(/\s+/).filter(w => w.length > 0).length
        };
    }
    
    /**
     * Get text selection in input field
     */
    getSelection() {
        if (!this.userInput) return null;
        
        return {
            start: this.userInput.selectionStart,
            end: this.userInput.selectionEnd,
            text: this.userInput.value.substring(this.userInput.selectionStart, this.userInput.selectionEnd)
        };
    }
    
    /**
     * Set text selection in input field
     */
    setSelection(start, end) {
        if (this.userInput) {
            this.userInput.setSelectionRange(start, end);
        }
    }
}
