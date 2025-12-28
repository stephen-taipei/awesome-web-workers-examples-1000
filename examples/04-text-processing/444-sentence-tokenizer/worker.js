const abbreviations = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd', 'co', 'corp', 'st', 'ave', 'blvd', 'rd', 'no', 'vol', 'dept', 'govt', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'u.s', 'd.c', 'a.m', 'p.m']);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'TOKENIZE') tokenize(payload.text);
};

function tokenize(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Tokenizing...' } });

    const sentences = [];
    let current = '';
    let i = 0;

    while (i < text.length) {
        const char = text[i];
        current += char;

        if ('.!?'.includes(char)) {
            // Check if this is end of sentence
            const nextChar = text[i + 1];
            const prevWord = current.trim().split(/\s+/).pop().toLowerCase().replace(/[.!?]+$/, '');

            // Check for abbreviation
            if (char === '.' && abbreviations.has(prevWord)) {
                i++;
                continue;
            }

            // Check for quotes or end of text
            if (!nextChar || nextChar === ' ' || nextChar === '"' || nextChar === '\n') {
                // Include closing quote if present
                if (nextChar === '"') {
                    current += nextChar;
                    i++;
                }

                const sentence = current.trim();
                if (sentence) {
                    sentences.push(sentence);
                }
                current = '';
            }
        }

        i++;
    }

    // Add remaining text as last sentence
    if (current.trim()) {
        sentences.push(current.trim());
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            sentences,
            duration: performance.now() - startTime
        }
    });
}
