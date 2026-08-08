/**
 * Text comparison and alignment algorithms
 */
import { CONFIG } from '../config.js';
import { GermanChars } from './german-chars.js';


// The ONE set of punctuation this tool ignores. Grading (compareTexts) and both
// renderers (live feedback in ui-controls.js, results screen in statistics.js)
// must strip the same set - when they diverge, a word can be graded correct but
// painted wrong, or the other way round (that divergence was a real 2026-08-08
// bug). Import these; never write the class out by hand again.
export const PUNCT_RE = /[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]/;
export const PUNCT_RE_G = new RegExp(PUNCT_RE.source, 'g');

// Split a word into leading punctuation, core, and trailing punctuation, so a
// renderer can show the word verbatim while treating only the core as letters.
export function splitPunctuation(word) {
    let a = 0;
    let b = word.length;
    while (a < b && PUNCT_RE.test(word[a])) a++;
    while (b > a && PUNCT_RE.test(word[b - 1])) b--;
    return { lead: word.slice(0, a), core: word.slice(a, b), trail: word.slice(b) };
}

export class TextComparison {
    /**
     * Compare user input with reference text
     */
    static compareTexts(reference, userText, options = {}) {
    const { ignoreCase = true } = options;
    
    // Convert German characters in user text
    const convertedUserText = GermanChars.convert(userText);
    
    const ignorePunctuation = true;
    
    // Keep track of BOTH original and normalized versions
    let refForComparison = reference;
    let userForComparison = convertedUserText;
    
    if (ignorePunctuation) {
        refForComparison = refForComparison.replace(PUNCT_RE_G, '');
        userForComparison = userForComparison.replace(PUNCT_RE_G, '');
    }
    
    // Store original for character extraction
    const userOriginalNoPunct = userForComparison;
    
    if (ignoreCase) {
        refForComparison = refForComparison.toLowerCase();
        userForComparison = userForComparison.toLowerCase();
    }
    
    userForComparison = userForComparison.replace(/\s+/g, ' ').trim();
    const userOriginalTrimmed = userOriginalNoPunct.replace(/\s+/g, ' ').trim();
    
    const refWords = refForComparison.split(/\s+/).filter(w => w.length > 0);
    const userWords = userForComparison.split(/\s+/).filter(w => w.length > 0);
    
    const alignment = this.alignSequencesWithGaps(refWords, userWords);
    
    const result = [];
    let correct = 0;
    let wrong = 0;
    let extra = 0;
    let missing = 0;
    
    // Track position in original text
    let origPos = 0;
    
    for (let i = 0; i < alignment.length; i++) {
        const item = alignment[i];
        
        if (i > 0) {
            result.push({ char: ' ', status: 'word-boundary' });
            // Skip space in original
            while (origPos < userOriginalTrimmed.length && userOriginalTrimmed[origPos] === ' ') {
                origPos++;
            }
        }
        
        if (item.type === 'match') {
            // Extract characters from ORIGINAL text
            const wordLen = item.userWord.length;
            for (let j = 0; j < wordLen; j++) {
                if (origPos < userOriginalTrimmed.length) {
                    result.push({ 
                        char: userOriginalTrimmed[origPos], // Original character
                        status: 'correct' 
                    });
                    origPos++;
                    correct++;
                }
            }
        } else if (item.type === 'substitute') {
            // Wrong word - use original characters
            const wordLen = item.userWord.length;
            for (let j = 0; j < wordLen; j++) {
                if (origPos < userOriginalTrimmed.length) {
                    result.push({ 
                        char: userOriginalTrimmed[origPos], // Original character
                        status: 'wrong' 
                    });
                    origPos++;
                    wrong++;
                }
            }
        } else if (item.type === 'insert') {
            // Extra word
            const wordLen = item.userWord.length;
            for (let j = 0; j < wordLen; j++) {
                if (origPos < userOriginalTrimmed.length) {
                    result.push({ 
                        char: userOriginalTrimmed[origPos],
                        status: 'extra' 
                    });
                    origPos++;
                    extra++;
                }
            }
        } else if (item.type === 'delete') {
            // Missing word
            const wordLength = item.refWord.length;
            for (let k = 0; k < wordLength; k++) {
                if (k > 0) {
                    result.push({ char: ' ', status: 'char-space' });
                }
                result.push({ char: '_', status: 'missing' });
                missing++;
            }
        }
    }
    
    return {
        chars: result,
        stats: { correct, wrong, extra, missing }
    };
}
    
/**
     * Sequence alignment with gaps using dynamic programming
     */
    static alignSequencesWithGaps(refWords, userWords) {
        const N = refWords.length;
        const M = userWords.length;
        const dp = Array.from({ length: N + 1 }, () => Array(M + 1).fill(0));
        const COST = CONFIG.alignmentCosts;
        
        // Initialize base cases
        for (let i = 0; i <= N; i++) {
            dp[i][0] = i * COST.DEL;
        }
        for (let j = 0; j <= M; j++) {
            dp[0][j] = j * COST.INS;
        }
        
        // Fill DP table
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= M; j++) {
                const matchCost = dp[i - 1][j - 1] +
                    (refWords[i - 1] === userWords[j - 1] ? COST.MATCH : COST.SUB);
                const delCost = dp[i - 1][j] + COST.DEL;
                const insCost = dp[i][j - 1] + COST.INS;
                
                dp[i][j] = Math.min(matchCost, delCost, insCost);
            }
        }
        
        // Backtrack to find alignment
        return this.backtrackAlignment(dp, refWords, userWords);
    }
    
    /**
     * Backtrack through DP table to find optimal alignment
     */
    static backtrackAlignment(dp, refWords, userWords) {
        let i = refWords.length;
        let j = userWords.length;
        const alignment = [];
        const COST = CONFIG.alignmentCosts;
        
        while (i > 0 || j > 0) {
            const current = dp[i][j];
            
            // Check for match/substitute
            if (i > 0 && j > 0 &&
                current === dp[i - 1][j - 1] +
                           (refWords[i - 1] === userWords[j - 1] ? COST.MATCH : COST.SUB)) {
                alignment.unshift({
                    type: refWords[i - 1] === userWords[j - 1] ? 'match' : 'substitute',
                    refWord: refWords[i - 1],
                    userWord: userWords[j - 1]
                });
                i--; j--;
                continue;
            }
            
            // Check for deletion
            if (i > 0 && current === dp[i - 1][j] + COST.DEL) {
                alignment.unshift({ 
                    type: 'delete', 
                    refWord: refWords[i - 1], 
                    userWord: null 
                });
                i--;
                continue;
            }
            
            // Must be insertion
            alignment.unshift({ 
                type: 'insert', 
                refWord: null, 
                userWord: userWords[j - 1] 
            });
            j--;
        }
        
        return alignment;
    }
    
