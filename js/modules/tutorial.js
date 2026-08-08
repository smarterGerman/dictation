/**
 * Interactive Tutorial System
 * Guides users through all features and keyboard shortcuts step by step
 */
import { DOMHelpers } from '../utils/dom-helpers.js';

export class Tutorial {
    constructor(dictationApp) {
        this.app = dictationApp;
        this.currentStep = 0;
        this.isActive = false;
        this.isCompleted = false; // Add completion state flag
        this.overlay = null;
        this.tutorialContainer = null;
        this.checkmarkElement = null;
        this.highlightElement = null;
        this.spotlightElement = null;
        this.validatingKeyboardStep = false;

        // Interaction tracking
        this.speedStatesVisited = new Set();

        // Detect if on mobile (improved: only true for real mobile devices, not small iframes)
        this.isMobile = /Mobi|Android|iPhone|iPad|iPod|Mobile|Touch/.test(navigator.userAgent);

        // Tutorial steps configuration
       // In js/modules/tutorial.js, find the allSteps array and replace it with this reordered version:

const allSteps = [
    // ...existing steps...
    {
        id: 'play-button',
        title: 'Play Button',
        description: 'Click the play button to start audio playback for the current sentence.',
        targetSelector: '#playBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => this.app.audioPlayer && this.app.audioPlayer.isPlaying,
        onComplete: () => {
            // Let the audio play - don't pause it immediately
            // The user will learn to pause it in the next step
        }
    },
    {
        id: 'pause-button',
        title: 'Pause Button',
        description: 'Click the play button once while audio is playing to pause it. Notice the green dot indicating paused state.',
        targetSelector: '#playBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => this.app.audioPlayer && !this.app.audioPlayer.isPlaying
    },
    // Keyboard shortcut steps are hidden on mobile
    {
        id: 'keyboard-play',
        title: 'Keyboard Shortcut: Play/Pause',
        description: 'Press Shift + Cmd/Ctrl + Enter to play/pause audio. The green dot indicates that your audio is paused.',
        targetSelector: '#playBtn',
        highlightType: 'pulse',
        action: 'keyboard',
        keyCombo: ['Shift', 'Meta', 'Enter'], // Will handle cross-platform
        mobileHidden: true,
        validation: () => {
            console.log('  🔍 VALIDATION DEBUG (keyboard-play):');
            console.log('    app.audioPlayer exists:', !!this.app.audioPlayer);
            if (this.app.audioPlayer) {
                console.log('    isPlaying:', this.app.audioPlayer.isPlaying);
            }
            const result = this.app.audioPlayer && this.app.audioPlayer.isPlaying;
            console.log('    Final validation result:', result);
            return result;
        },
        onStart: () => {
            // Ensure text input is NOT focused when this step starts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.blur();
            }
            // DO NOT pause audio here; let it play to the end for this tutorial step
        }
    },
    {
        id: 'typing-practice-1',
        title: 'Repeat Sentence',
        description: 'Double-click the play button quickly to repeat the current sentence from the beginning.',
        targetSelector: '#playBtn',
        highlightType: 'pulse',
        action: 'doubleclick',
        validation: () => {
            // Check if audio is playing (indicating sentence was repeated)
            return this.app.audioPlayer && this.app.audioPlayer.isPlaying;
        },
        onStart: () => {
            this.doubleClickTracker = { clicks: 0, lastClickTime: 0 };
            // DO NOT pause audio here; let it play to the end for this tutorial step
            // Patch: Ensure double-click always plays the full current sentence from the start
            const playBtn = document.getElementById('playBtn');
            if (playBtn) {
                if (!this._doubleClickHandler) {
                    this._doubleClickHandler = (e) => {
                        if (e.detail === 2) {
                            if (this.app.audioPlayer) {
                                this.app.audioPlayer.playCurrentSentence();
                            }
                        }
                    };
                    playBtn.addEventListener('click', this._doubleClickHandler);
                }
            }
        },
        onComplete: () => {
            // Remove double-click handler after this step
            const playBtn = document.getElementById('playBtn');
            if (playBtn && this._doubleClickHandler) {
                playBtn.removeEventListener('click', this._doubleClickHandler);
                this._doubleClickHandler = null;
            }
        }
    },
    {
        id: 'keyboard-play-current',
        title: 'Keyboard Shortcut: Repeat Sentence',
        description: 'Press Shift + Cmd/Ctrl + ↑ (up arrow) to repeat the current sentence from the beginning.',
        targetSelector: '#playBtn', // Use play button as visual reference
        highlightType: 'pulse',
        action: 'keyboard',
        keyCombo: ['Shift', 'Meta', 'ArrowUp'],
        mobileHidden: true,
        validation: () => {
            console.log('  🔍 VALIDATION DEBUG (keyboard-play-current):');
            console.log('    app.audioPlayer exists:', !!this.app.audioPlayer);
            if (this.app.audioPlayer) {
                console.log('    isPlaying:', this.app.audioPlayer.isPlaying);
                console.log('    currentTime:', this.app.audioPlayer.audio ? this.app.audioPlayer.audio.currentTime : 'unknown');
            }
            
            // Check if audio is playing (indicating sentence was repeated)
            const result = this.app.audioPlayer && this.app.audioPlayer.isPlaying;
            console.log('    Final validation result:', result);
            return result;
        },
        onStart: () => {
            // Ensure text input is NOT focused during keyboard shortcuts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.blur();
                userInput.value = '';
            }
            // DO NOT pause audio here; let it play to the end for this tutorial step
        }
    },
    {
        id: 'next-sentence',
        title: 'Next Sentence',
        description: 'Click the right arrow to move to the next sentence. Observe the progress bar.',
        targetSelector: '#nextBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => this.app.audioPlayer && this.app.audioPlayer.currentCueIndex > 0,
        onInteraction: () => {
            // Play the new sentence after navigation
            setTimeout(() => {
                if (this.app.audioPlayer) {
                    this.app.audioPlayer.playCurrentSentence();
                }
            }, 100);
        }
    },
    {
        id: 'keyboard-next',
        title: 'Keyboard Shortcut: Next Sentence',
        description: 'Press Shift + Cmd/Ctrl + → (right arrow) to go to next sentence.',
        targetSelector: '#nextBtn',
        highlightType: 'pulse',
        action: 'keyboard',
        keyCombo: ['Shift', 'Meta', 'ArrowRight'],
        mobileHidden: true,
        validation: () => {
            console.log('  🔍 VALIDATION DEBUG (keyboard-next):');
            console.log('    currentStepStartIndex:', this.currentStepStartIndex);
            console.log('    app.audioPlayer exists:', !!this.app.audioPlayer);
            if (this.app.audioPlayer) {
                console.log('    current currentCueIndex:', this.app.audioPlayer.currentCueIndex);
                console.log('    total cues:', this.app.audioPlayer.vttCues ? this.app.audioPlayer.vttCues.length : 'unknown');
                console.log('    comparison:', this.app.audioPlayer.currentCueIndex, '>', this.currentStepStartIndex);
                console.log('    result:', this.app.audioPlayer.currentCueIndex > this.currentStepStartIndex);
            }
            
            if (this.currentStepStartIndex === undefined) {
                console.log('    ❌ currentStepStartIndex is undefined');
                return false;
            }
            if (!this.app.audioPlayer) {
                console.log('    ❌ audioPlayer not available');
                return false;
            }
            const currentIndex = this.app.audioPlayer.currentCueIndex;
            const totalCues = this.app.audioPlayer.vttCues ? this.app.audioPlayer.vttCues.length : 0;
            
            // If we moved forward, great!
            if (currentIndex > this.currentStepStartIndex) {
                console.log('    ✅ Moved forward successfully');
                return true;
            }
            
            // If we're at the last cue and started at the last cue, accept it
            if (this.currentStepStartIndex >= totalCues - 1 && currentIndex >= totalCues - 1) {
                console.log('    ✅ Already at last cue, shortcut executed correctly');
                return true;
            }
            
            console.log('    ❌ No forward movement detected');
            console.log('    Debug: startIndex=', this.currentStepStartIndex, 'currentIndex=', currentIndex, 'totalCues=', totalCues);
            return false;
        },
        onStart: () => {
            // Store the starting index when this step begins
            if (this.app.audioPlayer) {
                this.currentStepStartIndex = this.app.audioPlayer.currentCueIndex;
            }
            // Ensure text input is NOT focused during keyboard shortcuts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.blur();
                userInput.value = ''; // Clear any existing content
            }
        },
        onComplete: () => {
            // Play the new sentence after successful navigation
            setTimeout(() => {
                if (this.app.audioPlayer) {
                    this.app.audioPlayer.playCurrentSentence();
                }
            }, 200);
        }
    },
    {
        id: 'prev-sentence',
        title: 'Previous Sentence',
        description: 'Click the left arrow to go back to the previous sentence. Observe the progress bar.',
        targetSelector: '#prevBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            if (this.prevStepStartIndex === undefined) {
                return false;
            }
            if (!this.app.audioPlayer) {
                return false;
            }
            const currentIndex = this.app.audioPlayer.currentCueIndex;
            
            // If we moved backward, great!
            if (currentIndex < this.prevStepStartIndex) {
                return true;
            }
            
            // If we're at index 0 and tried to go previous, accept it
            if (this.prevStepStartIndex === 0 && currentIndex === 0) {
                return true;
            }
            
            return false;
        },
        onStart: () => {
            // Store the starting index when this step begins
            if (this.app.audioPlayer) {
                this.prevStepStartIndex = this.app.audioPlayer.currentCueIndex;
            }
        },
        onInteraction: () => {
            // Play the new sentence after navigation
            setTimeout(() => {
                if (this.app.audioPlayer) {
                    this.app.audioPlayer.playCurrentSentence();
                }
            }, 100);
        }
    },
    {
        id: 'keyboard-prev',
        title: 'Keyboard Shortcut: Previous Sentence',
        description: 'Press Shift + Cmd/Ctrl + ← (left arrow) to go to previous sentence.',
        targetSelector: '#prevBtn',
        highlightType: 'pulse',
        action: 'keyboard',
        keyCombo: ['Shift', 'Meta', 'ArrowLeft'],
        mobileHidden: true,
        validation: () => {
            console.log('  🔍 VALIDATION DEBUG (keyboard-prev):');
            console.log('    prevStepStartIndex:', this.prevStepStartIndex);
            console.log('    app.audioPlayer exists:', !!this.app.audioPlayer);
            if (this.app.audioPlayer) {
                console.log('    current currentCueIndex:', this.app.audioPlayer.currentCueIndex);
                console.log('    comparison:', this.app.audioPlayer.currentCueIndex, '<', this.prevStepStartIndex);
                console.log('    result:', this.app.audioPlayer.currentCueIndex < this.prevStepStartIndex);
            }
            
            if (this.prevStepStartIndex === undefined) {
                console.log('    ❌ prevStepStartIndex is undefined');
                return false;
            }
            if (!this.app.audioPlayer) {
                console.log('    ❌ audioPlayer not available');
                return false;
            }
            const currentIndex = this.app.audioPlayer.currentCueIndex;
            
            // If we moved backward, great!
            if (currentIndex < this.prevStepStartIndex) {
                console.log('    ✅ Moved backward successfully');
                return true;
            }
            
            // If we're at index 0 and started at index 0, accept it
            if (this.prevStepStartIndex === 0 && currentIndex === 0) {
                console.log('    ✅ Already at first cue, shortcut executed correctly');
                return true;
            }
            
            console.log('    ❌ No backward movement detected');
            console.log('    Debug: startIndex=', this.prevStepStartIndex, 'currentIndex=', currentIndex);
            return false;
        },
        onStart: () => {
            // Store the starting index when this step begins
            if (this.app.audioPlayer) {
                this.prevStepStartIndex = this.app.audioPlayer.currentCueIndex;
            }
            // Ensure text input is NOT focused during keyboard shortcuts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.blur();
                userInput.value = ''; // Clear any existing content
            }
        },
        onComplete: () => {
            // Play the new sentence after successful navigation
            setTimeout(() => {
                if (this.app.audioPlayer) {
                    this.app.audioPlayer.playCurrentSentence();
                }
            }, 200);
        }
    },
    {
        id: 'speed-control',
        title: 'Speed Control',
        description: 'Click the speed button 3x to cycle through all speeds (100%, 75%, 50%).',
        targetSelector: '#speedBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
    // Check if user completed a full cycle: 100% → 75% → 50% → 100%
    if (!this.speedStatesVisited) {
        this.speedStatesVisited = new Set();
    }
    
    // Don't add speeds here - that happens in executeKeyboardShortcutAction
    if (this.app.audioPlayer) {
        console.log('    current speed:', this.app.audioPlayer.currentSpeed);
        console.log('    visited speeds:', Array.from(this.speedStatesVisited));
    }
    
    // Must have visited all three speeds AND be back at 100%
    const hasAllSpeeds = this.speedStatesVisited.has(1.0) && 
                        this.speedStatesVisited.has(0.75) && 
                        this.speedStatesVisited.has(0.5);
    const backToStart = this.app.audioPlayer.currentSpeed === 1.0;
    const completedCycle = hasAllSpeeds && backToStart && this.speedStatesVisited.size >= 3;
    
    console.log('    has all speeds:', hasAllSpeeds);
    console.log('    back to 100%:', backToStart);
    console.log('    completed full cycle:', completedCycle);
    
    return completedCycle;
},
        onInteraction: () => {
            // Track current speed and play sentence to demonstrate the speed change
            setTimeout(() => {
                if (this.app.audioPlayer) {
                    this.speedStatesVisited.add(this.app.audioPlayer.currentSpeed);
                    // Play the current sentence to demonstrate the speed change
                    this.app.audioPlayer.playCurrentSentence();
                }
            }, 50);
        }
    },
   {
    id: 'keyboard-speed',
    title: 'Keyboard Shortcut: Speed Control',
        description: 'Press Shift + Cmd/Ctrl + ↓ (down arrow) to cycle: 100% → 75% → 50% → 100%. Audio will slow down accordingly.',
    targetSelector: '#speedBtn',
    highlightType: 'pulse',
    action: 'keyboard',
    keyCombo: ['Shift', 'Meta', 'ArrowDown'],
    mobileHidden: true,
    validation: () => {
    console.log('  🔍 VALIDATION DEBUG (keyboard-speed):');
    
    if (!this.speedStatesVisited) {
        this.speedStatesVisited = new Set();
    }
    
    if (this.app.audioPlayer) {
        console.log('    current speed:', this.app.audioPlayer.currentSpeed);
        console.log('    visited speeds:', Array.from(this.speedStatesVisited));
    }
    
    // Must have visited all three speeds AND be back at 100% (same as mouse version)
    const hasAllSpeeds = this.speedStatesVisited.has(1.0) && 
                        this.speedStatesVisited.has(0.75) && 
                        this.speedStatesVisited.has(0.5);
    const backToStart = this.app.audioPlayer.currentSpeed === 1.0;
    const completedCycle = hasAllSpeeds && backToStart && this.speedStatesVisited.size >= 3;
    
    console.log('    has all speeds:', hasAllSpeeds);
    console.log('    back to 100%:', backToStart);
    console.log('    completed full cycle:', completedCycle);
    
    return completedCycle;
},
    onStart: () => {
        // Track the starting speed
        if (this.app.audioPlayer) {
            this.speedStatesVisited.add(this.app.audioPlayer.currentSpeed);
        }
        
        // Ensure text input is NOT focused during keyboard shortcuts
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.blur();
            userInput.value = ''; // Clear any existing content
        }
    },
   onInteraction: () => {
    // Removed redundant playCurrentSentence call to prevent double audio reset
    // No need to add to speedStatesVisited here; handled in executeKeyboardShortcutAction
},
    onComplete: () => {
        // Play sentence to demonstrate the final speed
        setTimeout(() => {
            if (this.app.audioPlayer) {
                this.app.audioPlayer.playCurrentSentence();
            }
        }, 200);
    }
},
{
    id: 'hint-button',
    title: 'Hint System',
    description: 'Click the "?" button to see the expected text for the current sentence.',
    targetSelector: '#hintBtn',
    highlightType: 'pulse',
    action: 'click',
    validation: () => {
        const hintDisplay = document.getElementById('hintDisplay');
        return hintDisplay && hintDisplay.style.display !== 'none';
    },
    onComplete: () => {
        // Add a delay so users can notice the hint, then manually hide it
        return new Promise(resolve => {
            setTimeout(() => {
                // Manually hide the hint to override the auto-hide timer
                const hintDisplay = document.getElementById('hintDisplay');
                if (hintDisplay) {
                    hintDisplay.style.display = 'none';
                }
                resolve();
            }, 800);
        });
    }
},  
    {
        id: 'keyboard-hint',
        title: 'Keyboard Shortcut: Hint System',
        description: 'Press Shift + Cmd/Ctrl + ß (or / or ,) to show/hide the hint for the current sentence.',
        targetSelector: '#hintBtn',
        highlightType: 'pulse',
        action: 'keyboard',
        keyCombo: ['Shift', 'Meta', 'ß'],
        mobileHidden: true,
        validation: () => {
            console.log('  🔍 VALIDATION DEBUG (keyboard-hint):');
            
            const hintDisplay = document.getElementById('hintDisplay');
            console.log('    hintDisplay element exists:', !!hintDisplay);
            if (hintDisplay) {
                console.log('    hintDisplay style.display:', hintDisplay.style.display);
                console.log('    hintDisplay computed display:', window.getComputedStyle(hintDisplay).display);
            }
            
            // For keyboard hint validation, we want to check if the hint display state changed
            // We'll track if the hint was toggled from its initial state
            const isVisible = hintDisplay && hintDisplay.style.display !== 'none';
            const stateChanged = this.keyboardHintStepStartState !== undefined && 
                               isVisible !== this.keyboardHintStepStartState;
            
            console.log('    start state:', this.keyboardHintStepStartState, 'current visible:', isVisible);
            console.log('    state changed:', stateChanged);
            
            return stateChanged;
        },
        onStart: () => {
            // Store the starting hint display state
            const hintDisplay = document.getElementById('hintDisplay');
            this.keyboardHintStepStartState = hintDisplay && hintDisplay.style.display !== 'none';
            // Ensure text input is NOT focused during keyboard shortcuts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.blur();
                userInput.value = '';
                // Remove highlight if present (should not be here)
                userInput.classList.remove('tutorial-highlight-glow');
            }
        },
        onComplete: () => {
            // Remove glowing highlight from input box after this step
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.classList.remove('tutorial-highlight-glow');
            }
            // Add a delay so users can notice the hint toggle, then manually hide it
            return new Promise(resolve => {
                setTimeout(() => {
                    // Manually hide the hint to override the auto-hide timer
                    const hintDisplay = document.getElementById('hintDisplay');
                    if (hintDisplay && hintDisplay.style.display !== 'none') {
                        hintDisplay.style.display = 'none';
                    }
                    resolve();
                }, 800);
            });
        },
    },
    {
        id: 'typing-practice-2',
        title: 'Typing Practice',
        description: 'Type "es ist" in lowercase in the text input area to demonstrate case sensitivity.',
        targetSelector: '#userInput',
        highlightType: 'pulse',
        action: 'typing',
        validation: () => {
            const userInput = document.getElementById('userInput');
            if (!userInput) return false;
            const value = userInput.value.toLowerCase();
            return value.includes('es ist');
        },
        onStart: () => {
            // Focus and highlight the text input when this step starts
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.focus();
                userInput.classList.add('tutorial-highlight-glow');
            }
        },
        onComplete: () => {
            // Remove highlight after this step
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.classList.remove('tutorial-highlight-glow');
            }
        }
        // Note: No onComplete callback - we want to keep the text visible for the Aa demo
    },
    {
        id: 'case-sensitivity',
        title: 'Case Sensitivity Toggle',
        description: 'Click the "Aa" button to toggle case sensitivity on/off. Notice how this affects the text you just typed.',
        targetSelector: '#ignoreCaseBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            const btn = document.getElementById('ignoreCaseBtn');
            return btn && btn.classList.contains('active');
        },
        onComplete: () => {
            // Add a delay so users can process the case sensitivity change
            return new Promise(resolve => {
                setTimeout(resolve, 2000); // 2 second delay to notice the effect
            });
        }
    },
    {
        id: 'focus-mode',
        title: 'Focus Mode',
        description: 'Click the focus button to hide live feedback for concentrated practice.',
        targetSelector: '#focusModeBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            const btn = document.getElementById('focusModeBtn');
            return btn && btn.classList.contains('active');
        },
        onComplete: () => {
            // Add a delay so users can see the focus mode effect
            return new Promise(resolve => {
                setTimeout(resolve, 3000); // 3 second delay to notice the focus mode
            });
        }
    },
    {
        id: 'close-button',
        title: 'End Dictation',
        description: 'Click the "X" button to end the dictation session and see your results.',
        targetSelector: '#endDictationBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            // This step will be completed manually, not through validation
            return false;
        },
        onStart: () => {
            // Set up special handling for this step
            this.endDictationStepActive = true;
        },
        onComplete: () => {
            this.endDictationStepActive = false;
        }
    },
    {
        id: 'results-tooltip',
        title: 'Results Tooltips',
        description: 'On the results screen, click any red word or gap to see the correct answer in a tooltip.',
        targetSelector: '.result-word-wrong, .result-word-missing, .result-gap',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            // Validation: a tooltip is visible on a result word/gap
            const tooltip = document.querySelector('.word-tooltip');
            return !!tooltip && tooltip.offsetParent !== null;
        },
        onStart: () => {
            // Don't scroll during tutorial
            // const statsSection = document.getElementById('statsSection');
            // if (statsSection) statsSection.scrollIntoView({ behavior: 'smooth' });
            // Add click listener for result words/gaps to complete the step
            this._resultsTooltipClickHandler = (e) => {
                if (
                    e.target.classList.contains('result-word-wrong') ||
                    e.target.classList.contains('result-word-missing') ||
                    e.target.classList.contains('result-gap')
                ) {
                    this.stepCompleted();
                }
            };
            document.addEventListener('click', this._resultsTooltipClickHandler, true);
        },
        onComplete: () => {
            // Hide tooltip after a short delay
            setTimeout(() => {
                document.querySelectorAll('.word-tooltip').forEach(t => t.remove());
            }, 1000);
            // Remove click listener
            if (this._resultsTooltipClickHandler) {
                document.removeEventListener('click', this._resultsTooltipClickHandler, true);
                this._resultsTooltipClickHandler = null;
            }
        }
    },
    {
        id: 'export-csv-button',
        title: 'CSV Export Button',
        description: 'The CSV Export button downloads your dictation results as a spreadsheet file. Try clicking it to see how it works.',
        targetSelector: '#exportCsvBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
            return this.exportCsvButtonClicked;
        },
        onStart: () => {
            this.exportCsvButtonClicked = false;
        },
        onComplete: () => {
            // Continue to next step
        }
    },
    {
        id: 'restart-button',
        title: 'Restart Button',
        description: 'The Restart button (↻) clears all your text and starts the dictation over from the beginning. Click it to see how it works!',
        targetSelector: '#restartBtn',
        highlightType: 'pulse',
        action: 'click',
        validation: () => {
        return this.restartButtonClicked;
    },
    onStart: () => {
        this.restartButtonClicked = false;
    },
    onComplete: () => {
        // Tutorial complete after this step
    }
    },
    {
    id: 'tutorial-complete',
    title: 'Tutorial Complete!',
    description: 'Congratulations! You\'ve learned all the features. Click "Start Dictation" to begin using the tool with a fresh start.',
    targetSelector: null,
    highlightType: null,
    action: 'complete',
    validation: () => false, // Never auto-validates
    onStart: () => {
        // Remove any lingering highlights
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.classList.remove('tutorial-highlight-glow');
        }
    }
},
];

        // Filter out keyboard shortcut steps on mobile
        this.steps = allSteps.filter(step => {
            if (this.isMobile && step.mobileHidden) {
                return false; // Exclude this step on mobile
            }
            return true; // Include this step
        });

        // Log the step count for debugging
        console.log(`Tutorial initialized: ${this.isMobile ? 'Mobile' : 'Desktop'} mode, ${this.steps.length} total steps`);
        console.log('Steps included:', this.steps.map(s => s.id));
    }

    /**
     * Start the tutorial
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.isCompleted = false; // Reset completion state
        this.currentStep = 0;
        
        // Set global reference for other modules
        window.activeTutorial = this;
        // Add global listeners ONLY when tutorial starts
        this.globalClickHandler = (e) => this.handleGlobalClick(e);
        this.globalKeyHandler = (e) => this.handleGlobalKeydown(e); 
        this.globalCaptureHandler = (e) => this.handleCaptureKeydown(e);
        this.globalInputHandler = (e) => this.handleGlobalInput(e);


        DOMHelpers.addEventListener(document, 'click', this.globalClickHandler);
        DOMHelpers.addEventListener(document, 'keydown', this.globalKeyHandler);
        DOMHelpers.addEventListener(document, 'keydown', this.globalCaptureHandler, { capture: true });
        DOMHelpers.addEventListener(document, 'input', this.globalInputHandler);

        console.log('🎯 Set window.activeTutorial:', !!window.activeTutorial);

        
        this.createTutorialOverlay();
        this.showStep(this.currentStep);
    }

    /**
     * Create the tutorial overlay and UI
     */
    createTutorialOverlay() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorialOverlay';
        this.overlay.className = 'tutorial-overlay';
        this.overlay.style.zIndex = '20000'; // Ensure tutorial is always on top
        
        // Create tutorial container
        this.tutorialContainer = document.createElement('div');
        this.tutorialContainer.className = 'tutorial-container';
        this.tutorialContainer.style.zIndex = '20001'; // Even higher than overlay
        
        // Create tutorial content
        const content = `
            <div class="tutorial-header">
                <div class="tutorial-header-progress">
                    <div class="step-counter">
                        <span class="current-step">1</span> / <span class="total-steps">${this.steps.length + 1}</span>
                    </div>
                    <div class="step-progress">
                        <div class="progress-fill"></div>
                    </div>
                </div>
                <button class="tutorial-close" id="tutorialClose">×</button>
            </div>
            <div class="tutorial-content">
                <h3 class="step-title">Welcome to the Tutorial</h3>
                <p class="step-description">Follow the instructions to learn all features.</p>
                <div class="tutorial-actions">
                    <button class="tutorial-btn secondary" id="tutorialPrev">Previous</button>
                    <button class="tutorial-btn primary" id="tutorialNext">Next</button>
                </div>
            </div>
            <div class="tutorial-checkmark" id="tutorialCheckmark" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
            </div>
        `;
        
        this.tutorialContainer.innerHTML = content;
        this.overlay.appendChild(this.tutorialContainer);
        document.body.appendChild(this.overlay);
        
        // Position the tutorial modal near the main player
        this.positionTutorialNearPlayer();
        window.addEventListener('resize', () => this.positionTutorialNearPlayer());
        window.addEventListener('scroll', () => this.positionTutorialNearPlayer(), true);

        // Setup event listeners
        this.setupTutorialEventListeners();
        
        // Create checkmark element
        this.checkmarkElement = document.getElementById('tutorialCheckmark');
    }

    positionTutorialNearPlayer() {
    // Try to find the main player element (player-pill or playBtn)
    let player = document.querySelector('.player-pill');
    if (!player) player = document.getElementById('playBtn');
    if (!player) {
        // Fallback: default to bottom right
        this.tutorialContainer.style.position = 'fixed';
        this.tutorialContainer.style.bottom = '20px';
        this.tutorialContainer.style.right = '20px';
        this.tutorialContainer.style.left = '';
        this.tutorialContainer.style.top = '';
        this.tutorialContainer.style.height = 'auto';
        this.tutorialContainer.style.minHeight = 'auto';
        this.tutorialContainer.style.maxHeight = 'fit-content';
        return;
    }
    const rect = player.getBoundingClientRect();
    // Place the modal 40px below and aligned right with the player
    const offset = 40;
    const modalWidth = this.tutorialContainer.offsetWidth || 400;
    let top = rect.bottom + offset;
    let left = rect.right - modalWidth + 50; // Move more to the right
    // Clamp left to at least 16px from the left edge
    left = Math.max(left, 16);
    // Clamp top to not go off the bottom of the viewport
    const maxTop = window.innerHeight - this.tutorialContainer.offsetHeight - 16;
    if (top > maxTop) top = maxTop;
    this.tutorialContainer.style.position = 'fixed';
// Only set position on first call, then keep it fixed
        if (!this.tutorialContainer.dataset.positioned) {
            this.tutorialContainer.style.top = `${top}px`;
            this.tutorialContainer.style.left = `${left}px`;
            this.tutorialContainer.dataset.positioned = 'true';
        }
        this.tutorialContainer.style.right = '';
        this.tutorialContainer.style.bottom = '';
    }

    /**
     * Setup event listeners for tutorial controls
     */
    setupTutorialEventListeners() {
    const closeBtn = document.getElementById('tutorialClose');
    const prevBtn = document.getElementById('tutorialPrev');
    const nextBtn = document.getElementById('tutorialNext');
    const skipBtn = document.getElementById('tutorialSkip');
    
    // Add error checking before adding listeners
    if (closeBtn) DOMHelpers.addEventListener(closeBtn, 'click', () => this.close());
    if (prevBtn) DOMHelpers.addEventListener(prevBtn, 'click', () => this.previousStep());
    if (nextBtn) DOMHelpers.addEventListener(nextBtn, 'click', () => this.nextStep());
    if (skipBtn) DOMHelpers.addEventListener(skipBtn, 'click', () => this.close());
        
        // Global event listeners for validation
        // DOMHelpers.addEventListener(document, 'click', (e) => this.handleGlobalClick(e));
        // DOMHelpers.addEventListener(document, 'keydown', (e) => this.handleGlobalKeydown(e));
        // Also add a capture phase listener to catch events early
        // DOMHelpers.addEventListener(document, 'keydown', (e) => this.handleCaptureKeydown(e), { capture: true });
        // DOMHelpers.addEventListener(document, 'input', (e) => this.handleGlobalInput(e));
    }

    /**
     * Show a specific tutorial step
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;
        
        const step = this.steps[stepIndex];
        this.currentStep = stepIndex;
        
        // Always start with a clean slate - remove any existing highlights
        this.removeHighlight();
        
        // Update UI
        this.updateTutorialUI(step);
        
        // Highlight target element - using explicit method call
        if (typeof this.addHighlight === 'function') {
            this.addHighlight(step.targetSelector, step.highlightType);
        } else {
            console.error('addHighlight method not found');
        }
        
        // Update progress
        this.updateProgress();
        
        // Call onStart callback if it exists
        if (step.onStart) {
            step.onStart();
        }
        // Trigger resize after step change to adjust iframe height
        setTimeout(() => {
            if (this.app && this.app.autoResize) {
                this.app.autoResize.triggerResize();
            }
        }, 150);
    }

    /**
     * Update tutorial UI with current step info
     */
    updateTutorialUI(step) {
    // Don't update UI if tutorial is completed
    if (this.isCompleted) {
        return;
    }
    
    const currentStepEl = document.querySelector('.current-step');
    const titleEl = document.querySelector('.step-title');
    const descriptionEl = document.querySelector('.step-description');
    const prevBtn = document.getElementById('tutorialPrev');
    const nextBtn = document.getElementById('tutorialNext');
    
    if (currentStepEl) currentStepEl.textContent = this.currentStep + 1;
    if (titleEl) titleEl.textContent = step.title;
    if (descriptionEl) descriptionEl.textContent = step.description;

    // Regular button setup for ALL steps (including the last one)
    if (prevBtn) {
        prevBtn.textContent = 'Previous';
        prevBtn.classList.remove('primary');
        prevBtn.classList.add('secondary');
        prevBtn.disabled = this.currentStep === 0;
        prevBtn.onclick = () => this.previousStep();
    }
    
if (nextBtn) {
        // Special handling for the tutorial-complete step
        if (step.id === 'tutorial-complete') {
            nextBtn.textContent = 'Start Dictation';
            nextBtn.classList.remove('secondary');
            nextBtn.classList.add('primary');
            nextBtn.style.display = '';
            nextBtn.disabled = false;
            nextBtn.onclick = () => {
                window.location.reload(); // Reload page for fresh start
            };
        } else {
            // Hide the Next/Finish button on the 'End Dictation' step (slide 17, id: 'close-button')
            const isEndDictationStep = step.id === 'close-button';
            nextBtn.style.display = isEndDictationStep ? 'none' : '';
            nextBtn.disabled = false;
            nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next';
            nextBtn.onclick = () => this.nextStep();
        }
    }
    }
    /**
     * Add highlight to target element
     */
    addHighlight(selector, type = 'pulse') { // never put a semicolon after the round bracket
        // Always remove existing highlights first
        this.removeHighlight();
        
        // Special handling for export options step - highlight both buttons
        const currentStep = this.steps[this.currentStep];
        if (currentStep && currentStep.id === 'export-options') {
            this.highlightExportOptions();
            return;
        }
        
        const element = document.querySelector(selector);
        if (!element) {
            console.warn('Tutorial target element not found:', selector);
            return;
        }
        
        // Make sure the target element is visible and clickable
        element.classList.add('tutorial-target');
        
        // Get element position
        const rect = element.getBoundingClientRect();
        
        // Position tutorial dialog to avoid covering the highlighted element
        this.positionTutorialDialog(rect, selector);
        
        // Skip creating highlight overlay for text input fields to avoid visual overlap
        if (selector.includes('userInput')) {
            // Don't scroll during tutorial to prevent jumping
             // element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        // Create highlight overlay for other elements (buttons, etc.)
        const highlight = document.createElement('div');
        highlight.className = `tutorial-highlight tutorial-highlight-${type}`;
        
        // For buttons: circular highlight
        const size = Math.min(100, Math.max(rect.width, rect.height) + 24);
        const width = size;
        const height = size;
        const borderRadius = '50%';
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        highlight.style.position = 'fixed';
        highlight.style.left = (centerX - width / 2) + 'px';
        highlight.style.top = (centerY - height / 2) + 'px';
        highlight.style.width = width + 'px';
        highlight.style.height = height + 'px';
        highlight.style.borderRadius = borderRadius;
        highlight.style.zIndex = '15000';
        highlight.style.pointerEvents = 'none';
        
        document.body.appendChild(highlight);
        this.highlightElement = highlight;
        
        // Don't scroll during tutorial to prevent jumping
        // element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Highlight both restart and export CSV buttons for the export options step
     */
    highlightExportOptions() {
        const restartBtn = document.getElementById('restartBtn');

if (!restartBtn) return;

restartBtn.classList.add('tutorial-target');
const rect = restartBtn.getBoundingClientRect();

const highlight = document.createElement('div');
highlight.className = 'tutorial-highlight tutorial-highlight-pulse';

const size = Math.min(100, Math.max(rect.width, rect.height) + 24);
const centerX = rect.left + rect.width / 2;
const centerY = rect.top + rect.height / 2;

highlight.style.position = 'fixed';
highlight.style.left = (centerX - size / 2) + 'px';
highlight.style.top = (centerY - size / 2) + 'px';
highlight.style.width = size + 'px';
highlight.style.height = size + 'px';
highlight.style.borderRadius = '50%';
highlight.style.zIndex = '15000';
highlight.style.pointerEvents = 'none';

document.body.appendChild(highlight);
this.highlightElement = highlight;
    }

    /**
     * Create a spotlight effect around the target element
     */
    createSpotlight(rect) {
        const spotlight = document.createElement('div');
        spotlight.className = 'tutorial-spotlight';
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const size = Math.max(rect.width, rect.height) + 100;
        
        spotlight.style.position = 'fixed'; // Use fixed positioning
        spotlight.style.left = (centerX - size / 2) + 'px';
        spotlight.style.top = (centerY - size / 2) + 'px';
        spotlight.style.width = size + 'px';
        spotlight.style.height = size + 'px';
        spotlight.style.background = 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.3) 70%)';
        spotlight.style.borderRadius = '50%';
        spotlight.style.zIndex = '14000';
        spotlight.style.pointerEvents = 'none';
        spotlight.style.animation = 'spotlightPulse 2s infinite';
        
        document.body.appendChild(spotlight);
        this.spotlightElement = spotlight;
    }

    /**
     * Remove highlight
     */
    removeHighlight() {
        // Remove any existing highlight elements by class
        const existingHighlights = document.querySelectorAll('.tutorial-highlight');
        existingHighlights.forEach(el => {
            el.remove();
        });
        
        // Remove specific tracked elements
        if (this.highlightElement) {
            this.highlightElement.remove();
            this.highlightElement = null;
        }
        
        // Remove multiple highlights (for export options step)
        if (this.multipleHighlights) {
            this.multipleHighlights.forEach(highlight => {
                if (highlight.parentNode) {
                    highlight.remove();
                }
            });
            this.multipleHighlights = null;
        }
        
        if (this.spotlightElement) {
            this.spotlightElement.remove();
            this.spotlightElement = null;
        }
        
        // Remove target class from all elements
        const targetElements = document.querySelectorAll('.tutorial-target');
        targetElements.forEach(el => {
            el.classList.remove('tutorial-target');
        });
        
        // IMPORTANT: Also remove text input highlight
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.classList.remove('tutorial-highlight-glow');
        }
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            // Total steps includes the completion screen
            const totalSteps = this.steps.length + 1;
            const progress = ((this.currentStep + 1) / totalSteps) * 100;
            progressFill.style.width = progress + '%';
        }
    }

    /**
     * Show success checkmark
     */
    showCheckmark() {
        if (this.checkmarkElement) {
            // Position checkmark over the close button
            const closeButton = document.getElementById('tutorialClose');
            if (closeButton) {
                const closeRect = closeButton.getBoundingClientRect();
                const containerRect = this.tutorialContainer.getBoundingClientRect();
                
                // Calculate position relative to tutorial container
                const centerX = closeRect.left + closeRect.width/2 - containerRect.left;
                const centerY = closeRect.top + closeRect.height/2 - containerRect.top;
                
                // Position checkmark centered over close button
                this.checkmarkElement.style.left = (centerX - 24) + 'px'; // 24 = half of checkmark width
                this.checkmarkElement.style.top = (centerY - 24) + 'px';  // 24 = half of checkmark height
            }
            
            this.checkmarkElement.style.display = 'block';
            this.checkmarkElement.classList.add('tutorial-checkmark-show');
            
            // Hide after animation
            setTimeout(() => {
                this.checkmarkElement.style.display = 'none';
                this.checkmarkElement.classList.remove('tutorial-checkmark-show');
            }, 1500);
        }
    }

    /**
     * Handle global clicks for validation
     */
    handleGlobalClick(event) {
        if (!this.isActive) return;
        
        // Add debugging right at the start
        console.log('🔴 TUTORIAL CLICK INTERCEPTED:', {
            target: event.target,
            targetId: event.target.id,
            targetClass: event.target.className,
            isDefaultPrevented: event.defaultPrevented,
            bubbles: event.bubbles,
        // Check if click is from parent frame
         isFromParent: window.parent !== window && !document.contains(event.target)
            });

        const currentStep = this.steps[this.currentStep];
        
        // Special handling for restart button step
if (currentStep.id === 'restart-button') {
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn && (event.target === restartBtn || restartBtn.contains(event.target))) {
        console.log('Restart button clicked during restart step');
        this.restartButtonClicked = true;
        setTimeout(() => {
            if (currentStep.validation && currentStep.validation()) {
                this.stepCompleted();
            }
        }, 100);
        return;
    }
}

