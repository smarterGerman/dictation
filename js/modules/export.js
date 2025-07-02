/**
 * CSV Export functionality
 */
import { TimeHelpers } from '../utils/time-helpers.js';

export class Exporter {
    constructor() {
        this.exportBtn = null;
    }
    
    /**
     * Initialize export button
     */
    initialize() {
        this.exportBtn = document.getElementById('exportCsvBtn');
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => {
                this.exportSessionResults();
            });
        } else {
        }
    }
    
    /**
     * Export session results to CSV
     */
    exportSessionResults(sessionResults = [], lessonId = 'Unknown', totalSessionTime = 0) {
        
        if (sessionResults.length === 0) {
            alert('No results to export. Please complete some sentences first.');
            return false;
        }
        
        try {
            const csvContent = this.generateCSVContent(sessionResults, lessonId, totalSessionTime);
            const filename = `${lessonId}-results.csv`;
            
            this.downloadCSV(csvContent, filename);
            
            return true;
        } catch (error) {
            console.error('Error during CSV export:', error);
            alert('Error exporting CSV file: ' + error.message);
            return false;
        }
    }
    
    /**
     * Generate CSV content from session results
     */
    generateCSVContent(sessionResults, lessonId, totalSessionTime) {
        // Calculate overall statistics
        const stats = this.calculateOverallStats(sessionResults);
        
        // Create summary row
        let csvContent = 'Lesson,Accuracy,Correct Words,Wrong Words,Total Words,Time Taken\n';
        csvContent += `${lessonId},${stats.accuracy},${stats.totalCorrectWords},${stats.totalWrongWords},${stats.totalWords},${TimeHelpers.formatTime(totalSessionTime)}`;
        
        return csvContent;
    }
    
    /**
     * Generate detailed CSV content with sentence-by-sentence results
     */
    generateDetailedCSVContent(sessionResults, lessonId, totalSessionTime) {
        const stats = this.calculateOverallStats(sessionResults);
        
        // Header with summary
        let csvContent = 'Summary\n';
        csvContent += 'Lesson,Accuracy,Correct Words,Wrong Words,Total Words,Time Taken\n';
        csvContent += `${lessonId},${stats.accuracy},${stats.totalCorrectWords},${stats.totalWrongWords},${stats.totalWords},${TimeHelpers.formatTime(totalSessionTime)}\n\n`;
        
        // Detailed sentence results
        csvContent += 'Sentence Details\n';
        csvContent += 'Sentence #,Reference Text,User Input,Correct Words,Wrong Words,Total Words,Accuracy,Time (seconds)\n';
        
        sessionResults.forEach((result, index) => {
            const sentenceAccuracy = result.stats.totalWords > 0 
                ? Math.round((result.stats.correctWords / result.stats.totalWords) * 100) 
                : 0;
            
            // Escape CSV special characters
            const reference = this.escapeCSVField(result.reference);
            const userInput = this.escapeCSVField(result.userInput);
            
            csvContent += `${index + 1},${reference},${userInput},${result.stats.correctWords},${result.stats.wrongWords},${result.stats.totalWords},${sentenceAccuracy}%,${result.time.toFixed(2)}\n`;
        });
        
        return csvContent;
    }
    
    /**
     * Calculate overall statistics from session results
     */
    calculateOverallStats(sessionResults) {
        let totalCorrectWords = 0;
        let totalWrongWords = 0;
        let totalWords = 0;
        
        sessionResults.forEach(result => {
            totalCorrectWords += result.stats.correctWords;
            totalWrongWords += result.stats.wrongWords;
            totalWords += result.stats.totalWords;
        });
        
        const accuracy = totalWords > 0 ? Math.round((totalCorrectWords / totalWords) * 100) : 0;
        
        return {
            totalCorrectWords,
            totalWrongWords,
            totalWords,
            accuracy
        };
    }
    
    /**
     * Escape CSV field (handle quotes and commas)
     */
    escapeCSVField(field) {
        if (typeof field !== 'string') {
            field = String(field);
        }
        
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }
        
        return field;
    }
    
    /**
     * Download CSV file
     */
    downloadCSV(csvContent, filename) {
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            throw new Error(`Failed to download CSV: ${error.message}`);
        }
    }
    
    /**
     * Export with custom format
     */
    exportCustomFormat(sessionResults, lessonId, totalSessionTime, options = {}) {
        const {
            format = 'summary', // 'summary' or 'detailed'
            includeTimestamps = false,
            includeUserInputs = true,
            customFilename = null
        } = options;
        
        let csvContent;
        
        if (format === 'detailed') {
            csvContent = this.generateDetailedCSVContent(sessionResults, lessonId, totalSessionTime);
        } else {
            csvContent = this.generateCSVContent(sessionResults, lessonId, totalSessionTime);
        }
        
        // Add timestamps if requested
        if (includeTimestamps) {
            csvContent = `Exported on: ${new Date().toISOString()}\n\n${csvContent}`;
        }
        
        const filename = customFilename || `${lessonId}-results-${format}.csv`;
        
        return this.downloadCSV(csvContent, filename);
    }
    
    /**
     * Export JSON format (alternative to CSV)
     */
    exportJSON(sessionResults, lessonId, totalSessionTime, filename = null) {
        try {
            const data = {
                lesson: lessonId,
                exportedAt: new Date().toISOString(),
                summary: this.calculateOverallStats(sessionResults),
                totalSessionTime,
                results: sessionResults
            };
            
            const jsonContent = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename || `${lessonId}-results.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error exporting JSON:', error);
            alert('Error exporting JSON file: ' + error.message);
            return false;
        }
    }
    
    /**
     * Check if browser supports file download
     */
    isDownloadSupported() {
        return typeof document.createElement('a').download !== 'undefined';
    }
    
    /**
     * Get export button reference
     */
    getExportButton() {
        return this.exportBtn;
    }
    
    /**
     * Set export button reference
     */
    setExportButton(button) {
        this.exportBtn = button;
    }
}
