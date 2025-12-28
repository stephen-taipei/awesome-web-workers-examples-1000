const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'if', 'because', 'as', 'until', 'while', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'their', 'them', 'he', 'she', 'his', 'her', 'him', 'we', 'our', 'us', 'you', 'your', 'i', 'my', 'me', 'which', 'who', 'whom', 'what', 'whose']);

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'EXTRACT') extract(payload.text);
};

function extract(text) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Tokenizing...' } });

    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

    // Calculate TF
    const tf = {};
    const totalWords = words.length;
    for (const word of words) {
        if (!stopWords.has(word)) {
            tf[word] = (tf[word] || 0) + 1;
        }
    }

    // Calculate IDF (using sentence frequency as proxy)
    const df = {};
    for (const sentence of sentences) {
        const sentenceWords = new Set(sentence.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);
        for (const word of sentenceWords) {
            if (!stopWords.has(word)) {
                df[word] = (df[word] || 0) + 1;
            }
        }
    }

    // Calculate TF-IDF
    const keywords = [];
    for (const word in tf) {
        const tfScore = tf[word] / totalWords;
        const idfScore = Math.log(sentences.length / (df[word] || 1));
        keywords.push({ word, score: tfScore * idfScore });
    }

    keywords.sort((a, b) => b.score - a.score);

    self.postMessage({
        type: 'RESULT',
        payload: {
            keywords: keywords.slice(0, 15),
            duration: performance.now() - startTime
        }
    });
}
