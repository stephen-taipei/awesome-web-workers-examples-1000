self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // 1. Normalize text (lowercase)
    // 2. Split into words using regex
    // Supports English words and basic CJK characters handling (treating sequence of CJK as words or separating them? Standard is separating CJK chars usually, or using specific tokenizer. Here we use a simple regex for demo)

    // Regex explanation:
    // \w+ : English alphanumeric words
    // [\u4e00-\u9fa5] : Chinese characters (treat each char as a word? or sequences? Usually segmentation needed. For simple freq, treating sequences of non-space might be better or single chars. Let's assume space separated for English, and maybe split Chinese?)
    // For simplicity, we just split by non-word characters.

    // A better regex for international text:
    // Match sequences of word characters.
    const words = text.toLowerCase().match(/[\w\u4e00-\u9fa5]+/g) || [];

    const freqMap = new Map();
    let totalWords = 0;

    for (const word of words) {
        // Simple filtering for numbers or short useless strings could be added
        if (word.length < 1) continue;

        freqMap.set(word, (freqMap.get(word) || 0) + 1);
        totalWords++;
    }

    // Convert map to array and sort
    const sortedResults = Array.from(freqMap.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);

    // Take top 100
    const topResults = sortedResults.slice(0, 100);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        results: topResults,
        totalWords: totalWords,
        time: endTime - startTime
    });
};
