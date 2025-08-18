/**
 * Statistics tracking and calculation
 */
import { TimeHelpers } from '../utils/time-helpers.js';
import { DOMHelpers } from '../utils/dom-helpers.js';
import { TextComparison } from './text-comparison.js';

export class Statistics {
    constructor() {
        this.sessionResults = [];
        this.totalSessionTime = 0;
        this.hasStartedTyping = false;
        this.sentenceStartTime = null;
        
        // DOM elements
        this.statsSection = null;
        this.accuracyPercent = null;
        this.correctWords = null;
        this.wrongWords = null;
        this.timeTaken = null;
        this.sentenceResults = null;
        this.sentencesContainer = null;
        
        this.initializeElements();
    }
    
    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.statsSection = DOMHelpers.getElementById('statsSection');
        this.accuracyPercent = DOMHelpers.getElementById('accuracyPercent');
        this.correctWords = DOMHelpers.getElementById('correctWords');
        this.wrongWords = DOMHelpers.getElementById('wrongWords');
        this.timeTaken = DOMHelpers.getElementById('timeTaken');
        this.sentenceResults = DOMHelpers.getElementById('sentenceResults');
        this.sentencesContainer = DOMHelpers.getElementById('sentencesContainer');
    }
    
    /**
     * Start timing for current sentence
     */
    startSentenceTiming() {
        if (!this.hasStartedTyping) {
            this.hasStartedTyping = true;
            this.sentenceStartTime = TimeHelpers.now();
        }
    }
    
    /**
     * Record sentence result
     */
    recordSentenceResult(sentenceIndex, reference, userInput, options = {}) {
        let sentenceTime = 0;
        
        if (this.hasStartedTyping && this.sentenceStartTime) {
            sentenceTime = TimeHelpers.msToSeconds(
                TimeHelpers.elapsed(this.sentenceStartTime)
            );
            this.totalSessionTime += sentenceTime;
        }
        
        // Calculate comparison and word stats
        const comparison = TextComparison.compareTexts(reference, userInput, options);
        const wordStats = TextComparison.calculateWordStats(reference, userInput, options);
        
        const result = {
            sentenceIndex,
            reference,
            userInput,
            stats: wordStats,
            time: sentenceTime,
            comparison,
            timestamp: TimeHelpers.now()
        };
        
        this.sessionResults.push(result);
        this.resetSentenceTiming();
        
        return result;
    }
    
    /**
     * Reset sentence timing
     */
    resetSentenceTiming() {
        this.hasStartedTyping = false;
        this.sentenceStartTime = null;
    }
    
    /**
     * Calculate overall session statistics
     */
    calculateOverallStats() {
        if (this.sessionResults.length === 0) {
            return {
                totalCorrectWords: 0,
                totalWrongWords: 0,
                totalWords: 0,
                accuracy: 0,
                totalTime: this.totalSessionTime,
                sentenceCount: 0
            };
        }
        
        let totalCorrectWords = 0;
        let totalWrongWords = 0;
        let totalWords = 0;
        
        this.sessionResults.forEach(result => {
            totalCorrectWords += result.stats.correctWords;
            totalWrongWords += result.stats.wrongWords;
            totalWords += result.stats.totalWords;
        });
        
        const accuracy = totalWords > 0 ? Math.round((totalCorrectWords / totalWords) * 100) : 0;
        
        return {
            totalCorrectWords,
            totalWrongWords,
            totalWords,
            accuracy,
            totalTime: this.totalSessionTime,
            sentenceCount: this.sessionResults.length
        };
    }
    
    /**
     * Display final results
     */
    showFinalResults() {
        const stats = this.calculateOverallStats();
        
        // Update stats display
        DOMHelpers.setContent(this.accuracyPercent, stats.accuracy + '%');
        DOMHelpers.setContent(this.correctWords, stats.totalCorrectWords.toString());
        DOMHelpers.setContent(this.wrongWords, stats.totalWrongWords.toString());
        
        if (this.timeTaken) {
            DOMHelpers.setContent(this.timeTaken, TimeHelpers.formatTime(stats.totalTime));
        }
        
        // Show stats section
        this.showStatsSection();
        
        // Show detailed sentence results
        this.showDetailedResults();
        
        return stats;
    }
    
    /**
     * Show statistics section
     */
    showStatsSection() {
        // Hide input areas and collapse text section
        const inputArea = DOMHelpers.querySelector('.input-area');
        const textSection = DOMHelpers.querySelector('.text-section');
        
        DOMHelpers.toggleDisplay(inputArea, false);
        
        if (textSection) {
            DOMHelpers.toggleClass(textSection, 'collapsed', true);
        }
        
        // Show stats and move them up
        const statsContainer = DOMHelpers.querySelector('.stats-section');
        if (statsContainer) {
            DOMHelpers.toggleClass(statsContainer, 'active', true);
        }
        
        DOMHelpers.toggleDisplay(this.statsSection, true, 'flex');
    }
    
    /**
     * Hide statistics section
     */
    hideStatsSection() {
        // Show input areas and restore text section
        const inputArea = DOMHelpers.querySelector('.input-area');
        const textSection = DOMHelpers.querySelector('.text-section');
        
        DOMHelpers.toggleDisplay(inputArea, true, 'flex');
        
        if (textSection) {
            DOMHelpers.toggleClass(textSection, 'collapsed', false);
        }
        
        // Hide stats and restore normal position
        const statsContainer = DOMHelpers.querySelector('.stats-section');
        if (statsContainer) {
            DOMHelpers.toggleClass(statsContainer, 'active', false);
        }
        
        DOMHelpers.toggleDisplay(this.statsSection, false);
        DOMHelpers.toggleDisplay(this.sentenceResults, false);
    }
    
    /**
     * Show detailed sentence-by-sentence results
     */
    showDetailedResults() {
        if (!this.sentenceResults || !this.sentencesContainer) return;
        
        // Clear previous results
        this.sentencesContainer.innerHTML = '';
        
        // Generate HTML for each sentence result
        this.sessionResults.forEach((result, index) => {
            const sentenceDiv = DOMHelpers.createElement('div', {
                className: 'sentence-result'
            });
            
            sentenceDiv.innerHTML = this.generateResultHTML(result);
            this.sentencesContainer.appendChild(sentenceDiv);
        });
        
        // Add tooltip event listeners
        this.addTooltipListeners();
        
        // Show the results section
        DOMHelpers.toggleDisplay(this.sentenceResults, true);
    }
    
    /**
     * Generate HTML for a sentence result with word-level feedback
     */
    generateResultHTML(result) {
    const { comparison } = result;
    
    if (!comparison || !comparison.chars) {
        console.error('No comparison data found for result:', result);
        return '<span class="error">No comparison data available</span>';
    }
    
    let html = '';
    let currentWord = '';
    let wordHasError = false;
    
    comparison.chars.forEach((item, index) => {
        if (item.status === 'word-boundary' || item.status === 'char-space') {
            // End current word if any
            if (currentWord) {
                const className = wordHasError ? 'result-word-wrong' : 'result-word-correct';
                html += `<span class="${className}">${currentWord}</span>`;
                currentWord = '';
                wordHasError = false;
            }
            html += ' ';
        } else if (item.status === 'punctuation') {
            // End current word if any
            if (currentWord) {
                const className = wordHasError ? 'result-word-wrong' : 'result-word-correct';
                html += `<span class="${className}">${currentWord}</span>`;
                currentWord = '';
                wordHasError = false;
            }
            html += `<span class="char-punctuation">${item.char}</span>`;
        } else {
            // Build up current word
            currentWord += item.char;
            if (item.status === 'wrong' || item.status === 'missing' || item.status === 'extra') {
                wordHasError = true;
            }
        }
    });
    
    // Output final word if any
    if (currentWord) {
        const className = wordHasError ? 'result-word-wrong' : 'result-word-correct';
        html += `<span class="${className}">${currentWord}</span>`;
    }
    
    return html;
}
    
    /**
     * Add tooltip event listeners to wrong/missing words
     */
    addTooltipListeners() {
        const wrongWords = DOMHelpers.querySelectorAll('.result-word-wrong');
        const missingWords = DOMHelpers.querySelectorAll('.result-word-missing');
        
        wrongWords.forEach(word => {
            DOMHelpers.addEventListener(word, 'click', (e) => {
                e.stopPropagation();
                this.showTooltip(word, word.getAttribute('data-correct'));
            });
        });
        
        missingWords.forEach(word => {
            DOMHelpers.addEventListener(word, 'click', (e) => {
                e.stopPropagation();
                this.showTooltip(word, word.getAttribute('data-missing'));
            });
        });
    }
    
    /**
     * Show tooltip with correct word
     */
    showTooltip(element, text) {
        // Clean up existing tooltips
        DOMHelpers.querySelectorAll('.word-tooltip').forEach(tooltip => tooltip.remove());
        
        const tooltip = DOMHelpers.createElement('div', {
            className: 'word-tooltip'
        }, text);
        
        element.appendChild(tooltip);
        
        setTimeout(() => {
            const tooltipRect = DOMHelpers.getBounds(tooltip);
            const containerRect = DOMHelpers.getBounds(this.sentencesContainer);
            
            if (tooltipRect && containerRect) {
                if (tooltipRect.left < containerRect.left) {
                    DOMHelpers.toggleClass(tooltip, 'adjust-left', true);
                } else if (tooltipRect.right > containerRect.right) {
                    DOMHelpers.toggleClass(tooltip, 'adjust-right', true);
                }
            }
            
            DOMHelpers.toggleClass(tooltip, 'show', true);
        }, 10);
        
        // Auto-hide tooltip when clicking elsewhere
        const cleanup = (e) => {
            if (!tooltip.contains(e.target) && !element.contains(e.target)) {
                tooltip.remove();
                document.removeEventListener('click', cleanup);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', cleanup);
        }, 100);
    }
    
    /**
     * Get session results
     */
    getSessionResults() {
        return [...this.sessionResults]; // Return copy
    }
    
    /**
     * Get current session time
     */
    getSessionTime() {
        return this.totalSessionTime;
    }
    
    /**
     * Clear all statistics
     */
    clear() {
        this.sessionResults = [];
        this.totalSessionTime = 0;
        this.resetSentenceTiming();
        this.hideStatsSection();
    }
    
    /**
     * Add a result without timing (for manual additions)
     */
    addResult(result) {
        this.sessionResults.push({
            ...result,
            timestamp: TimeHelpers.now()
        });
    }
    
    /**
     * Get statistics for specific sentence
     */
    getSentenceStats(index) {
        return this.sessionResults[index] || null;
    }
    
    /**
     * Get current sentence count
     */
    getSentenceCount() {
        return this.sessionResults.length;
    }
    
    /**
     * Check if user has started typing current sentence
     */
    hasStartedCurrentSentence() {
        return this.hasStartedTyping;
    }
}
