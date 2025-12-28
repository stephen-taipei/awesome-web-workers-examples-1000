// Stopwords to filter out
const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'it', 'its',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'
]);

function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopwords.has(w));
}

self.onmessage = function(e) {
    const { type, text, windowSize, minFreq, topWords } = e.data;

    if (type === 'analyze') {
        const startTime = performance.now();

        // Tokenize text
        const tokens = tokenize(text);

        // Count word frequencies
        const wordFreq = new Map();
        tokens.forEach(token => {
            wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
        });

        self.postMessage({
            type: 'progress',
            data: { progress: 0.2 }
        });

        // Filter by minimum frequency
        const filteredWords = Array.from(wordFreq.entries())
            .filter(([_, count]) => count >= minFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topWords)
            .map(([word]) => word);

        const wordSet = new Set(filteredWords);
        const wordIndex = new Map(filteredWords.map((w, i) => [w, i]));

        // Build co-occurrence matrix
        const n = filteredWords.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
        const pairCounts = new Map();

        for (let i = 0; i < tokens.length; i++) {
            const word1 = tokens[i];
            if (!wordSet.has(word1)) continue;

            for (let j = i + 1; j < Math.min(i + windowSize, tokens.length); j++) {
                const word2 = tokens[j];
                if (!wordSet.has(word2) || word1 === word2) continue;

                const idx1 = wordIndex.get(word1);
                const idx2 = wordIndex.get(word2);

                matrix[idx1][idx2]++;
                matrix[idx2][idx1]++;

                // Track pair counts
                const pairKey = [word1, word2].sort().join('|');
                pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
            }

            if (i % 100 === 0) {
                self.postMessage({
                    type: 'progress',
                    data: { progress: 0.2 + (i / tokens.length) * 0.7 }
                });
            }
        }

        // Get top pairs
        const topPairs = Array.from(pairCounts.entries())
            .map(([key, count]) => {
                const [word1, word2] = key.split('|');
                return { word1, word2, count };
            })
            .sort((a, b) => b.count - a.count);

        // Find max count for normalization
        let maxCount = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (matrix[i][j] > maxCount) maxCount = matrix[i][j];
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                words: filteredWords,
                matrix: matrix,
                maxCount: maxCount,
                topPairs: topPairs,
                uniqueWords: filteredWords.length,
                totalPairs: pairCounts.size,
                time: endTime - startTime
            }
        });
    }
};
