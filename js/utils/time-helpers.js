/**
 * Time formatting and manipulation utilities
 */
export class TimeHelpers {
    /**
     * Format seconds to MM:SS format
     */
    static formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) {
            return '0:00';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Parse VTT time string to seconds
     * Handles both mm:ss.mmm and hh:mm:ss.mmm formats
     */
    static parseTimeToSeconds(timeStr) {
        try {
            if (!timeStr || typeof timeStr !== 'string') {
                return 0;
            }
            
            // Handle both mm:ss.mmm and hh:mm:ss.mmm formats
            const parts = timeStr.trim().split(':');
            const seconds = parts[parts.length - 1].split(/[.,]/); // Handle both . and , as decimal separator
            const sec = parseInt(seconds[0]) || 0;
            const ms = parseInt(seconds[1] || 0);
            
            if (parts.length === 3) {
                // hh:mm:ss.mmm format
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                return hours * 3600 + minutes * 60 + sec + ms / 1000;
            } else if (parts.length === 2) {
                // mm:ss.mmm format
                const minutes = parseInt(parts[0]) || 0;
                return minutes * 60 + sec + ms / 1000;
            } else {
                // ss.mmm format
                return sec + ms / 1000;
            }
        } catch (error) {
            console.error('Error parsing time:', timeStr, error);
            return 0;
        }
    }
    
    /**
     * Convert seconds to time string for VTT format
     */
    static secondsToTimeString(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
        }
    }
    
    /**
     * Get current timestamp in milliseconds
     */
    static now() {
        return Date.now();
    }
    
    /**
     * Calculate elapsed time between two timestamps
     */
    static elapsed(startTime, endTime = null) {
        const end = endTime || Date.now();
        return Math.max(0, end - startTime);
    }
    
    /**
     * Convert milliseconds to seconds
     */
    static msToSeconds(ms) {
        return ms / 1000;
    }
    
    /**
     * Convert seconds to milliseconds
     */
    static secondsToMs(seconds) {
        return seconds * 1000;
    }
    
    /**
     * Throttle function calls
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Debounce function calls
     */
    static debounce(func, delay) {
        let timeoutId;
        return function() {
            const args = arguments;
            const context = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    /**
     * Create a delay/timeout promise
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
