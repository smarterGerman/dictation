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

// KEEP IN SYNC with the learn-app fork:
// /opt/learn-app/src/src/lib/dictation/modules/text-comparison.js
// (levenshtein + subCost + the DP costs in config.js are duplicated there
// on purpose - the two tools deploy separately and share no package).
//
// Plain iterative Levenshtein distance between two words. The corpus tops
// out around 34 chars (Mietschuldenfreiheitsbescheinigung), so the full
// O(a*b) table is cheap even per keystroke.
function levenshtein(a, b) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    let prev = new Array(lb + 1);
    let curr = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
        curr[0] = i;
        const ca = a.charCodeAt(i - 1);
        for (let j = 1; j <= lb; j++) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[lb];
}

// Graded substitution cost: identical words are a MATCH (0); otherwise the
// cost grows with dissimilarity from just above 1 (one-letter typo in a long
// word) up to SUB_BASE + SUB_SCALE = the old flat SUB cost (completely
// different word). Because the graded cost never exceeds the old flat cost
// and DEL/INS are untouched, the DP can only shift pairings TOWARD more
// similar words - "Töre" pairs with "Tore", never with "höher".
function subCost(a, b, COST) {
    if (a === b) return COST.MATCH;
    const norm = levenshtein(a, b) / Math.max(a.length, b.length);
    // Heuristic tie-breaker: learners transcribe word onsets most reliably,
    // so among EQUALLY costly candidates prefer the one sharing the typed
    // word's first letters ("wegen" pairs with "weil", not "ein"). Two
    // distinct single-pair costs differ by at least SUB_SCALE/(L*(L-1)) -
    // ~1.7e-3 even at the corpus maximum of L=34 - so a total discount of
    // at most 4e-6 cannot flip one. Across whole alignments costs are SUMS
    // of such fractions, whose gaps have no such floor, so this is a
    // heuristic there: it may pick between two near-equal alignments, which
    // is exactly its job.
    let prefix = 0;
    const lim = Math.min(a.length, b.length, 4);
    while (prefix < lim && a[prefix] === b[prefix]) prefix++;
    return COST.SUB_BASE + COST.SUB_SCALE * norm - 0.000001 * prefix;
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

    // One entry per alignment item, in the same order as the word-boundary
    // buckets in `chars`. refIndex anchors the bucket to its reference word;
    // an inserted (extra) word has no reference word, so refIndex is null -
    // the live feedback renderer must NOT let it consume a reference slot.
    const items = [];
    let refIdx = 0;

    // Track position in original text
    let origPos = 0;

    for (let i = 0; i < alignment.length; i++) {
        const item = alignment[i];

        if (item.type === 'insert') {
            items.push({ type: item.type, refIndex: null });
        } else if (item.type === 'match' || item.type === 'substitute' || item.type === 'delete') {
            items.push({ type: item.type, refIndex: refIdx });
            refIdx++;
        } else {
            // A new alignment type MUST decide whether it consumes a
            // reference word; guessing here would silently shift every
            // later word's anchor.
            console.error('[dictation] unknown alignment type, refIndex bookkeeping is now wrong:', item.type);
            items.push({ type: item.type, refIndex: null });
        }

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
    
    // Verbatim reference tokens, filtered by the SAME rule that forms the
    // aligned words (a token whose punctuation-stripped core is empty - a
    // free-standing quote or ellipsis - vanishes from both), so token k here
    // IS the raw form of aligned word k. The live renderer must anchor
    // refIndex against THESE tokens, never against its own re-tokenization,
    // or one punctuation-only token in a lesson text would silently shift
    // every later word's anchor.
    const refTokens = reference.split(/\s+/)
        .filter(t => t.replace(PUNCT_RE_G, '').length > 0);

    return {
        chars: result,
        items,
        refTokens,
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
                    subCost(refWords[i - 1], userWords[j - 1], COST);
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
            
            // Check for match/substitute. The recomputed sum is bit-identical
            // to the fill step (same pure function, same inputs), so the
            // float comparison is exact.
            if (i > 0 && j > 0 &&
                current === dp[i - 1][j - 1] +
                           subCost(refWords[i - 1], userWords[j - 1], COST)) {
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
            
            // Insertion - but only if a user word is actually left. Reaching
            // the fallthrough below means the fill step and this backtracker
            // disagree about the cost function (see the bit-identity note
            // above); a bare else here once spun j to -1, -2, ... forever,
            // freezing the tab with no error.
            if (j > 0 && current === dp[i][j - 1] + COST.INS) {
                alignment.unshift({
                    type: 'insert',
                    refWord: null,
                    userWord: userWords[j - 1]
                });
                j--;
                continue;
            }

            console.error('[dictation] backtrack lost the DP path', { i, j, current });
            while (j > 0) alignment.unshift({ type: 'insert', refWord: null, userWord: userWords[--j] });
            while (i > 0) alignment.unshift({ type: 'delete', refWord: refWords[--i], userWord: null });
            break;
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
