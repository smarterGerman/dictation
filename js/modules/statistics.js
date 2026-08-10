/**
 * Statistics tracking and calculation
 */
import { TimeHelpers } from '../utils/time-helpers.js';
import { DOMHelpers, escapeHtml } from '../utils/dom-helpers.js';
import { TextComparison, PUNCT_RE_G, splitPunctuation } from './text-comparison.js';

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
        // (The full compareTexts alignment used to be computed and stored here as
        // result.comparison; nothing ever read it, so each sentence paid a DP
        // alignment for a dead field. Removed 2026-08-08.)
        const wordStats = TextComparison.calculateWordStats(reference, userInput, options);
        
        const result = {
            sentenceIndex,
            reference,
            userInput,
            ignoreCaseUsed: options.ignoreCase !== undefined ? options.ignoreCase : true,
            stats: wordStats,
            time: sentenceTime,
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
        let { reference, userInput, ignoreCaseUsed } = result || {};
        if (typeof reference !== 'string' || typeof userInput !== 'string') {
            console.error('generateResultHTML: malformed result', result);
            return '<span class="error">Result could not be displayed</span>';
        }

        // Same NFC normalization as compareTexts, so a combining-diaeresis
        // umlaut the learner typed is not re-graded wrong on this screen.
        reference = reference.normalize('NFC');
        userInput = userInput.normalize('NFC');

        // Use the case sensitivity setting that was used when this result was recorded
        const ignoreCase = ignoreCaseUsed !== undefined ? ignoreCaseUsed : true;

        // Strip EXACTLY the set grading strips - imported from text-comparison.js,
        // the single home of that set, so this screen can never disagree with
        // the live comparison again.
        const strip = (t) => t.replace(PUNCT_RE_G, '');
        const esc = escapeHtml;

        // Reference tokens keep their VERBATIM form (punctuation, case) next to
        // the stripped key used for alignment, so the learner always reads the
        // sentence exactly as it is written: "K.O." is never shown as "KO".
        const refPairs = reference.split(/\s+/)
            .map(t => ({ verbatim: t, key: strip(t) }))
            .filter(pair => pair.key.length > 0);
        const userWords = userInput.split(/\s+/).map(t => strip(t)).filter(w => w.length > 0);

        const refKeys = refPairs.map(pair => ignoreCase ? pair.key.toLowerCase() : pair.key);
        const userKeys = userWords.map(w => ignoreCase ? w.toLowerCase() : w);

        const alignment = TextComparison.alignSequencesWithGaps(refKeys, userKeys);

        let html = '';
        let refIdx = 0;
        let userIdx = 0;

        alignment.forEach((item, index) => {
            if (index > 0) html += ' ';

            if (item.type === 'match') {
                // The learner got the word right: show the reference verbatim,
                // with its own punctuation and capitalisation.
                html += `<span class="result-word-correct">${esc(refPairs[refIdx].verbatim)}</span>`;
                refIdx++;
                userIdx++;
            } else if (item.type === 'substitute') {
                // Show what the learner typed; the tooltip carries the verbatim
                // reference word ("K.O.", not "ko").
                html += `<span class="result-word-wrong" data-correct="${esc(refPairs[refIdx].verbatim)}">${esc(userWords[userIdx])}</span>`;
                refIdx++;
                userIdx++;
            } else if (item.type === 'insert') {
                html += `<span class="result-word-extra">${esc(userWords[userIdx])}</span>`;
                userIdx++;
            } else if (item.type === 'delete') {
                // Underscores stand for the letters to type; the word's own
                // leading/trailing punctuation is shown verbatim around them.
                const pair = refPairs[refIdx];
                const parts = splitPunctuation(pair.verbatim);
                const underscores = pair.key.split('').map(() => '_').join(' ');
                html += `<span class="result-word-missing" data-missing="${esc(pair.verbatim)}">${esc(parts.lead)}${underscores}${esc(parts.trail)}</span>`;

                // Wide gap between consecutive missing words for clear separation
                const nextItem = alignment[index + 1];
                if (nextItem && nextItem.type === 'delete') {
                    html += '&nbsp;&nbsp;&nbsp;&nbsp;';
                }
                refIdx++;
            }
        });

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
