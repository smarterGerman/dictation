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
       
        // BEGIN PRECISE DEBUGGING
        let debugInput = e.target.value;
console.group(`[GERMAN CHAR DEBUG] Full conversion for: "${debugInput}"`);
CONFIG.germanChars.replacements.forEach(({ pattern, replacement }, idx) => {
    const before = debugInput;
    const after = before.replace(pattern, replacement);
    const matched = before !== after;
    console.debug(
        `#${idx + 1}: Pattern: ${pattern}, Replacement: "${replacement}"\n` +
        `    Before: "${before}"\n` +
        `    After:  "${after}"\n` +
        `    Match: ${matched}`
    );
    debugInput = after;
});
console.groupEnd();
// END PRECISE DEBUGGING

        console.debug(`[GERMAN CHAR DEBUG] Input: "${e.target.value}" → Converted: "${convertedText}"`);
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
        
        // Render each reference word VERBATIM, punctuation included.
        //
        // This used to rebuild a word as "stripped word" + "whatever punctuation
        // trailed it", which silently dropped punctuation INSIDE a word and in
        // front of it: "K.O." came out as "KO." and '"Ich' lost its quote. The
        // learner must always read the word exactly as it is written, even though
        // the comparison itself still ignores punctuation.
        const PUNCT_RE = /[.,!?;:"'()\u201E\u201C\u201D\u2018\u2019\u201A\u201B\u201F\u2039\u203A\u00AB\u00BB\u2026]/;
        const originalText = this.referenceText;
        const originalWords = originalText.split(/\s+/).filter(w => w.length > 0);

        // Split the comparison stream into per-word buckets.
        const compWords = [];
        let bucket = [];
        comparison.chars.forEach((item) => {
            if (item.status === 'word-boundary') {
                compWords.push(bucket);
                bucket = [];
            } else {
                bucket.push(item);
            }
        });
        compWords.push(bucket);

        const emit = (ch, status) => {
            const out = ch === ' ' ? '&nbsp;' : ch;
            return this.focusModeActive ? out : `<span class="char-${status}">${out}</span>`;
        };

        let feedbackHTML = '';
        compWords.forEach((wordChars, wi) => {
            if (wi > 0) {
                feedbackHTML += this.focusModeActive ? '&nbsp;&nbsp;&nbsp;' : '<span class="char-word-boundary">&nbsp;&nbsp;&nbsp;</span>';
            }
            const original = originalWords[wi] || '';
            // Leading and trailing punctuation are emitted around the word; anything
            // in between (the dot in "K.O") is emitted where it sits.
            let a = 0;
            let b = original.length;
            while (a < b && PUNCT_RE.test(original[a])) a++;
            while (b > a && PUNCT_RE.test(original[b - 1])) b--;
            const lead = original.slice(0, a);
            const core = original.slice(a, b);
            const trail = original.slice(b);

            for (const ch of lead) feedbackHTML += emit(ch, 'punctuation');

            let ci = 0;
            for (const ch of core) {
                if (PUNCT_RE.test(ch)) {
                    feedbackHTML += emit(ch, 'punctuation');
                } else if (ci < wordChars.length) {
                    feedbackHTML += emit(wordChars[ci].char, wordChars[ci].status);
                    ci++;
                }
            }
            // Anything the learner typed beyond the reference word still has to show,
            // and it belongs BEFORE the closing punctuation.
            for (; ci < wordChars.length; ci++) {
                feedbackHTML += emit(wordChars[ci].char, wordChars[ci].status);
            }

            for (const ch of trail) feedbackHTML += emit(ch, 'punctuation');
        });

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
