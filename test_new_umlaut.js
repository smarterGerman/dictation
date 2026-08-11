import { CONFIG } from './js/config.js';

function testConversion(text) {
    let result = text;
    CONFIG.germanChars.replacements.forEach(({ pattern, replacement }) => {
        result = result.replace(pattern, replacement);
    });
    return result;
}

const testCases = [
    ['zuerst', 'zuerst'],
    ['Maedchen', 'Maedchen'],
    ['gruen', 'gruen'],
    ['a/', 'ä'],
    ['o/', 'ö'],
    ['u/', 'ü'],
    ['s/', 'ß']
];

testCases.forEach(([input, expected]) => {
    const result = testConversion(input);
    if (result !== expected) {
        throw new Error(`Expected ${input} to become ${expected}, got ${result}`);
    }
});

console.log('German character conversion tests passed');
