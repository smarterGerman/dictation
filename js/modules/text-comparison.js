/**
 * Text comparison and alignment algorithms
 */
import { CONFIG } from '../config.js';
import { GermanChars } from './german-chars.js';

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
        refForComparison = refForComparison.replace(/[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]/g, '');
        userForComparison = userForComparison.replace(/[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]/g, '');
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
        stats: { correct, wrongPosition: 0, wrong, extra, missing }
    };
}
    
    /**
     * Compare texts for live feedback (handles punctuation display)
     */
    static compareLiveFeedback(reference, userText, options = {}) {
        const { ignoreCase = true } = options;
        
        const convertedUserText = GermanChars.convert(userText);
        const result = [];
        let userPos = 0;
        
        for (let i = 0; i < reference.length; i++) {
            const refChar = reference[i];
            
            // Show punctuation in gray
            if (GermanChars.isPunctuation(refChar)) {
                result.push({ char: refChar, status: 'punctuation' });
                continue;
            }
            
            // Handle spaces
            if (refChar === ' ') {
                result.push({ char: ' ', status: 'word-boundary' });
                continue;
            }
            
            // Skip punctuation and spaces in user input
            while (userPos < convertedUserText.length && 
                   (GermanChars.isPunctuation(convertedUserText[userPos]) || 
                    /\s/.test(convertedUserText[userPos]))) {
                userPos++;
            }
            
            if (userPos < convertedUserText.length) {
                const userChar = convertedUserText[userPos];
                const refCharNorm = ignoreCase ? refChar.toLowerCase() : refChar;
                const userCharNorm = ignoreCase ? userChar.toLowerCase() : userChar;
                
                if (refCharNorm === userCharNorm) {
                    result.push({ char: refChar, status: 'correct' });
                } else {
                    result.push({ char: userChar, status: 'wrong' });
                }
                userPos++;
            } else {
                result.push({ char: '_', status: 'missing' });
            }
        }
        
        return { chars: result };
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
     * Generate character-level comparison result from word alignment
     */
    static generateComparisonResult(alignment) {
        const result = [];
        let correct = 0;
        let wrongPosition = 0;
        let wrong = 0;
        let extra = 0;
        let missing = 0;
        
        // Get original words WITHOUT normalization for display
const userOriginalWords = convertedUserText
    .replace(/[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

let wordIndex = 0;

for (let i = 0; i < alignment.length; i++) {
    const item = alignment[i];
    
    if (i > 0) {
        result.push({ char: ' ', status: 'word-boundary' });
    }
    
    if (item.type === 'match') {
        // Use ORIGINAL word (with original capitalization)
        const originalWord = userOriginalWords[wordIndex] || item.userWord;
        for (let char of originalWord) {
            result.push({ char, status: 'correct' });
            correct++;
        }
        wordIndex++;
    } else if (item.type === 'substitute') {
        // Wrong word - use ORIGINAL capitalization
        const originalWord = userOriginalWords[wordIndex] || item.userWord;
        for (let char of originalWord) {
            result.push({ char, status: 'wrong' });
            wrong++;
        }
        wordIndex++;
    } else if (item.type === 'insert') {
        const originalWord = userOriginalWords[wordIndex] || item.userWord;
        for (let char of originalWord) {
            result.push({ char, status: 'extra' });
            extra++;
        }
        wordIndex++;
    } else if (item.type === 'delete') {
        const wordLength = item.refWord.length;
        for (let k = 0; k < wordLength; k++) {
            if (k > 0) {
                result.push({ char: ' ', status: 'char-space' });
            }
            result.push({ char: '_', status: 'missing' });
            missing++;
        }
        // Don't increment wordIndex for missing words
    }
}
        
        return {
            chars: result,
            stats: { 
                correct, 
                wrongPosition, 
                wrong, 
                extra,
                missing,
                total: this.calculateTotalChars(alignment)
            }
        };
    }
    
    /**
     * Handle character-level substitution within a word
     */
    static handleSubstitution(item, result) {
        const ref = item.refWord;
        const user = item.userWord;
        
        let missingPrefix = 0;
        let missingSuffix = 0;
        
        // Check if user word is a suffix of reference word
        for (let idx = 1; idx <= ref.length; idx++) {
            if (ref.slice(-idx) === user) {
                missingPrefix = ref.length - idx;
                break;
            }
        }
        
        // If no suffix match, check for prefix match
        if (missingPrefix === 0) {
            for (let idx = 1; idx <= ref.length; idx++) {
                if (ref.slice(0, idx) === user) {
                    missingSuffix = ref.length - idx;
                    break;
                }
            }
        }
        
        // Add missing prefix
        if (missingPrefix > 0) {
            for (let k = 0; k < missingPrefix; k++) {
                if (k > 0) result.push({ char: ' ', status: 'char-space' });
                result.push({ char: '_', status: 'missing' });
            }
        }
        
        // Add user characters (marked as wrong)
        for (let c = 0; c < user.length; c++) {
            result.push({ char: user[c], status: 'wrong' });
        }
        
        // Add missing suffix
        if (missingSuffix > 0) {
            for (let k = 0; k < missingSuffix; k++) {
                result.push({ char: ' ', status: 'char-space' });
                result.push({ char: '_', status: 'missing' });
            }
        }
    }
    
    /**
     * Calculate total reference characters (excluding spaces)
     */
    static calculateTotalChars(alignment) {
        let total = 0;
        alignment.forEach(item => {
            if (item.refWord) {
                total += item.refWord.length;
            }
        });
        return total;
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
