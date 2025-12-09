self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    const stats = {
        totalChars: 0,
        totalCharsNoSpace: 0,
        totalWords: 0,
        totalLines: 0,
        totalParagraphs: 0,
        cjkChars: 0,
        avgWordLen: 0
    };

    if (!text) {
        self.postMessage({ type: 'result', stats, time: 0 });
        return;
    }

    // 1. Chars
    stats.totalChars = text.length;

    // 2. Chars No Space
    const noSpace = text.replace(/\s/g, '');
    stats.totalCharsNoSpace = noSpace.length;

    // 3. CJK Chars
    const cjkMatches = text.match(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g);
    stats.cjkChars = cjkMatches ? cjkMatches.length : 0;

    // 4. Words
    // Strategy:
    // English words: split by non-word chars.
    // CJK chars: usually counted as words individually (or distinct meaningful units).
    // Word processors usually count 1 CJK char = 1 word, 1 English word = 1 word.

    // Remove CJK chars first to count English words
    const nonCjkText = text.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/g, ' ');
    const enWords = nonCjkText.match(/\b\w+\b/g) || [];
    const enWordCount = enWords.length;

    stats.totalWords = enWordCount + stats.cjkChars;

    // 5. Avg Word Len (English only usually, or chars per CJK)
    if (enWordCount > 0) {
        const totalEnLen = enWords.reduce((a, b) => a + b.length, 0);
        stats.avgWordLen = (totalEnLen / enWordCount).toFixed(2);
    } else {
        stats.avgWordLen = 0;
    }

    // 6. Lines
    // Split by \n. Empty lines count? Usually yes.
    stats.totalLines = text.split(/\r\n|\r|\n/).length;

    // 7. Paragraphs
    // Split by blank lines (two or more newlines)
    const paragraphs = text.split(/\n\s*\n/);
    stats.totalParagraphs = paragraphs.filter(p => p.trim().length > 0).length;

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        stats,
        time: endTime - startTime
    });
};
