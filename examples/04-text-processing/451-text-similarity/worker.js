self.onmessage = function(e) {
    const { text1, text2 } = e.data;
    const startTime = performance.now();

    // Tokenization (simple split)
    const tokens1 = tokenize(text1);
    const tokens2 = tokenize(text2);

    // Jaccard Similarity
    const jaccard = calculateJaccard(tokens1, tokens2);

    // Cosine Similarity
    const cosine = calculateCosine(tokens1, tokens2);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        jaccard: jaccard,
        cosine: cosine,
        duration: endTime - startTime
    });
};

function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 0);
}

function calculateJaccard(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

function calculateCosine(tokens1, tokens2) {
    // Build term frequency map
    const tf1 = {};
    const tf2 = {};
    const vocabulary = new Set();

    for (const token of tokens1) {
        tf1[token] = (tf1[token] || 0) + 1;
        vocabulary.add(token);
    }

    for (const token of tokens2) {
        tf2[token] = (tf2[token] || 0) + 1;
        vocabulary.add(token);
    }

    // Create vectors
    const vector1 = [];
    const vector2 = [];
    const vocabArray = Array.from(vocabulary);

    for (const term of vocabArray) {
        vector1.push(tf1[term] || 0);
        vector2.push(tf2[term] || 0);
    }

    // Dot product
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vector1.length; i++) {
        dotProduct += vector1[i] * vector2[i];
        mag1 += vector1[i] * vector1[i];
        mag2 += vector2[i] * vector2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
}