// Special handling for export CSV button step  
if (currentStep.id === 'export-csv-button') {
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn && (event.target === exportBtn || exportBtn.contains(event.target))) {
        console.log('Export CSV button clicked during export step');
        this.exportCsvButtonClicked = true;
        setTimeout(() => {
            if (currentStep.validation && currentStep.validation()) {
                this.stepCompleted();
            }
        }, 100);
        return;
    }
            
            if (exportBtn && (event.target === exportBtn || exportBtn.contains(event.target))) {
                console.log('Export CSV button clicked during export options step');
                this.exportOptionsInteracted = true;
                setTimeout(() => {
                    if (currentStep.validation && currentStep.validation()) {
                        this.stepCompleted();
                    }
                }, 100);
                return;
            }
        }
        
       // Special handling for end dictation step
if (currentStep.id === 'close-button') {
    const endBtn = document.getElementById('endDictationBtn');
    if (endBtn && (event.target === endBtn || endBtn.contains(event.target))) {
        console.log('End dictation button clicked - advancing tutorial');
        
        // Let the click happen, then advance tutorial after a delay
        setTimeout(() => {
            if (this.endDictationStepActive) {
                this.stepCompleted();
            }
        }, 1000);
        return;
    }
}
        
        if (currentStep.action !== 'click' && currentStep.action !== 'doubleclick') return;
        
        const target = document.querySelector(currentStep.targetSelector);
        if (target && (event.target === target || target.contains(event.target))) {
            
            // Handle double-click detection
            if (currentStep.action === 'doubleclick') {
                if (!this.doubleClickTracker) {
                    this.doubleClickTracker = { clicks: 0, lastClickTime: 0 };
                }
                
                const now = Date.now();
                const timeSinceLastClick = now - this.doubleClickTracker.lastClickTime;
                
                if (timeSinceLastClick < 500) { // 500ms window for double-click
                    this.doubleClickTracker.clicks++;
                    if (this.doubleClickTracker.clicks >= 2) {
                        console.log('🖱️ Double-click detected!');
                        // Execute double-click action - repeat sentence
                        if (this.app.audioPlayer) {
                            this.app.audioPlayer.playCurrentSentence();
                        }
                        
                        // Reset tracker
                        this.doubleClickTracker = { clicks: 0, lastClickTime: 0 };
                        
                        // Validate after a delay
                        setTimeout(() => {
                            if (currentStep.validation && currentStep.validation()) {
                                this.stepCompleted();
                            }
                        }, 100);
                        return;
                    }
                } else {
                    // Reset if too much time has passed
                    this.doubleClickTracker.clicks = 1;
                }
                
                this.doubleClickTracker.lastClickTime = now;
                return;
            }
            
            // Handle regular single clicks
            if (currentStep.action === 'click') {
                // Call onInteraction callback if it exists
                if (currentStep.onInteraction) {
                    currentStep.onInteraction();
                }
                
                // Give a small delay for the action to take effect
                setTimeout(() => {
                    if (currentStep.validation && currentStep.validation()) {
                        this.stepCompleted();
                    }
                }, 100);
            }
        }
    }

    /**
     * Handle keydown events in capture phase for debugging
     */
    handleCaptureKeydown(event) {
        if (!this.isActive) return;
        
        const currentStep = this.steps[this.currentStep];
        if (currentStep && currentStep.action === 'keyboard') {
            console.log('🎯 TUTORIAL CAPTURE PHASE KEYDOWN:');
            console.log('  Event:', {
                key: event.key,
                code: event.code,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                altKey: event.altKey,
                type: event.type,
                target: event.target.tagName,
                defaultPrevented: event.defaultPrevented,
                propagationStopped: event.cancelBubble,
                phase: 'CAPTURE'
            });
        }
    }

    /**
     * Handle global keydown events for validation
     */
    handleGlobalKeydown(event) {
    // Log ALL events when tutorial is active for debugging
    if (this.isActive) {
        console.log('🎯 TUTORIAL ALL KEYDOWN EVENTS:');
        console.log('  validatingKeyboardStep:', this.validatingKeyboardStep);
        console.log('  event.repeat:', event.repeat);
        console.log('  event.key:', event.key);
        console.log('  Event:', event);
    }
    
    if (!this.isActive) {
        console.log('  🚫 Tutorial not active, returning');
        return;
    }

    // Prevent processing events during keyboard step validation
    if (this.validatingKeyboardStep) {
        console.log('  🚫 Ignoring event during keyboard step validation');
        return;
    }

    console.log('  ✅ Passed initial checks, continuing...');
    console.log('  📊 this.isActive:', this.isActive);
    console.log('  📊 this.validatingKeyboardStep:', this.validatingKeyboardStep);

    const currentStep = this.steps[this.currentStep];
    if (currentStep.action !== 'keyboard') return;

        
        console.log('🎯 TUTORIAL KEYDOWN DEBUG:');
        console.log('  Step:', currentStep.id);
        console.log('  Expected keyCombo:', currentStep.keyCombo);
        console.log('  Event details:', {
            key: event.key,
            code: event.code,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            repeat: event.repeat
        });
        console.log('  Event defaultPrevented:', event.defaultPrevented);
        console.log('  Event propagationStopped:', event.cancelBubble);
        
        // Check if the key combination matches
        const isMatch = this.isKeyComboMatch(event, currentStep.keyCombo);
        console.log('  Key combo match result:', isMatch);
        
        if (isMatch) {
            event.preventDefault(); 
            event.stopPropagation();
            console.log('  ✅ Tutorial: Key combo matched! Executing the actual shortcut action...');

            // Only set validatingKeyboardStep to true for 'keyboard' action steps
            if (currentStep.action === 'keyboard') {
                this.validatingKeyboardStep = true;
                console.log('  🔒 Validation flag set to:', this.validatingKeyboardStep); // For debug
            }

            // Special handling for keyboard-speed step: let executeKeyboardShortcutAction handle validation
            if (currentStep.id === 'keyboard-speed') {
                this.executeKeyboardShortcutAction(currentStep.keyCombo);
                // Do not call onInteraction or schedule validation here
                return;
            }

            // For all other steps:
            // Execute the actual keyboard shortcut action first
            this.executeKeyboardShortcutAction(currentStep.keyCombo);

            // Call onInteraction if it exists (just like mouse clicks do)
            console.log('🎯 Checking for onInteraction:', !!currentStep.onInteraction);
            if (currentStep.onInteraction) {
                console.log('🎯 Calling onInteraction now!');
                currentStep.onInteraction();
            }

            // Then validate after a delay
            setTimeout(() => {
                if (currentStep.validation) {
                    const validationResult = currentStep.validation();
                    console.log('  Validation result:', validationResult);
                    if (validationResult) {
                        console.log('  ✅ Step completed successfully!');
                        this.stepCompleted();
                    } else {
                        console.log('  ⏳ Validation failed, trying again in 200ms...');
                        // Try again with longer delay
                        setTimeout(() => {
                            const retryResult = currentStep.validation();
                            console.log('  Retry validation result:', retryResult);
                            if (retryResult) {
                                console.log('  ✅ Step completed on retry!');
                                this.stepCompleted();
                            } else {
                                console.log('  ❌ Step validation failed even on retry');
                                console.log('  🔓 Validation flag reset to:', this.validatingKeyboardStep);
                            }
                        }, 200);
                    }
                }
            }, 150);
        } else {
            console.log('  ❌ Key combo did not match');
        }
    }

    /**
     * Check if key combination matches
     */
    isKeyComboMatch(event, keyCombo) {
        console.log('  🔍 DETAILED KEY MATCH CHECK:');
        console.log('    Expected keyCombo:', keyCombo);
        console.log('    Event modifiers:', {
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey
        });
        console.log('    Event key:', event.key);
        console.log('    Platform check - isMac:', navigator.platform.toUpperCase().indexOf('MAC') >= 0);
        
        if (!keyCombo || keyCombo.length === 0) {
            console.log('    ❌ Invalid keyCombo provided');
            return false;
        }
        
        const modifiers = {
            'Shift': event.shiftKey,
            'Ctrl': event.ctrlKey,
            'Meta': event.metaKey,
            'Alt': event.altKey
        };
        
        console.log('    Checking each key in combo:');
        
        // Handle cross-platform: Meta on Mac, Ctrl on Windows/Linux
        if (keyCombo.includes('Meta')) {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            console.log('    Meta key expected, platform is Mac:', isMac);
            if (isMac && !event.metaKey) {
                console.log('    ❌ Meta key required but not pressed on Mac');
                return false;
            }
            if (!isMac && !event.ctrlKey) {
                console.log('    ❌ Ctrl key required but not pressed on non-Mac');
                return false;
            }
            console.log('    ✅ Meta/Ctrl platform check passed');
        }
        
        // Check all required modifiers and keys
        for (const key of keyCombo) {
            console.log('    Checking key:', key);
            if (key in modifiers) {
                if (!modifiers[key]) {
                    console.log('    ❌ Modifier', key, 'required but not pressed');
                    return false;
                } else {
                    console.log('    ✅ Modifier', key, 'is pressed');
                }
            } else {
                // This is the main key (not a modifier)
                // Special handling for hint shortcut alternatives
                if (key === 'ß') {
                    // For hint shortcut, accept ß, /, or , as alternatives
                    if (event.key !== 'ß' && event.key !== '/' && event.key !== ',') {
                        console.log('    ❌ Hint key mismatch. Expected: ß, /, or , Got:', event.key);
                        return false;
                    } else {
                        console.log('    ✅ Hint key matches:', event.key);
                    }
                } else {
                    // Regular key matching
                    if (event.key !== key && event.code !== key) {
                        console.log('    ❌ Main key mismatch. Expected:', key, 'Got:', event.key, '/', event.code);
                        return false;
                    } else {
                        console.log('    ✅ Main key matches:', key);
                    }
                }
            }
        }
        
        console.log('    ✅ ALL CHECKS PASSED - Key combo matches!');
        return true;
    }

    /**
     * Handle global input events for typing validation
     */
    handleGlobalInput(event) {
        if (!this.isActive) return;
        
        // Prevent typing validation during keyboard step validation
        if (this.validatingKeyboardStep) {
            console.log('  🚫 Ignoring input event during keyboard step validation');
            // Clear any unwanted input that might have been generated by shortcuts
            if (event.target && event.target.value) {
                console.log('  🧹 Clearing unwanted input:', event.target.value);
                event.target.value = '';
            }
            return;
        }
        
        const currentStep = this.steps[this.currentStep];
        if (currentStep.action !== 'typing') return;
        
        const target = document.querySelector(currentStep.targetSelector);
        if (target && event.target === target) {
            // Give a small delay for the input to be processed
            setTimeout(() => {
                if (currentStep.validation && currentStep.validation()) {
                    this.stepCompleted();
                }
            }, 100);
        }
    }

    /**
     * Handle step completion
     */
    stepCompleted() {
        if (this._stepJustCompleted) return; // Prevent double-advance
        this._stepJustCompleted = true;
        console.log('🎯 Step completed. Current step:', this.currentStep, 'Total steps:', this.steps.length);

        const currentStep = this.steps[this.currentStep];

        // Reset the keyboard validation flag if it was active for this step
        this.validatingKeyboardStep = false; //
        
        // Remove highlight immediately when step is completed
        this.removeHighlight();
        
        // Show checkmark
        this.showCheckmark();
        
        // Call onComplete callback if exists
        if (currentStep.onComplete) {
            currentStep.onComplete();
        }
        
        // Auto-advance to next step after a delay
setTimeout(() => {
    this._stepJustCompleted = false;
    this.nextStep();
    
    // Trigger resize after step completion
    if (this.app && this.app.autoResize) {
        this.app.autoResize.triggerResize();
    }
}, 1000);
}
    /**
     * Go to next step
     */
    nextStep() {
        console.log('🔄 nextStep called. Current:', this.currentStep, 'Total:', this.steps.length);

        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else if (this.currentStep === this.steps.length - 1) {
            // On the last actual step (tutorial-complete), call completeTutorial
            this.completeTutorial();
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * Complete tutorial
     */
    completeTutorial() {
        // Check if we're already on the tutorial-complete step
        if (this.currentStep < this.steps.length - 1) {
            // If not on the last step, go to it
            this.showStep(this.steps.length - 1);
            return;
        }
        
        this.isCompleted = true; // Set completion state flag
        
        // Show completion message
        const titleEl = document.querySelector('.step-title');
        const descriptionEl = document.querySelector('.step-description');
        const nextBtn = document.getElementById('tutorialNext');
        const prevBtn = document.getElementById('tutorialPrev');
        const skipBtn = document.getElementById('tutorialSkip');
        const currentStepEl = document.querySelector('.current-step');
        
        if (titleEl) titleEl.textContent = 'Tutorial Complete!';
        if (descriptionEl) descriptionEl.textContent = 'You have learned all the essential features. You can now use the dictation tool effectively!';
        }

    /**
     * Close tutorial
     */
    close() {
        if (this.preventAutoClose) {
            console.log('Tutorial close prevented during end dictation step');
            return;
        }
        this.isActive = false;
        this.removeHighlight();
        
        // Clean up any lingering highlight classes
        const userInput = document.getElementById('userInput');
        if (userInput) {
            userInput.classList.remove('tutorial-highlight-glow');
        }

        // Reset the main app state so the tool is ready for use
        if (this.app) {
            if (this.app.uiControls && typeof this.app.uiControls.reset === 'function') this.app.uiControls.reset();
            if (this.app.state && typeof this.app.state.reset === 'function') this.app.state.reset();
            if (this.app.statistics && typeof this.app.statistics.reset === 'function') this.app.statistics.reset();
            if (this.app.audioPlayer && typeof this.app.audioPlayer.reset === 'function') this.app.audioPlayer.reset();
            // Remove all event listeners by re-initializing elements, then re-initialize UI controls
            if (this.app.uiControls && typeof this.app.uiControls.initializeElements === 'function') this.app.uiControls.initializeElements();
            if (this.app.uiControls && typeof this.app.uiControls.initialize === 'function') this.app.uiControls.initialize();
            // Load lesson/audio and set up UI for dictation
            if (typeof this.app.loadInitialData === 'function') {
                this.app.loadInitialData().then(() => {
                    // Don't auto-focus after tutorial completion
                });
            }
        }

        // Clear global reference
        // Remove global listeners when tutorial closes
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler);
        }
        if (this.globalKeyHandler) {
            document.removeEventListener('keydown', this.globalKeyHandler);
        }
        if (this.globalCaptureHandler) {
            document.removeEventListener('keydown', this.globalCaptureHandler, { capture: true });
        }
        if (this.globalInputHandler) {
            document.removeEventListener('input', this.globalInputHandler);
        }
        
        window.activeTutorial = null;

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        this.tutorialContainer = null;
        this.checkmarkElement = null;
    }
    
    /**
     * Position tutorial dialog to avoid covering the highlighted element
     */
    positionTutorialDialog(rect, selector) {
        if (!this.overlay) return;
        
        // For certain steps, keep the same position as the previous step
        const currentStepId = this.steps[this.currentStep]?.id;
        if (currentStepId === 'typing-practice-1' || 
            currentStepId === 'hint-button' ||
            currentStepId === 'keyboard-hint' ||
            currentStepId === 'typing-practice-2' ||
            currentStepId === 'case-sensitivity' ||
            currentStepId === 'focus-mode' ||
            currentStepId === 'close-button' ||
            currentStepId === 'export-options') {
            // Don't change position for:
            // - slide 3 (typing-practice-1)
            // - slide 10 (hint-button)
            // - slide 11 (keyboard-hint)
            // - slide 12 (typing-practice-2) 
            // - slide 13 (case-sensitivity)
            // - slide 14 (focus-mode)
            // - slide 15 (close-button)
            // - slide 16 (export-options)
            // Keep the existing position classes from the previous step
            return;
        }
        
        // Remove existing position classes
        this.overlay.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right');
        
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const isMobile = windowWidth <= 768;
        
        // Get element center
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (isMobile) {
            // On mobile, position based on element location
            if (centerY < windowHeight / 2) {
                // Element in top half, put dialog at bottom
                this.overlay.classList.add('position-bottom');
            } else {
                // Element in bottom half, put dialog at top
                this.overlay.classList.add('position-top');
            }
        } else {
            // On desktop, use intelligent positioning
            if (selector.includes('playBtn') || selector.includes('nextBtn') || selector.includes('prevBtn') || selector.includes('speedBtn')) {
                // Audio control buttons - position to the right
                this.overlay.classList.add('position-right');
            } else if (selector.includes('userInput')) {
                // Text input area - ALWAYS position above to avoid overlap
                this.overlay.classList.add('position-top');
            } else if (selector.includes('hintBtn') || selector.includes('ignoreCaseBtn') || selector.includes('focusModeBtn')) {
                // Lower buttons - position at bottom
                this.overlay.classList.add('position-bottom');
            } else if (selector.includes('endDictationBtn')) {
                // End dictation button - position at bottom left
                this.overlay.classList.add('position-bottom');
            } else if (selector.includes('restartBtn') || selector.includes('exportCsvBtn')) {
                // Restart and export CSV buttons - position at bottom
                this.overlay.classList.add('position-bottom');
            } else {
                // Default positioning to the right
                this.overlay.classList.add('position-right');
            }
        }
    }
    
    /**
     * Check if tutorial is currently active and handling keyboard events
     */
    static isTutorialActive() {
        return window.activeTutorial && window.activeTutorial.isActive;
    }

    /**
     * Allow other modules to intercept tutorial keyboard events
     */
    static getCurrentTutorialStep() {
        if (window.activeTutorial && window.activeTutorial.isActive) {
            return window.activeTutorial.steps[window.activeTutorial.currentStep];
        }
        return null;
    }
    
    /**
     * Execute the actual keyboard shortcut action
     */
    executeKeyboardShortcutAction(keyCombo) {
        if (!this.app || !this.app.audioPlayer) {
            console.log('  ❌ App or audioPlayer not available for shortcut execution');
            return;
        }

        // Convert keyCombo to string for comparison
        const comboStr = keyCombo.join('+').toLowerCase();
        
        console.log('  🎬 Executing keyboard shortcut action for:', comboStr);

        if (comboStr.includes('enter')) {
            // Play/Pause shortcut
            console.log('  ▶️ Executing play/pause action');
            this.app.audioPlayer.togglePlayback();
        } else if (comboStr.includes('arrowright')) {
            // Next sentence shortcut
            console.log('  ⏭️ Executing next sentence action');
            this.app.audioPlayer.goToNextSentence();
        } else if (comboStr.includes('arrowleft')) {
            // Previous sentence shortcut
            console.log('  ⏮️ Executing previous sentence action');
            this.app.audioPlayer.goToPreviousSentence();
        } else if (comboStr.includes('arrowup')) {
            // Play current sentence shortcut
            console.log('  🔄 Executing play current sentence action');
            this.app.audioPlayer.playCurrentSentence();
        } else if (comboStr.includes('arrowdown')) {
            // Speed toggle shortcut
            console.log('  ⚡ Executing speed toggle action');
            // Toggle the speed
            this.app.audioPlayer.toggleSpeed();
            // Patch: Always update speedStatesVisited and validate immediately after speed change
            if (!this.speedStatesVisited) this.speedStatesVisited = new Set();
            this.speedStatesVisited.add(this.app.audioPlayer.currentSpeed);
            // Immediately trigger validation after updating the set
            const currentStep = this.steps[this.currentStep];
            if (currentStep && currentStep.id === 'keyboard-speed') {
                // Instantly complete the step on first use of the shortcut
                this.stepCompleted();
                if (this.checkmarkElement) {
                    this.checkmarkElement.classList.add('completed');
                    this.checkmarkElement.style.visibility = 'visible';
                }
                if (this.tutorialContainer) {
                    this.tutorialContainer.classList.add('step-completed');
                }
            }
        } else if (comboStr.includes('ß') || comboStr.includes('/') || comboStr.includes(',')) {
            // Hint toggle shortcut
            console.log('  💡 Executing hint toggle action');
            // Find and click the hint button
            const hintBtn = document.getElementById('hintBtn');
            if (hintBtn) {
                hintBtn.click();
            }
        } else {
            console.log('  ❓ Unknown keyboard shortcut action for:', comboStr);
        }
    }
}