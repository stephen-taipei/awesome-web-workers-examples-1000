// Simple stopword list
const STOP_WORDS = new Set(["a", "about", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with"]);

self.onmessage = function(e) {
    const { text, count } = e.data;
    const startTime = performance.now();

    // TextRank-like approach (Simplified)
    // 1. Split sentences
    // 2. Compute similarity between sentences (based on common words)
    // 3. Score sentences
    // 4. Pick top N sentences

    // 1. Segmentation
    // Split by .!? followed by space or newline
    const rawSentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const sentences = rawSentences.map(s => s.trim()).filter(s => s.length > 0);

    if (sentences.length <= count) {
        self.postMessage({
            type: 'result',
            summary: sentences,
            time: performance.now() - startTime
        });
        return;
    }

    // 2. Preprocess sentences (tokenize, remove stop words)
    const processedSentences = sentences.map(s => {
        const words = s.toLowerCase().match(/\w+/g) || [];
        return new Set(words.filter(w => !STOP_WORDS.has(w)));
    });

    // 3. Build Similarity Matrix & Score
    // TextRank usually iterates graph PageRank.
    // Simplified: Score = sum of Jaccard similarity with all other sentences.
    // The most "central" sentences are the summary.

    const scores = new Array(sentences.length).fill(0);

    for (let i = 0; i < sentences.length; i++) {
        for (let j = i + 1; j < sentences.length; j++) {
            const setA = processedSentences[i];
            const setB = processedSentences[j];

            // Jaccard Similarity: |Intersection| / (|Union| + log(len)?)
            // Just intersection count for simplicity (or weighted)

            let intersection = 0;
            setA.forEach(w => {
                if (setB.has(w)) intersection++;
            });

            // Avoid division by zero
            if (setA.size === 0 || setB.size === 0) continue;

            // Normalized similarity
            const similarity = intersection / (Math.log(setA.size) + Math.log(setB.size));

            scores[i] += similarity;
            scores[j] += similarity;
        }
    }

    // 4. Sort and Pick
    // We want to keep original order in the summary?
    // Usually summaries read better if sentences are in original order.

    // Create objects with index
    const rankedSentences = sentences.map((s, i) => ({
        text: s,
        score: scores[i],
        index: i
    }));

    // Sort by score descending
    rankedSentences.sort((a, b) => b.score - a.score);

    // Pick top N
    const topSentences = rankedSentences.slice(0, count);

    // Sort back by index to preserve flow
    topSentences.sort((a, b) => a.index - b.index);

    const summary = topSentences.map(item => item.text);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        summary: summary,
        time: endTime - startTime
    });
};
