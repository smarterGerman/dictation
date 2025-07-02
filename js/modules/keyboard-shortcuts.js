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
                combo: 'Shift + Cmd/Ctrl + ←',
                description: 'Previous sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + →',
                description: 'Next sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + ↑',
                description: 'Play current sentence'
            },
            {
                combo: 'Shift + Cmd/Ctrl + ↓',
                description: 'Toggle playback speed'
            },
            {
                combo: 'Shift + Cmd/Ctrl + / (or ß, ,)',
                description: 'Show hint'
            },
            {
                combo: 'Enter',
                description: 'Submit current sentence (in text input)'
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
