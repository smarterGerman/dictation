// Test the new umlaut conversion case
import { CONFIG } from './js/config.js';

function testConversion(text) {
    let result = text;
    CONFIG.germanChars.replacements.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    return result;
}

console.log('Testing new umlaut cases:');

const testCases = [
    'tuEr',      // should become 'tür'
    'hoEren',    // should become 'hören'
    'schaEden',  // should become 'schäden'
    'mOegen',    // should become 'mögen'
    'gruEssen',  // should become 'grüssen'
    'TuEr',      // should become 'Tür'
    'HoEren',    // should become 'Hören'
];

testCases.forEach(test => {
    const result = testConversion(test);
    console.log(`${test} -> ${result}`);
});

console.log('\nVerifying existing patterns still work:');
const existingCases = [
    'tuer', 'Tuer', 'TUER', 'fUehren', 'Ueberfahr', 'zurueck'
];

existingCases.forEach(test => {
    const result = testConversion(test);
    console.log(`${test} -> ${result}`);
});

function testConversionDebug(text) {
    let result = text;
    CONFIG.germanChars.replacements.forEach(({ pattern, replacement }, idx) => {
        const before = result;
        result = result.replace(pattern, replacement);
        if (before !== result) {
            console.log(
                `Pattern #${idx}: ${pattern} | Replacement: ${replacement}\n  Before: ${before}\n  After:  ${result}\n`
            );
        }
    });
    return result;
}

console.log('\nDebugging zurueck:');
const debugWord = 'zurueck';
const debugResult = testConversionDebug(debugWord);
console.log(`Final result: ${debugWord} -> ${debugResult}`);
