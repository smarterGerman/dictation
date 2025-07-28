/**
 * Configuration constants for the German Dictation Tool
 */
export const CONFIG = {
    // External URLs
    lessonsUrl: 'https://raw.githubusercontent.com/smarterGerman/dictation/main/lessons/lessons.json',
    
    // Timing constants
    autoResizeDelay: 50,
    hintAutoHideDelay: 8000,
    heightReportThrottle: 100,
    backupPollingInterval: 5000,
    
    // UI constants
    initialPlaceholderText: "Shift+Cmd+Enter = Play/Pause\nae = ä | oe = ö | ue = ü | B = ß\nType here...",
    laterPlaceholderText: "Type what you hear...",
    liveFeedbackDefault: 'Live Feedback',
    
    // Speed settings
    speeds: [1.0, 0.75, 0.5],
    speedLabels: ['100', '75', '50'],
    speedClasses: ['speed-100', 'speed-75', 'speed-50'],
    
    // Cost settings for text alignment algorithm
    alignmentCosts: {
        MATCH: 0,
        SUB: 3,
        INS: 2,
        DEL: 2
    },
    
    // Character sets for German text processing
    germanChars: {
        punctuation: /[.,!?;:()]/,
        vowels: /[aeiouäöü]/,
        replacements: [
            // Convert ae/oe/ue to umlauts with strict vowel/consonant rules
            // Negative lookbehind ensures no conversion after vowels (including umlauts)
            
            // Lowercase patterns
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])ue/g, replacement: 'ü' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])ae/g, replacement: 'ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])oe/g, replacement: 'ö' },
            
            // Uppercase patterns - first letter capitalized (Tuer -> Tür)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])Ue/g, replacement: 'Ü' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])Ae/g, replacement: 'Ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])Oe/g, replacement: 'Ö' },
            
            // Mixed case patterns (Tuer -> Tür, Fuehren -> Führen)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])ue/g, replacement: '$1ü' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])ae/g, replacement: '$1ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])oe/g, replacement: '$1ö' },
            
            // Mixed case patterns with lowercase consonant (bAe -> bÄ, etc.)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])UE/g, replacement: '$1Ü' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])AE/g, replacement: '$1Ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])OE/g, replacement: '$1Ö' },
            
            // Handle mixed capitalization typos - preserve original case of first letter
            // When first letter is uppercase (Ueberfahr -> Überfahrt)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])Ae/g, replacement: '$1Ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])Oe/g, replacement: '$1Ö' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])Ue/g, replacement: '$1Ü' },
            
            // When first letter is lowercase (fUehren -> führen) 
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])Ae/g, replacement: '$1ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])Oe/g, replacement: '$1ö' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])Ue/g, replacement: '$1ü' },
            
            // Mixed case with lowercase consonant + mixed vowels (tuEr -> tür, hoEren -> hören)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])aE/g, replacement: '$1ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])oE/g, replacement: '$1ö' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[bcdfghjklmnpqrstvwxyz])uE/g, replacement: '$1ü' },
            
            // Mixed case with uppercase consonant + mixed vowels (TuEr -> Tür, HoEren -> Hören)
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])aE/g, replacement: '$1ä' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])oE/g, replacement: '$1ö' },
            { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])(\b|[BCDFGHJKLMNPQRSTVWXYZ])uE/g, replacement: '$1ü' },
            
            // ß conversion patterns (unchanged)
            { pattern: /\B([aeiouäöü])B/g, replacement: '$1ß' },
            { pattern: /([aeiouäöü])B([aeiouäöü])/g, replacement: '$1ß$2' },
            { pattern: /([aeiouäöü])B$/g, replacement: '$1ß' },
            { pattern: /([aeiouäöü])B(\s)/g, replacement: '$1ß$2' },
            
            // Additional patterns for handling slashed vowels and sharp s
            { pattern: /a\//g, replacement: 'ä' },
            { pattern: /o\//g, replacement: 'ö' },
            { pattern: /u\//g, replacement: 'ü' },
            { pattern: /s\//g, replacement: 'ß' },
            { pattern: /e\//g, replacement: 'é' },

            // Fix the exception
            { pattern: /(?<!\w)tü(?!\w)/g, replacement: 'tue' },
            { pattern: /(?<!\w)Getü(?!\w)/g, replacement: 'Getue' },
            { pattern: /(?<!\w)getü(?!\w)/g, replacement: 'getue' },
            { pattern: /(?<!\w)beqü(?!\w)/g, replacement: 'bequem' },
            { pattern: /(?<!\w)Beqü(?!\w)/g, replacement: 'Bequem' },

        ]
    },
    
    // Default lesson
    defaultLesson: 'A1L01'
};
