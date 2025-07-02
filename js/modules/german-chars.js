/**
 * German character conversion utilities
 */
import { CONFIG } from '../config.js';

export class GermanChars {
    /**
     * Convert German character combinations to proper umlauts and ß
     */
    static convert(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        let result = text;
        
        // Apply all replacement patterns from config
        CONFIG.germanChars.replacements.forEach(({ pattern, replacement }) => {
            result = result.replace(pattern, replacement);
        });
        
        return result;
    }
    
    /**
     * Check if character is a German vowel (including umlauts)
     */
    static isVowel(char) {
        return CONFIG.germanChars.vowels.test(char);
    }
    
    /**
     * Check if character is punctuation
     */
    static isPunctuation(char) {
        return CONFIG.germanChars.punctuation.test(char);
    }
    
    /**
     * Remove punctuation from text
     */
    static removePunctuation(text, punctuationPattern = null) {
        const pattern = punctuationPattern || CONFIG.germanChars.punctuation;
        return text.replace(pattern, '');
    }
    
    /**
     * Normalize text for comparison (remove extra spaces)
     */
    static normalizeSpaces(text) {
        return text.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * Convert text to lowercase if needed
     */
    static normalizeCase(text, ignoreCase = true) {
        return ignoreCase ? text.toLowerCase() : text;
    }
    
    /**
     * Full normalization for text comparison
     */
    static normalizeForComparison(text, options = {}) {
        const {
            ignorePunctuation = true,
            ignoreCase = true,
            convertGermanChars = true
        } = options;
        
        let normalized = text;
        
        // Convert German characters first
        if (convertGermanChars) {
            normalized = this.convert(normalized);
        }
        
        // Remove punctuation if requested
        if (ignorePunctuation) {
            normalized = this.removePunctuation(normalized);
        }
        
        // Normalize case if requested
        if (ignoreCase) {
            normalized = this.normalizeCase(normalized);
        }
        
        // Normalize spaces
        normalized = this.normalizeSpaces(normalized);
        
        return normalized;
    }
    
    /**
     * Split text into words, filtering empty ones
     */
    static splitIntoWords(text) {
        return text.split(/\s+/).filter(word => word.length > 0);
    }
    
    /**
     * Check if text contains German characters
     */
    static hasGermanChars(text) {
        return /[äöüßÄÖÜ]/.test(text);
    }
    
    /**
     * Get character mappings for display/help
     */
    static getCharacterMappings() {
        return [
            { input: 'ae', output: 'ä', description: 'ae → ä' },
            { input: 'oe', output: 'ö', description: 'oe → ö' },
            { input: 'ue', output: 'ü', description: 'ue → ü' },
            { input: 'Ae', output: 'Ä', description: 'Ae → Ä' },
            { input: 'Oe', output: 'Ö', description: 'Oe → Ö' },
            { input: 'Ue', output: 'Ü', description: 'Ue → Ü' },
            { input: 'B (after vowel)', output: 'ß', description: 'vowel + B → vowel + ß' }
        ];
    }
}
