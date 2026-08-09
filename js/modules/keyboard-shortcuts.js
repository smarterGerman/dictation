/**
 * Keyboard shortcuts and input handling
 */
import { DOMHelpers } from '../utils/dom-helpers.js';

export class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.userInput = null;
        
        // Default handlers
        this.onPlayPause = null;
        this.onPreviousSentence = null;
        this.onNextSentence = null;
        this.onPlayCurrentSentence = null;
        this.onToggleSpeed = null;
        this.onShowHint = null;
        this.onProcessSentence = null;
        
        this.initializeDefaultShortcuts();
    }
    
    /**
     * Initialize default keyboard shortcuts
     */
    initializeDefaultShortcuts() {
        // Play/Pause: Shift + Ctrl/Cmd + Enter
        this.addShortcut('shift+ctrl+enter', () => {
            if (this.onPlayPause) this.onPlayPause();
        });
        
        this.addShortcut('shift+meta+enter', () => {
            if (this.onPlayPause) this.onPlayPause();
        });
        
        // Sentence navigation: Shift + Ctrl/Cmd + Arrow keys
        this.addShortcut('shift+ctrl+arrowleft', () => {
            if (this.onPreviousSentence) this.onPreviousSentence();
        });
        
        this.addShortcut('shift+meta+arrowleft', () => {
            if (this.onPreviousSentence) this.onPreviousSentence();
        });
        
        this.addShortcut('shift+ctrl+arrowright', () => {
            if (this.onNextSentence) this.onNextSentence();
        });
        
        this.addShortcut('shift+meta+arrowright', () => {
            if (this.onNextSentence) this.onNextSentence();
        });
        
        this.addShortcut('shift+ctrl+arrowup', () => {
            if (this.onPlayCurrentSentence) this.onPlayCurrentSentence();
        });
        
        this.addShortcut('shift+meta+arrowup', () => {
            if (this.onPlayCurrentSentence) this.onPlayCurrentSentence();
        });
        
        // Speed toggle - cross-platform
        if (navigator.platform.toLowerCase().includes('mac')) {
            this.addShortcut('shift+meta+arrowdown', () => {
                if (this.onToggleSpeed) this.onToggleSpeed();
            });
        } else {
            this.addShortcut('shift+ctrl+arrowdown', () => {
                if (this.onToggleSpeed) this.onToggleSpeed();
            });
        }
        
        // Hint shortcuts: Shift + Ctrl/Cmd + ß (German), / (US), , (French)
        this.addShortcut('shift+ctrl+ß', () => {
            if (this.onShowHint) this.onShowHint();
        });
        
        this.addShortcut('shift+meta+ß', () => {
            if (this.onShowHint) this.onShowHint();
        });
        
        this.addShortcut('shift+ctrl+/', () => {
            if (this.onShowHint) this.onShowHint();
        });
        
        this.addShortcut('shift+meta+/', () => {
            if (this.onShowHint) this.onShowHint();
        });
        
        this.addShortcut('shift+ctrl+,', () => {
            if (this.onShowHint) this.onShowHint();
        });
        
        this.addShortcut('shift+meta+,', () => {
            if (this.onShowHint) this.onShowHint();
        });
    }
    
    /**
     * Add a keyboard shortcut
     */
    addShortcut(keyCombo, handler) {
        this.shortcuts.set(keyCombo.toLowerCase(), handler);
    }
    
    /**
     * Remove a keyboard shortcut
     */
    removeShortcut(keyCombo) {
        return this.shortcuts.delete(keyCombo.toLowerCase());
    }
    
    /**
     * Initialize keyboard event listeners
     */
    initialize() {
        DOMHelpers.addEventListener(window, 'keydown', (e) => this.handleGlobalKeyDown(e));
    }
    
    /**
     * Set user input element for special handling
     */
    setUserInputElement(element) {
        this.userInput = element;
        if (element) {
            DOMHelpers.addEventListener(element, 'keydown', (e) => this.handleInputKeyDown(e));
        }
    }
    
    /**
     * Handle global keydown events
     */
    handleGlobalKeyDown(e) {
        if (this.deferToTutorial(e)) {
            if (!['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) e.preventDefault();
            return;
        }

        if (!this.isEnabled) return;
        
        // Ignore key repeat events
        if (e.repeat) {
            return;
        }
        
        // Ignore modifier keys themselves - only process when a non-modifier key is pressed
        const modifierKeys = ['Shift', 'Control', 'Meta', 'Alt', 'Cmd'];
        if (modifierKeys.includes(e.key)) {
            return;
        }
        
        const keyCombo = this.getKeyCombo(e);
        const handler = this.shortcuts.get(keyCombo);
        
        if (handler) {
            e.preventDefault();
            handler(e);
            return;
        }
        
        // Handle special hint shortcuts with multiple possible keys
        if (e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key === 'ß' || e.key === '/' || e.key === ',')) {
            e.preventDefault();
            if (this.onShowHint) this.onShowHint();
            return;
        }
    }
    
    /**
     * Handle document-level keydown events
     */
    handleDocumentKeyDown(e) {
        // This can be used for additional document-level shortcuts
        // that shouldn't interfere with input fields
    }
    
    /**
     * Handle keydown events in the user input field
     */
    handleInputKeyDown(e) {
        if (this.deferToTutorial(e)) {
            if (!['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) e.preventDefault();
            return;
        }

        if (!this.isEnabled) return;
        
        // Ignore key repeat events
        if (e.repeat) {
            return;
        }
        
        // Ignore modifier keys themselves - only process when a non-modifier key is pressed
        const modifierKeys = ['Shift', 'Control', 'Meta', 'Alt', 'Cmd'];
        if (modifierKeys.includes(e.key)) {
            return;
        }
        
        // Enter key submits current sentence (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.onProcessSentence) this.onProcessSentence();
            return;
        }
        
        // Allow global shortcuts even when in input field
        const keyCombo = this.getKeyCombo(e);
        const handler = this.shortcuts.get(keyCombo);
        
        if (handler) {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling to global handler
            handler(e);
            return;
        }
    }
    

    /**
     * While the tutorial sits on a keyboard step, the expected combo belongs to
     * the TUTORIAL: it executes the action itself, validates, and advances. If
     * a handler here consumes the key first (the input handler even stops
     * propagation), the tutorial never sees it and the step looks dead - the
     * 2026-08-08 fold regression. Mirrors the retired fork's coordination block.
     * Pure check: callers preventDefault for non-modifier matches.
     */
    deferToTutorial(e) {
        const tut = window.activeTutorial;
        if (!tut || !tut.isActive) return false;
        const step = tut.steps && tut.steps[tut.currentStep];
        if (!step || step.action !== 'keyboard') return false;
        if (['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) return true;

        // The tutorial owns the definition of accepted aliases. In particular,
        // the hint step accepts ß, slash, and comma for the same action.
        if (typeof tut.isKeyComboMatch === 'function') {
            return tut.isKeyComboMatch(e, step.keyCombo);
        }

        const combo = this.getKeyCombo(e);
        const expected = this.formatTutorialKeyCombo(step.keyCombo);
        // Meta and Ctrl are interchangeable across platforms
        const swapped = expected.includes('meta')
            ? expected.replace('meta', 'ctrl')
            : expected.replace('ctrl', 'meta');
        return combo === expected || combo === swapped;
    }

    /**
     * Normalize a tutorial step's keyCombo array to getKeyCombo's string form.
     */
    formatTutorialKeyCombo(keyCombo) {
        if (!keyCombo || !Array.isArray(keyCombo)) return '';
        const parts = [];
        const normalized = keyCombo.map(k => k.toLowerCase());
        if (normalized.includes('shift')) parts.push('shift');
        if (normalized.includes('ctrl')) parts.push('ctrl');
        if (normalized.includes('meta')) parts.push('meta');
        if (normalized.includes('alt')) parts.push('alt');
        const mainKey = keyCombo.find(k => !['Shift', 'Ctrl', 'Meta', 'Alt'].includes(k));
        if (mainKey) parts.push(mainKey.toLowerCase());
        return parts.join('+');
    }

    /**
     * Generate key combination string from event
     */
    getKeyCombo(e) {
        const parts = [];
        
        if (e.shiftKey) parts.push('shift');
        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('meta');
        if (e.altKey) parts.push('alt');
        
        // Normalize key name
        let key = e.key.toLowerCase();
        
        // Handle special cases
        switch (key) {
            case ' ':
                key = 'space';
                break;
            case 'escape':
                key = 'esc';
                break;
        }
        
        parts.push(key);
        
        return parts.join('+');
    }
    
    /**
     * Set callback handlers
     */
    setHandlers(handlers) {
        Object.assign(this, handlers);
    }
    
    /**
     * Enable/disable shortcuts
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    
    /**
     * Check if shortcuts are enabled
     */
    getEnabled() {
        return this.isEnabled;
    }
    
    /**
     * Get all registered shortcuts
     */
    getAllShortcuts() {
        return Array.from(this.shortcuts.keys());
    }
    
    /**
     * Clear all shortcuts
     */
    clearShortcuts() {
        this.shortcuts.clear();
    }
    
    /**
     * Get formatted shortcut descriptions for help
     */
    getShortcutDescriptions() {
        return [
            {
                combo: 'Shift + Cmd/Ctrl + Enter',
                description: 'Play/Pause audio'
            },
            {
                combo: 'Shift + Cmd/Ctrl + Left Arrow',
                description: 'Previous sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + Right Arrow',
                description: 'Next sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + Up Arrow',
                description: 'Play current sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + Down Arrow',
                description: 'Toggle playback speed'
            },
            {
                combo: 'Shift + Cmd/Ctrl + slash, ß, or comma',
                description: 'Show hint'
            },
            {
                combo: 'Enter',
                description: 'Submit current sentence in the text input'
            }
        ];
    }
    
    /**
     * Focus input element safely
     */
    focusInput() {
        if (this.userInput) {
            DOMHelpers.focus(this.userInput);
        }
    }
    
    /**
     * Cleanup event listeners
     */
    destroy() {
        this.shortcuts.clear();
        this.isEnabled = false;
        
        // Note: In a real implementation, you'd want to store references
        // to the bound functions to properly remove event listeners
    }
}
