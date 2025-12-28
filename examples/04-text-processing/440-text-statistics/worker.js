self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ANALYZE') analyze(payload.text);
};

function analyze(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Analyzing...' } });

    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    const charCount = text.length;
    const charCountNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const paragraphCount = Math.max(1, paragraphs.length);

    const avgWordLength = wordCount > 0 ? (words.reduce((sum, w) => sum + w.length, 0) / wordCount).toFixed(1) : 0;
    const avgSentenceLength = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 0;
    const longestWord = words.reduce((longest, w) => w.length > longest.length ? w : longest, '');

    self.postMessage({
        type: 'RESULT',
        payload: {
            stats: {
                charCount, charCountNoSpaces, wordCount, sentenceCount, paragraphCount,
                avgWordLength, avgSentenceLength, longestWord
            },
            duration: performance.now() - startTime
        }
    });
}
