// filepath: /Users/denkmuskel/dictation/regex_test.js
const words = [
    'zurueck',   // should become 'zurück'
    'bauer',     // should stay 'bauer'
    'gruen',     // should become 'grün'
    'tuer',      // should become 'tür'
    'queue',     // should stay 'queue'
    'fUehren',   // should become 'führen'
    'Ueber',     // should become 'Über'
    'AUER',      // should stay 'AUER'
    'ZURUECK',   // should become 'ZURÜCK'
];

const patterns = [
    { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])ue/g, replacement: 'ü' },
    { pattern: /(?<![aeiouäöüAEIOUÄÖÜ])Ue/g, replacement: 'Ü' },
    { pattern: /(?<![AEIOUÄÖÜ])UE/g, replacement: 'Ü' },
];

words.forEach(word => {
    let result = word;
    patterns.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    console.log(`${word} -> ${result}`);
});