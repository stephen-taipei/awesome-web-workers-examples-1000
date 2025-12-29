const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'it', 'its', 'they', 'their', 'them', 'this', 'that', 'these', 'those', 'and', 'but', 'or', 'not', 'can']);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SUMMARIZE') summarize(payload.text, payload.numSentences);
};

function summarize(text, numSentences) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Analyzing...' } });

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length <= numSentences) {
        self.postMessage({
            type: 'RESULT',
            payload: { summary: text, duration: performance.now() - startTime, stats: { compression: 0 } }
        });
        return;
    }

    // Calculate word frequency
    const wordFreq = {};
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    for (const word of words) {
        if (!stopWords.has(word)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    }

    // Score sentences
    const sentenceScores = sentences.map((sentence, index) => {
        const sentenceWords = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
        let score = 0;
        for (const word of sentenceWords) {
            score += wordFreq[word] || 0;
        }
        // Normalize by sentence length and boost first sentences
        score = score / Math.max(1, sentenceWords.length);
        if (index === 0) score *= 1.5;
        return { sentence: sentence.trim(), score, index };
    });

    // Select top sentences
    const topSentences = sentenceScores
        .sort((a, b) => b.score - a.score)
        .slice(0, numSentences)
        .sort((a, b) => a.index - b.index);

    const summary = topSentences.map(s => s.sentence).join(' ');
    const compression = ((1 - summary.length / text.length) * 100).toFixed(1);

    self.postMessage({
        type: 'RESULT',
        payload: { summary, duration: performance.now() - startTime, stats: { compression } }
    });
}
