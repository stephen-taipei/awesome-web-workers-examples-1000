self.onmessage = function(e) {
    const { text, n, type } = e.data;

    const startTime = performance.now();

    let grams = [];

    if (type === 'word') {
        // Tokenize words, removing punctuation
        const words = text.toLowerCase()
            .replace(/[^\w\s']/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0);

        for (let i = 0; i <= words.length - n; i++) {
            grams.push(words.slice(i, i + n).join(' '));
        }
    } else {
        // Character grams
        // Normalize spaces? Or keep exact? Usually keep exact or normalize newlines.
        const cleanText = text.replace(/\r\n/g, '\n');
        for (let i = 0; i <= cleanText.length - n; i++) {
            grams.push(cleanText.substring(i, i + n));
        }
    }

    // Count frequencies
    const counts = {};
    grams.forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
    });

    // Convert to array and sort
    const result = Object.entries(counts).map(([gram, count]) => ({ gram, count }));
    result.sort((a, b) => b.count - a.count);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            ngrams: result,
            time: endTime - startTime
        }
    });
};
