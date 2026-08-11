// filepath: /Users/denkmuskel/dictation/regex_test.js
const words = [
    ['zuerst', 'zuerst'],
    ['bauer', 'bauer'],
    ['gruen', 'gruen'],
    ['tuer', 'tuer'],
    ['a/', 'ä'],
    ['o/', 'ö'],
    ['u/', 'ü'],
    ['s/', 'ß']
];

const patterns = [
    { pattern: /a\//g, replacement: 'ä' },
    { pattern: /o\//g, replacement: 'ö' },
    { pattern: /u\//g, replacement: 'ü' },
    { pattern: /s\//g, replacement: 'ß' }
];

words.forEach(([word, expected]) => {
    let result = word;
    patterns.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    console.log(`${word} -> ${result}`);
    if (result !== expected) {
        throw new Error(`Expected ${word} to become ${expected}, got ${result}`);
    }
});
