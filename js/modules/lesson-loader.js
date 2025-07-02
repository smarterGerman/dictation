/**
 * Lesson loading and VTT parsing functionality
 */
import { CONFIG } from '../config.js';
import { TimeHelpers } from '../utils/time-helpers.js';

export class LessonLoader {
    constructor() {
        this.allLessons = {};
        this.vttCues = [];
        this.isLoading = false;
    }
    
    /**
     * Load all lessons from the remote JSON file
     */
    async loadAllLessons() {
        if (this.isLoading) {
            console.warn('Lessons are already being loaded');
            return this.allLessons;
        }
        
        this.isLoading = true;
        
        try {
            const response = await fetch(CONFIG.lessonsUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load lessons: ${response.status} ${response.statusText}`);
            }
            
            this.allLessons = await response.json();
            
            return this.allLessons;
        } catch (error) {
            console.error('Failed to load lessons:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Get lesson data by ID
     */
    getLessonData(lessonId) {
        if (!this.allLessons[lessonId]) {
            throw new Error(`Lesson ${lessonId} not found`);
        }
        return this.allLessons[lessonId];
    }
    
    /**
     * Check if lessons are loaded
     */
    hasLessons() {
        return Object.keys(this.allLessons).length > 0;
    }
    
    /**
     * Get list of available lesson IDs
     */
    getAvailableLessons() {
        return Object.keys(this.allLessons);
    }
    
    /**
     * Load and parse VTT file from URL
     */
    async loadVTTFromUrl(vttUrl) {
        try {
            const response = await fetch(vttUrl);
            
            if (!response.ok) {
                throw new Error(`VTT file not found: ${response.status} ${response.statusText}`);
            }
            
            const vttText = await response.text();
            const cues = this.parseVTT(vttText);
            
            return cues;
        } catch (error) {
            console.error('Failed to load VTT file:', error);
            throw error;
        }
    }
    
    /**
     * Parse VTT content into cue objects
     */
    parseVTT(vttText) {
        if (!vttText || typeof vttText !== 'string') {
            console.error('Invalid VTT text provided');
            return [];
        }
        
        const lines = vttText.split('\n');
        const cues = [];
        let i = 0;
        
        // Skip headers and initial content
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.includes('-->')) {
                break;
            }
            // Skip WEBVTT headers, NOTE sections, STYLE sections
            if (line.startsWith('WEBVTT') || line.startsWith('NOTE') || line.startsWith('STYLE')) {
                i++;
                continue;
            }
            i++;
        }
        
        // Parse cues
        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (line.includes('-->')) {
                const cue = this.parseCueLine(line, lines, i);
                if (cue) {
                    cues.push(cue);
                }
            }
            i++;
        }
        
        return cues;
    }
    
    /**
     * Parse a single VTT cue line
     */
    parseCueLine(line, allLines, lineIndex) {
        try {
            const timeParts = line.split('-->');
            if (timeParts.length < 2) {
                console.warn('Invalid cue line format:', line);
                return null;
            }
            
            const startTime = timeParts[0].trim();
            const endTime = timeParts[1].trim().split(' ')[0]; // Remove any positioning info
            
            const startSeconds = TimeHelpers.parseTimeToSeconds(startTime);
            const endSeconds = TimeHelpers.parseTimeToSeconds(endTime);
            
            // Validate times
            if (isNaN(startSeconds) || isNaN(endSeconds)) {
                console.warn('Invalid time format in cue:', line);
                return null;
            }
            
            if (startSeconds >= endSeconds) {
                console.warn('Invalid time range in cue:', line);
                return null;
            }
            
            // Collect text lines for this cue
            const textLines = [];
            let textLineIndex = lineIndex + 1;
            
            while (textLineIndex < allLines.length) {
                const textLine = allLines[textLineIndex].trim();
                
                // Stop at empty line or next cue
                if (textLine === '' || textLine.includes('-->')) {
                    break;
                }
                
                // Skip cue IDs (lines that are just numbers or simple identifiers)
                if (!/^\d+$/.test(textLine) && !textLine.startsWith('NOTE')) {
                    textLines.push(textLine);
                }
                
                textLineIndex++;
            }
            
            if (textLines.length === 0) {
                console.warn('No text found for cue:', line);
                return null;
            }
            
            // Join text lines and clean up
            const text = textLines.join(' ').trim();
            const cleanText = this.cleanVTTText(text);
            
            if (!cleanText) {
                console.warn('Empty text after cleaning for cue:', line);
                return null;
            }
            
            return {
                start: startSeconds,
                end: endSeconds,
                text: cleanText
            };
        } catch (error) {
            console.error('Error parsing cue line:', line, error);
            return null;
        }
    }
    
    /**
     * Clean VTT text by removing formatting tags and entities
     */
    cleanVTTText(text) {
        return text
            // Remove VTT tags like <v Speaker>, <c.classname>, etc.
            .replace(/<[^>]*>/g, '')
            // Remove VTT positioning and styling
            .replace(/\{[^}]*\}/g, '')
            // Decode HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            // Clean up whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Validate VTT cues for consistency
     */
    validateCues(cues) {
        const issues = [];
        
        for (let i = 0; i < cues.length; i++) {
            const cue = cues[i];
            
            // Check for required properties
            if (typeof cue.start !== 'number' || typeof cue.end !== 'number' || !cue.text) {
                issues.push(`Cue ${i}: Missing required properties`);
                continue;
            }
            
            // Check time validity
            if (cue.start < 0 || cue.end < 0 || cue.start >= cue.end) {
                issues.push(`Cue ${i}: Invalid time range (${cue.start} - ${cue.end})`);
            }
            
            // Check for overlapping cues (if previous cue exists)
            if (i > 0 && cues[i - 1].end > cue.start) {
                issues.push(`Cue ${i}: Overlaps with previous cue`);
            }
            
            // Check for empty text
            if (!cue.text.trim()) {
                issues.push(`Cue ${i}: Empty text content`);
            }
        }
        
        if (issues.length > 0) {
            console.warn('VTT validation issues found:', issues);
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }
    
    /**
     * Get cue at specific time
     */
    getCueAtTime(time) {
        return this.vttCues.find(cue => time >= cue.start && time <= cue.end);
    }
    
    /**
     * Get cue by index
     */
    getCueByIndex(index) {
        return this.vttCues[index] || null;
    }
    
    /**
     * Get total number of cues
     */
    getCueCount() {
        return this.vttCues.length;
    }
    
    /**
     * Set current VTT cues
     */
    setVTTCues(cues) {
        this.vttCues = cues || [];
        return this.vttCues.length;
    }
    
    /**
     * Clear all loaded data
     */
    clear() {
        this.allLessons = {};
        this.vttCues = [];
        this.isLoading = false;
    }
}
