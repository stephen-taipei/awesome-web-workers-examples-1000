// Stopwords
const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'it', 'its'
]);

function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopwords.has(w));
}

// Word vectors storage
let vectors = {};
let vocab = [];
let wordToIndex = {};
let dim = 50;

// Initialize random vector
function initVector(d) {
    const vec = new Float32Array(d);
    for (let i = 0; i < d; i++) {
        vec[i] = (Math.random() - 0.5) / d;
    }
    return vec;
}

// Cosine similarity
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return normA && normB ? dot / (normA * normB) : 0;
}

// Train word vectors using co-occurrence based approach
function trainVectors(text, dimensions, windowSize, minCount) {
    dim = dimensions;
    const tokens = tokenize(text);

    // Count word frequencies
    const wordFreq = new Map();
    tokens.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));

    // Build vocabulary
    vocab = Array.from(wordFreq.entries())
        .filter(([_, count]) => count >= minCount)
        .map(([word]) => word);

    wordToIndex = {};
    vocab.forEach((w, i) => wordToIndex[w] = i);

    self.postMessage({
        type: 'progress',
        data: { progress: 0.1, message: 'Building vocabulary...' }
    });

    // Initialize vectors
    vectors = {};
    vocab.forEach(w => {
        vectors[w] = initVector(dim);
    });

    // Context vectors (separate for training)
    const contextVectors = {};
    vocab.forEach(w => {
        contextVectors[w] = initVector(dim);
    });

    self.postMessage({
        type: 'progress',
        data: { progress: 0.2, message: 'Training vectors...' }
    });

    // Training using simplified skip-gram like updates
    const learningRate = 0.025;
    const iterations = 5;

    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < tokens.length; i++) {
            const word = tokens[i];
            if (!vectors[word]) continue;

            // Look at context words
            for (let j = Math.max(0, i - windowSize); j <= Math.min(tokens.length - 1, i + windowSize); j++) {
                if (i === j) continue;

                const contextWord = tokens[j];
                if (!vectors[contextWord]) continue;

                // Simple vector update based on co-occurrence
                const wordVec = vectors[word];
                const ctxVec = contextVectors[contextWord];

                // Update vectors to be more similar
                for (let d = 0; d < dim; d++) {
                    const grad = learningRate * (ctxVec[d] - wordVec[d]) * 0.1;
                    wordVec[d] += grad;
                    ctxVec[d] -= grad * 0.5;
                }
            }
        }

        self.postMessage({
            type: 'progress',
            data: {
                progress: 0.2 + ((iter + 1) / iterations) * 0.7,
                message: `Training iteration ${iter + 1}/${iterations}...`
            }
        });
    }

    // Combine word and context vectors
    vocab.forEach(w => {
        const wv = vectors[w];
        const cv = contextVectors[w];
        for (let d = 0; d < dim; d++) {
            wv[d] = (wv[d] + cv[d]) / 2;
        }
    });

    // Normalize vectors
    vocab.forEach(w => {
        const vec = vectors[w];
        let norm = 0;
        for (let d = 0; d < dim; d++) norm += vec[d] * vec[d];
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (let d = 0; d < dim; d++) vec[d] /= norm;
        }
    });

    return { vectors, vocab };
}

function findSimilar(word, topK) {
    if (!vectors[word]) {
        return { results: [], word, vector: null };
    }

    const targetVec = vectors[word];
    const similarities = [];

    vocab.forEach(w => {
        if (w === word) return;
        const sim = cosineSimilarity(targetVec, vectors[w]);
        similarities.push({ word: w, similarity: sim });
    });

    similarities.sort((a, b) => b.similarity - a.similarity);

    return {
        results: similarities.slice(0, topK),
        word,
        vector: Array.from(targetVec)
    };
}

self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'train') {
        const startTime = performance.now();
        const { text, dimensions, windowSize, minCount } = e.data;

        trainVectors(text, dimensions, windowSize, minCount);

        const endTime = performance.now();

        self.postMessage({
            type: 'trained',
            data: {
                vocabulary: vocab,
                dimensions: dim,
                time: endTime - startTime
            }
        });
    } else if (type === 'findSimilar') {
        const { word, topK } = e.data;
        const result = findSimilar(word, topK);

        self.postMessage({
            type: 'similar',
            data: result
        });
    }
};
