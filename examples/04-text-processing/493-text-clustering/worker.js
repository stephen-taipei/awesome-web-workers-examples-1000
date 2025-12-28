// Stopwords to filter out
const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same'
]);

// Tokenize and clean text
function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
}

// Build vocabulary from all documents
function buildVocabulary(documents) {
    const vocab = new Map();
    let index = 0;

    documents.forEach(doc => {
        const tokens = tokenize(doc);
        tokens.forEach(token => {
            if (!vocab.has(token)) {
                vocab.set(token, index++);
            }
        });
    });

    return vocab;
}

// Calculate TF-IDF vectors
function calculateTfIdf(documents, vocab) {
    const numDocs = documents.length;
    const vocabSize = vocab.size;

    // Document frequency for each term
    const df = new Map();
    const tokenizedDocs = documents.map(doc => tokenize(doc));

    tokenizedDocs.forEach(tokens => {
        const seen = new Set();
        tokens.forEach(token => {
            if (!seen.has(token)) {
                df.set(token, (df.get(token) || 0) + 1);
                seen.add(token);
            }
        });
    });

    // Calculate TF-IDF vectors
    return tokenizedDocs.map(tokens => {
        const vector = new Float32Array(vocabSize);
        const tf = new Map();

        tokens.forEach(token => {
            tf.set(token, (tf.get(token) || 0) + 1);
        });

        tf.forEach((count, token) => {
            const termFreq = count / tokens.length;
            const invDocFreq = Math.log(numDocs / (df.get(token) || 1));
            const idx = vocab.get(token);
            if (idx !== undefined) {
                vector[idx] = termFreq * invDocFreq;
            }
        });

        return vector;
    });
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA && normB ? dotProduct / (normA * normB) : 0;
}

// K-Means clustering
function kMeans(vectors, k, maxIterations, progressCallback) {
    const n = vectors.length;
    const dim = vectors[0].length;

    // Initialize centroids randomly
    const centroids = [];
    const usedIndices = new Set();

    while (centroids.length < k) {
        const idx = Math.floor(Math.random() * n);
        if (!usedIndices.has(idx)) {
            centroids.push(new Float32Array(vectors[idx]));
            usedIndices.add(idx);
        }
    }

    let assignments = new Array(n).fill(0);
    let iterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
        iterations = iter + 1;
        let changed = false;

        // Assign each vector to nearest centroid
        for (let i = 0; i < n; i++) {
            let bestCluster = 0;
            let bestSim = -1;

            for (let j = 0; j < k; j++) {
                const sim = cosineSimilarity(vectors[i], centroids[j]);
                if (sim > bestSim) {
                    bestSim = sim;
                    bestCluster = j;
                }
            }

            if (assignments[i] !== bestCluster) {
                assignments[i] = bestCluster;
                changed = true;
            }
        }

        // Update centroids
        for (let j = 0; j < k; j++) {
            const clusterVectors = vectors.filter((_, i) => assignments[i] === j);

            if (clusterVectors.length > 0) {
                centroids[j] = new Float32Array(dim);
                clusterVectors.forEach(v => {
                    for (let d = 0; d < dim; d++) {
                        centroids[j][d] += v[d];
                    }
                });
                for (let d = 0; d < dim; d++) {
                    centroids[j][d] /= clusterVectors.length;
                }
            }
        }

        progressCallback(iter / maxIterations, `Iteration ${iter + 1}/${maxIterations}`);

        if (!changed) break;
    }

    return { assignments, iterations };
}

// Extract top keywords for a cluster
function getTopKeywords(documents, vocab, count = 5) {
    const wordFreq = new Map();

    documents.forEach(doc => {
        const tokens = tokenize(doc);
        tokens.forEach(token => {
            wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
        });
    });

    return Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([word]) => word);
}

self.onmessage = function(e) {
    const { type, texts, k, maxIterations } = e.data;

    if (type === 'cluster') {
        const startTime = performance.now();

        // Build vocabulary and TF-IDF vectors
        self.postMessage({
            type: 'progress',
            data: { progress: 0.1, message: 'Building vocabulary...' }
        });

        const vocab = buildVocabulary(texts);

        self.postMessage({
            type: 'progress',
            data: { progress: 0.2, message: 'Calculating TF-IDF...' }
        });

        const vectors = calculateTfIdf(texts, vocab);

        // Run K-Means
        const { assignments, iterations } = kMeans(vectors, k, maxIterations, (progress, message) => {
            self.postMessage({
                type: 'progress',
                data: { progress: 0.2 + progress * 0.7, message }
            });
        });

        // Group documents by cluster
        const clusters = [];
        for (let i = 0; i < k; i++) {
            const clusterDocs = texts.filter((_, idx) => assignments[idx] === i);
            clusters.push({
                documents: clusterDocs,
                keywords: getTopKeywords(clusterDocs, vocab)
            });
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                clusters: clusters,
                docCount: texts.length,
                k: k,
                iterations: iterations,
                time: endTime - startTime
            }
        });
    }
};
