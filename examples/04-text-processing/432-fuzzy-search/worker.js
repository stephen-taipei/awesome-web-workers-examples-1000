self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SEARCH') fuzzySearch(payload.text, payload.query);
};

function fuzzySearch(text, query) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Searching...' } });

    const words = text.split('\n').map(w => w.trim()).filter(w => w);
    const queryLower = query.toLowerCase();

    const results = words.map(word => {
        const score = calculateFuzzyScore(word.toLowerCase(), queryLower);
        return { word, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

    self.postMessage({
        type: 'RESULT',
        payload: {
            results: results.slice(0, 10),
            duration: performance.now() - startTime,
            stats: { count: results.length }
        }
    });
}

function calculateFuzzyScore(word, query) {
    if (word === query) return 1;
    if (word.includes(query)) return 0.9;
    if (word.startsWith(query)) return 0.85;

    // Check for subsequence match
    let queryIdx = 0;
    let matched = 0;
    let consecutiveBonus = 0;
    let lastMatchIdx = -2;

    for (let i = 0; i < word.length && queryIdx < query.length; i++) {
        if (word[i] === query[queryIdx]) {
            matched++;
            if (i === lastMatchIdx + 1) consecutiveBonus += 0.1;
            lastMatchIdx = i;
            queryIdx++;
        }
    }

    if (queryIdx < query.length) return 0; // Not all characters matched

    const matchRatio = matched / query.length;
    const lengthPenalty = 1 - (word.length - query.length) / word.length * 0.3;

    return (matchRatio * 0.5 + consecutiveBonus + lengthPenalty * 0.2);
}
