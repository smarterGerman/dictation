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
