self.onmessage = function(e) {
    const { text1, text2, n } = e.data;
    const startTime = performance.now();

    // Generate Shingles (N-grams)
    const set1 = generateShingles(text1, n);
    const set2 = generateShingles(text2, n);

    // Calculate Jaccard Similarity of shingles
    const score = calculateJaccard(set1, set2);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        score: score,
        duration: endTime - startTime
    });
};

function generateShingles(text, n) {
    // Normalize: lowercase and remove punctuation
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    const shingles = new Set();
    if (tokens.length < n) return shingles;

    for (let i = 0; i <= tokens.length - n; i++) {
        // Create shingle by joining n tokens
        const shingle = tokens.slice(i, i + n).join(' ');

        // Hash the shingle (optional, but good for memory efficiency with large docs)
        // Here we just use the string itself for simplicity and perfect accuracy
        shingles.add(shingle);
    }
    return shingles;
}

function calculateJaccard(set1, set2) {
    if (set1.size === 0 || set2.size === 0) return 0;

    let intersection = 0;
    for (const item of set1) {
        if (set2.has(item)) intersection++;
    }

    const union = set1.size + set2.size - intersection;
    return intersection / union;
}
