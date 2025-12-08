// Worker Thread

self.onmessage = function(e) {
    const text = e.data.text;

    // Count words
    // Basic splitting by regex for whitespace
    const words = text.toLowerCase().split(/\s+/);
    const counts = new Map();

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.length > 0) {
            counts.set(word, (counts.get(word) || 0) + 1);
        }
    }

    // Send back result
    // Structured Clone Algorithm supports Map
    self.postMessage({ type: 'result', data: counts });
};
