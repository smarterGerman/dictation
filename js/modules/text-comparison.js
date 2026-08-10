/**
 * Text comparison and alignment algorithms
 */
import { CONFIG } from '../config.js';
import { GermanChars } from './german-chars.js';


// SYNC-BLOCK-START engine
// The ONE set of punctuation this tool ignores. Grading (compareTexts) and both
// renderers (live feedback in ui-controls.js, results screen in statistics.js)
// must strip the same set - when they diverge, a word can be graded correct but
// painted wrong, or the other way round (that divergence was a real 2026-08-08
// bug). Import these; never write the class out by hand again.
export const PUNCT_RE = /[.,!?;:""''()„""''‚'«»\u0022\u0027\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2039\u203A\u00AB\u00BB\u275B\u275C\u275D\u275E\u300C\u300D\u300E\u300F]/;
export const PUNCT_RE_G = new RegExp(PUNCT_RE.source, 'g');

// The ONE text normalization for grading and display. NFC first (some input
// paths deliver an umlaut as base letter + combining diaeresis), then fold
// the Turkish i glyphs: a Turkish keyboard's shift+i produces İ (U+0130),
// whose Unicode lowercase is TWO code units (i + combining dot) - that
// length change desynced the per-character coloring for the whole word.
// German text never contains İ, ı, or a dotted i with an extra dot, so the
// folds are lossless here.
export function normalizeText(s) {
    return s.normalize('NFC')
        .replace(/İ/g, 'I')     // İ dotted capital -> I
        .replace(/ı/g, 'i')     // ı dotless small  -> i
        .replace(/i\u0307/g, 'i'); // i + stray combining dot -> i
}

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
// The alignment engine between the SYNC-BLOCK markers is duplicated there on
// purpose - the two tools deploy separately and share no package. Check
// drift with ~/.claude/scripts/sg-dictation-parity.sh.
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

// Normalized dissimilarity of a substituted pair: 0 = identical, 1 = nothing
// in common. Used ONLY as a tie-breaker between equal-cost alignments, never
// in the primary cost itself.
function simNorm(a, b) {
    return a === b ? 0 : levenshtein(a, b) / Math.max(a.length, b.length);
}

// Shared word onset (capped at 4 chars): learners transcribe word beginnings
// most reliably, so among equally dissimilar candidates the one sharing the
// typed word's first letters wins ("wegen" pairs with "weil", not "ein").
function sharedPrefix(a, b) {
    let p = 0;
    const lim = Math.min(a.length, b.length, 4);
    while (p < lim && a[p] === b[p]) p++;
    return p;
}

// --- Number-word equivalence -------------------------------------------
// Lesson texts write numbers as digits ("8 Cent", "halb 7", "Jahr 1995")
// while the audio speaks words, so a learner typing "acht" was marked
// wrong. A digit token and a German number word with the same value now
// grade as a MATCH. The parser is consulted ONLY when exactly one side is
// a pure digit token, so ordinary words can never accidentally equal each
// other through it.

const NUM_ONES = { ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const NUM_TEENS = { zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const NUM_TENS = { zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
// Ordinal stems ("der 9. Klasse" is spoken "neunten"): stem -> value.
const NUM_ORDINAL_STEMS = { erst: 1, zweit: 2, dritt: 3, viert: 4, fünft: 5, sechst: 6, siebt: 7, acht: 8, neunt: 9, zehnt: 10, elft: 11, zwölft: 12 };
const NUM_ORDINAL_ENDING = /(e|en|er|es|em)$/;

function parseBelowThousand(s) {
    let total = 0;
    const h = s.indexOf('hundert');
    if (h >= 0) {
        const pre = s.slice(0, h);
        const mult = pre === '' ? 1 : (NUM_ONES[pre] ?? NUM_TEENS[pre]);
        if (mult === undefined) return null;
        total = mult * 100;
        s = s.slice(h + 7);
        if (s === '') return total;
        if (s.startsWith('und')) s = s.slice(3);
    }
    if (NUM_TEENS[s] !== undefined) return total + NUM_TEENS[s];
    if (NUM_TENS[s] !== undefined) return total + NUM_TENS[s];
    if (NUM_ONES[s] !== undefined) return total + NUM_ONES[s];
    const u = s.indexOf('und');
    if (u > 0) {
        const one = NUM_ONES[s.slice(0, u)];
        const ten = NUM_TENS[s.slice(u + 3)];
        if (one !== undefined && ten !== undefined) return total + one + ten;
    }
    return null;
}

// "zweitausendsechs" -> 2006, "zweihundertfünfzigtausend" -> 250000,
// "neunzehnhundertfünfundneunzig" -> 1995, "hundertzehn" -> 110.
function parseGermanNumberWord(w) {
    if (w === 'null') return 0;
    const t = w.indexOf('tausend');
    if (t >= 0) {
        const pre = w.slice(0, t);
        const mult = pre === '' ? 1 : parseBelowThousand(pre);
        if (mult === null) return null;
        let rest = w.slice(t + 7);
        if (rest.startsWith('und')) rest = rest.slice(3);
        const r = rest === '' ? 0 : parseBelowThousand(rest);
        if (r === null) return null;
        return mult * 1000 + r;
    }
    const card = parseBelowThousand(w);
    if (card !== null) return card;
    // Ordinal: stem + declension ending ("neunte", "neunten", ...)
    const m = w.match(NUM_ORDINAL_ENDING);
    if (m) {
        const stem = w.slice(0, w.length - m[1].length);
        if (NUM_ORDINAL_STEMS[stem] !== undefined) return NUM_ORDINAL_STEMS[stem];
        // "zwanzigste" and up: cardinal stem + st
        if (stem.endsWith('st')) {
            const c = parseBelowThousand(stem.slice(0, -2));
            if (c !== null && c >= 19) return c;
        }
    }
    return null;
}

// One token pair, digits on exactly one side: "8" ~ "acht"? Hyphenated
// compounds compare part-wise: "1-zimmer-wohnung" ~ "ein-zimmer-wohnung".
function numberEquivalent(a, b) {
    const pa = a.split('-');
    const pb = b.split('-');
    if (pa.length !== pb.length) return false;
    if (pa.length > 1) {
        return pa.every((p, k) => p === pb[k] || numberEquivalent(p, pb[k]));
    }
    const da = /^\d+$/.test(a);
    const db = /^\d+$/.test(b);
    if (da === db) return false;
    const digits = parseInt(da ? a : b, 10);
    const word = parseGermanNumberWord((da ? b : a).toLowerCase());
    return word !== null && word === digits;
}

// The ONE word-equality test for the alignment: literal equality or a
// digit/number-word pair of the same value.
function wordsMatch(a, b) {
    return a === b || numberEquivalent(a, b);
}
// SYNC-BLOCK-END engine

export class TextComparison {
    /**
     * Compare user input with reference text
     */
    static compareTexts(reference, userText, options = {}) {
    const { ignoreCase = true } = options;

    // One normalization for both sides (NFC + Turkish-i folding, see
    // normalizeText). Everything downstream - tokens, chars, refTokens -
    // uses these normalized strings, so per-character indexing stays
    // consistent.
    reference = normalizeText(reference);

    // Convert German characters in user text
    const convertedUserText = GermanChars.convert(normalizeText(userText));
    
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
    
// SYNC-BLOCK-START engine-dp
/**
     * Sequence alignment with gaps, lexicographic objective.
     *
     * Three tiers decide each DP cell, compared in order:
     *   cost - the ORIGINAL integer edit cost (MATCH 0 / SUB 3 / INS 2 /
     *          DEL 2). This tier alone decides which alignments are optimal,
     *          exactly as before word similarity existed, so grading counts
     *          can never change (reference "die dir" vs typed "dir wir"
     *          keeps its exact match on "dir").
     *   sim  - total dissimilarity: a substitution adds its normalized char
     *          distance, an unpaired word (delete/insert) counts 1.0, a
     *          match 0. Decides BETWEEN equal-cost alignments: "Töre" pairs
     *          with "Tore" and the gap lands on "höher", never the reverse.
     *   pref - total shared onset of substituted pairs; more wins the last
     *          tie ("wegen" pairs with "weil", not "ein").
     * Remaining full ties resolve diagonal > delete > insert, matching the
     * old backtracker's preference.
     *
     * Backpointers are recorded during the fill; the backtracker follows
     * them and recomputes nothing. The sim tier compares float sums inside
     * an epsilon band: two mathematically equal totals can accumulate
     * ~1e-13 of float dust in different path orders, which an exact ===
     * would read as a difference and silently skip the prefix tier, while
     * genuinely different totals differ by at least 1/(40*40) ~ 6e-4.
     */
    static alignSequencesWithGaps(refWords, userWords) {
        const N = refWords.length;
        const M = userWords.length;
        const COST = CONFIG.alignmentCosts;
        const W = M + 1;
        const size = (N + 1) * W;

        // Sim-tie tolerance: far above accumulated float dust (~1e-13),
        // far below the smallest genuine sim difference (~6e-4).
        const SIM_EPS = 1e-9;

        const cost = new Int32Array(size);
        const sim = new Float64Array(size);
        const pref = new Int32Array(size);
        // 1 = diagonal (match/substitute), 2 = up (delete), 3 = left (insert)
        const dir = new Uint8Array(size);

        for (let i = 1; i <= N; i++) {
            cost[i * W] = i * COST.DEL;
            sim[i * W] = i;
            dir[i * W] = 2;
        }
        for (let j = 1; j <= M; j++) {
            cost[j] = j * COST.INS;
            sim[j] = j;
            dir[j] = 3;
        }

        for (let i = 1; i <= N; i++) {
            const ref = refWords[i - 1];
            for (let j = 1; j <= M; j++) {
                const user = userWords[j - 1];
                const here = i * W + j;
                const diag = here - W - 1;
                const up = here - W;
                const left = here - 1;

                const eq = wordsMatch(ref, user);
                let bCost = cost[diag] + (eq ? COST.MATCH : COST.SUB);
                let bSim = sim[diag] + (eq ? 0 : simNorm(ref, user));
                let bPref = pref[diag] + (eq ? 0 : sharedPrefix(ref, user));
                let bDir = 1;

                const dCost = cost[up] + COST.DEL;
                const dSim = sim[up] + 1;
                if (dCost < bCost || (dCost === bCost && (dSim < bSim - SIM_EPS ||
                        (dSim <= bSim + SIM_EPS && pref[up] > bPref)))) {
                    bCost = dCost; bSim = dSim; bPref = pref[up]; bDir = 2;
                }

                const iCost = cost[left] + COST.INS;
                const iSim = sim[left] + 1;
                if (iCost < bCost || (iCost === bCost && (iSim < bSim - SIM_EPS ||
                        (iSim <= bSim + SIM_EPS && pref[left] > bPref)))) {
                    bCost = iCost; bSim = iSim; bPref = pref[left]; bDir = 3;
                }

                cost[here] = bCost;
                sim[here] = bSim;
                pref[here] = bPref;
                dir[here] = bDir;
            }
        }

        return this.backtrackAlignment(dir, W, refWords, userWords);
    }

    /**
     * Walk the recorded backpointers from (N, M) to (0, 0).
     */
    static backtrackAlignment(dir, W, refWords, userWords) {
        let i = refWords.length;
        let j = userWords.length;
        const alignment = [];

        while (i > 0 || j > 0) {
            const d = dir[i * W + j];
            if (d === 1) {
                alignment.unshift({
                    type: wordsMatch(refWords[i - 1], userWords[j - 1]) ? 'match' : 'substitute',
                    refWord: refWords[i - 1],
                    userWord: userWords[j - 1]
                });
                i--; j--;
            } else if (d === 2) {
                alignment.unshift({ type: 'delete', refWord: refWords[i - 1], userWord: null });
                i--;
            } else if (d === 3) {
                alignment.unshift({ type: 'insert', refWord: null, userWord: userWords[j - 1] });
                j--;
            } else {
                // Unreachable while the fill above stamps every cell; kept so
                // a future bug degrades to a complete (if blunt) alignment
                // instead of freezing the tab in this loop.
                console.error('[dictation] corrupt backpointer', { i, j });
                while (j > 0) alignment.unshift({ type: 'insert', refWord: null, userWord: userWords[--j] });
                while (i > 0) alignment.unshift({ type: 'delete', refWord: refWords[--i], userWord: null });
                break;
            }
        }

        return alignment;
    }
// SYNC-BLOCK-END engine-dp
    
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
