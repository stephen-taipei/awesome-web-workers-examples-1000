self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'GENERATE') generate(payload.text, payload.n);
};

function generate(text, n) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Generating n-grams...' } });

    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const freq = {};

    for (let i = 0; i <= words.length - n; i++) {
        const gram = words.slice(i, i + n).join(' ');
        freq[gram] = (freq[gram] || 0) + 1;
    }

    const sorted = Object.entries(freq)
        .map(([gram, count]) => ({ gram, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

    self.postMessage({
        type: 'RESULT',
        payload: {
            ngrams: sorted,
            duration: performance.now() - startTime,
            stats: { count: Object.keys(freq).length }
        }
    });
}
