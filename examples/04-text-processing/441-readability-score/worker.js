self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ANALYZE') analyze(payload.text);
};

function analyze(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Counting...' } });

    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const syllableCount = syllables;

    // Flesch Reading Ease
    const fleschEase = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);

    // Flesch-Kincaid Grade Level
    const fleschGrade = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;

    let easeLevel;
    if (fleschEase >= 90) easeLevel = 'Very Easy';
    else if (fleschEase >= 80) easeLevel = 'Easy';
    else if (fleschEase >= 70) easeLevel = 'Fairly Easy';
    else if (fleschEase >= 60) easeLevel = 'Standard';
    else if (fleschEase >= 50) easeLevel = 'Fairly Difficult';
    else if (fleschEase >= 30) easeLevel = 'Difficult';
    else easeLevel = 'Very Confusing';

    self.postMessage({
        type: 'RESULT',
        payload: {
            stats: {
                fleschEase: fleschEase.toFixed(1),
                fleschGrade: Math.max(0, fleschGrade).toFixed(1),
                easeLevel,
                words: wordCount,
                sentences: sentenceCount,
                syllables: syllableCount
            },
            duration: performance.now() - startTime
        }
    });
}

function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}
