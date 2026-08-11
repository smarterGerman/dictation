/**
 * Configuration constants for the German Dictation Tool
 */
export const CONFIG = {
    // External URLs
    lessonsUrl: 'https://smartergerman.github.io/dictation/lessons/lessons.json',
    
    // Timing constants
    autoResizeDelay: 50,
    hintAutoHideDelay: 8000,
    heightReportThrottle: 100,
    backupPollingInterval: 5000,
    
    // UI constants
    initialPlaceholderText: "Shift+Cmd+Enter = Play/Pause\na/ = ä | o/ = ö | u/ = ü | s/ = ß\nType here...",
    laterPlaceholderText: "Type what you hear...",
    liveFeedbackDefault: 'Live Feedback',
    
    // Speed settings
    speeds: [1.0, 0.75, 0.5],
    speedLabels: ['100', '75', '50'],
    speedClasses: ['speed-100', 'speed-75', 'speed-50'],
    
    // Cost settings for text alignment algorithm
    // The PRIMARY tier of the lexicographic alignment objective - plain
    // integer edit costs, identical to the original tool, so grading counts
    // never depend on word similarity. Similarity and shared-onset only
    // break ties between equal-cost alignments; both live next to the DP in
    // text-comparison.js. Frozen so the table cannot drift mid-session.
    // KEEP IN SYNC with the learn-app fork's config.
    // SYNC-BLOCK-START costs
    alignmentCosts: Object.freeze({
        MATCH: 0,
        SUB: 3,
        INS: 2,
        DEL: 2
    }),
    // SYNC-BLOCK-END costs
    
    // Character sets for German text processing
    germanChars: {
        punctuation: /[.,!?;:()]/,
        vowels: /[aeiouäöü]/,
        replacements: [
            // Slash shortcuts avoid changing valid German letter combinations.
            { pattern: /a\//g, replacement: 'ä' },
            { pattern: /o\//g, replacement: 'ö' },
            { pattern: /u\//g, replacement: 'ü' },
            { pattern: /s\//g, replacement: 'ß' },
            { pattern: /e\//g, replacement: 'é' }
        ]
    },
    
    // Default lesson
    defaultLesson: 'A1L01'
};
