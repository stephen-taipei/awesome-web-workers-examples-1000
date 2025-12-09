// Simple stopword list (English)
const STOP_WORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each",
    "few", "for", "from", "further",
    "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
    "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's",
    "me", "more", "most", "mustn't", "my", "myself",
    "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
    "under", "until", "up",
    "very",
    "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
    "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // RAKE Algorithm (Rapid Automatic Keyword Extraction) implementation

    // 1. Split text into sentences
    // Split by ., !, ?, newline
    const sentences = text.split(/[.!?,;\n]+/);

    // 2. Generate candidate keywords
    // Split sentences into phrases by stopwords
    const phrases = [];

    sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        let currentPhrase = [];

        words.forEach(word => {
            const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, ''); // Simple cleanup
            if (cleanWord.length === 0) return;

            if (STOP_WORDS.has(cleanWord)) {
                if (currentPhrase.length > 0) {
                    phrases.push(currentPhrase);
                    currentPhrase = [];
                }
            } else {
                currentPhrase.push(cleanWord);
            }
        });

        if (currentPhrase.length > 0) {
            phrases.push(currentPhrase);
        }
    });

    // 3. Calculate word scores
    // Degree(word) = number of times word appears + number of times it co-occurs with other words in phrases
    // Frequency(word) = count
    // Score = Degree / Frequency

    const wordFrequency = {};
    const wordDegree = {};

    phrases.forEach(phrase => {
        // Phrase is array of words
        // phrase length - 1 is the number of co-occurrences for each word in this phrase
        const degree = phrase.length - 1;

        phrase.forEach(word => {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            // Degree calculation: sum of lengths of phrases word appears in?
            // Actually RAKE definition: Degree of word w is sum of sizes of phrases w appears in?
            // Usually: deg(w) = freq(w) + sum_{w' \in P, w!=w'} freq(w, w')
            // Simplified: For each phrase, add phrase.length to degree of each word in it.
            wordDegree[word] = (wordDegree[word] || 0) + phrase.length;
        });
    });

    const wordScores = {};
    for (const word in wordFrequency) {
        wordScores[word] = wordDegree[word] / wordFrequency[word];
    }

    // 4. Calculate candidate keyword scores
    // Sum of word scores for words in the phrase
    const keywordCandidates = {};

    phrases.forEach(phrase => {
        const keyword = phrase.join(' ');
        let score = 0;
        phrase.forEach(word => {
            score += wordScores[word];
        });
        keywordCandidates[keyword] = score;
    });

    // 5. Sort
    const sortedKeywords = Object.entries(keywordCandidates)
        .map(([word, score]) => ({ word, score }))
        .sort((a, b) => b.score - a.score);

    // Take top 20, filtering short ones
    const topKeywords = sortedKeywords
        .filter(k => k.word.length > 2) // Filter very short artifacts
        .slice(0, 30); // Top 30

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        results: topKeywords,
        time: endTime - startTime
    });
};
