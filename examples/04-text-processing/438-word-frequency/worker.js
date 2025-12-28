self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ANALYZE') analyze(payload.text);
};

function analyze(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Counting words...' } });

    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const freq = {};

    for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
    }

    const sorted = Object.entries(freq)
        .map(([word, count]) => ({ word, count, percent: ((count / words.length) * 100).toFixed(1) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    self.postMessage({
        type: 'RESULT',
        payload: {
            frequencies: sorted,
            duration: performance.now() - startTime,
            stats: { total: words.length, unique: Object.keys(freq).length }
        }
    });
}