/**
     * Calculate word-level statistics
     */
    static calculateWordStats(reference, userInput, options = {}) {
    const {
        ignoreCase = true,
        ignorePunctuation = true
    } = options;
    
    // IMPORTANT: Use the EXACT SAME comparison as compareTexts
    // Just count the results from the comparison instead of doing separate alignment
    const comparison = this.compareTexts(reference, userInput, options);
    
    // Count words from the comparison result
    let correctWords = 0;
    let wrongWords = 0;
    let currentWordHasError = false;
    let inWord = false;
    
    comparison.chars.forEach(item => {
        if (item.status === 'word-boundary') {
            // End of word - check if it had errors
            if (inWord) {
                if (currentWordHasError) {
                    wrongWords++;
                } else {
                    correctWords++;
                }
            }
            currentWordHasError = false;
            inWord = false;
        } else if (item.status === 'missing') {
            // Missing characters count as word errors
            currentWordHasError = true;
            inWord = true;
        } else if (item.status === 'wrong' || item.status === 'extra') {
            // Wrong or extra characters count as word errors
            currentWordHasError = true;
            inWord = true;
        } else if (item.status === 'correct') {
            // Part of a word
            inWord = true;
        }
    });
    
    // Handle last word if we ended in a word
    if (inWord) {
        if (currentWordHasError) {
            wrongWords++;
        } else {
            correctWords++;
        }
    }
    
    const totalWords = correctWords + wrongWords;
    
    return {
        correctWords,
        wrongWords,
        totalWords
    };
    }
}
