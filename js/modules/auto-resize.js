/**
 * Auto-resize module for iframe integration
 */
import { CONFIG } from '../config.js';
import { TimeHelpers } from '../utils/time-helpers.js';

export class AutoResize {
    constructor() {
        this.lastReportedHeight = 0;
        this.resizeTimeout = null;
        this.observer = null;
        this.initialized = false;
        
        // Throttled height sender
        this.sendHeightThrottled = TimeHelpers.throttle(
            this.sendHeightToParent.bind(this), 
            CONFIG.heightReportThrottle
        );
    }
    
    /**
     * Initialize auto-resize system
     */
    initialize() {
        if (this.initialized) {
            console.warn('AutoResize already initialized');
            return;
        }
        
        if (this.setupResizeObserver()) {
        } else {
            this.setupFallbackObserver();
        }
        
        // Initial height calculation
        this.sendHeightToParent();
        this.initialized = true;
    }
    
    /**
     * Setup modern ResizeObserver
     */
    setupResizeObserver() {
        if (!window.ResizeObserver) {
            return false;
        }
        
        this.observer = new ResizeObserver(entries => {
            this.sendHeightThrottled();
        });
        
        // Observe the main container for size changes
        const container = document.querySelector('.container');
        if (container) {
            this.observer.observe(container);
        }
        
        // Also observe document body for additional safety
        this.observer.observe(document.body);
        
        return true;
    }
    
    /**
     * Setup fallback observer for older browsers
     */
    setupFallbackObserver() {
        // Method 2: Fallback for older browsers
        const mutationObserver = new MutationObserver(() => {
            this.sendHeightThrottled();
        });
        
        // Watch for DOM changes that could affect height
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class'], // Only watch relevant attributes
        });
        
        // Additional fallback: Window resize events
        window.addEventListener('resize', this.sendHeightThrottled);
        
        // Backup polling for edge cases (very conservative)
        setInterval(() => {
            this.sendHeightToParent();
        }, CONFIG.backupPollingInterval);
        
        this.observer = mutationObserver;
    }
    
    /**
     * Send height to parent frame
     */
    sendHeightToParent() {
        // Clear any pending resize calls
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Use a small delay to ensure DOM is fully updated
        this.resizeTimeout = setTimeout(() => {
            const height = this.calculateHeight();
            
            // Only send if height actually changed (prevent spam)
            if (height !== this.lastReportedHeight) {
                this.lastReportedHeight = height;
                
                // Send message to parent frame
                if (window.parent && window.parent !== window) {
                    try {
                        window.parent.postMessage({
                            type: 'resize',
                            height: height
                        }, '*');
                    } catch (error) {
                        console.debug('Could not send height to parent:', error);
                    }
                }
            }
        }, CONFIG.autoResizeDelay);
    }
    
    /**
     * Calculate current document height
     */
    calculateHeight() {
        return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
    }
    
    /**
     * Manually trigger height recalculation
     */
    triggerResize() {
        this.sendHeightToParent();
    }
    
    /**
     * Cleanup observers
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }
        
        this.initialized = false;
    }
    
    /**
     * Static method for easy access
     */
    static create() {
        return new AutoResize();
    }
}
