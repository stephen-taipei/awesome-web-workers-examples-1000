// Count syllables in a word
function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    // Remove silent e
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    // Count vowel groups
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

// Split text into sentences
function getSentences(text) {
    return text
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .filter(s => s.trim().length > 0);
}

// Split text into words
function getWords(text) {
    return text
        .replace(/[^a-zA-Z\s'-]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0);
}

// Count characters (letters only)
function countLetters(words) {
    return words.reduce((sum, word) => sum + word.replace(/[^a-zA-Z]/g, '').length, 0);
}

function analyzeReadability(text) {
    const sentences = getSentences(text);
    const words = getWords(text);

    if (words.length === 0 || sentences.length === 0) {
        return {
            metrics: {
                words: 0, sentences: 0, syllables: 0,
                avgWordsPerSentence: 0, avgSyllablesPerWord: 0, complexWords: 0
            },
            scores: {
                fleschReadingEase: 0, fleschKincaidGrade: 0, gunningFog: 0,
                smog: 0, colemanLiau: 0, ari: 0
            }
        };
    }

    // Calculate metrics
    let totalSyllables = 0;
    let complexWordCount = 0;

    words.forEach(word => {
        const syllables = countSyllables(word);
        totalSyllables += syllables;
        if (syllables >= 3) complexWordCount++;
    });

    const numWords = words.length;
    const numSentences = sentences.length;
    const numLetters = countLetters(words);

    const avgWordsPerSentence = numWords / numSentences;
    const avgSyllablesPerWord = totalSyllables / numWords;

    // Flesch Reading Ease
    // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const fleschReadingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    // Flesch-Kincaid Grade Level
    // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    const fleschKincaidGrade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

    // Gunning Fog Index
    // 0.4 * ((words/sentences) + 100 * (complex words/words))
    const gunningFog = 0.4 * (avgWordsPerSentence + (100 * (complexWordCount / numWords)));

    // SMOG Index (Simple Measure of Gobbledygook)
    // 1.0430 * sqrt(complex words * (30/sentences)) + 3.1291
    const smog = 1.0430 * Math.sqrt(complexWordCount * (30 / numSentences)) + 3.1291;

    // Coleman-Liau Index
    // 0.0588 * L - 0.296 * S - 15.8
    // L = average number of letters per 100 words
    // S = average number of sentences per 100 words
    const L = (numLetters / numWords) * 100;
    const S = (numSentences / numWords) * 100;
    const colemanLiau = (0.0588 * L) - (0.296 * S) - 15.8;

    // Automated Readability Index
    // 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
    const ari = (4.71 * (numLetters / numWords)) + (0.5 * avgWordsPerSentence) - 21.43;

    return {
        metrics: {
            words: numWords,
            sentences: numSentences,
            syllables: totalSyllables,
            avgWordsPerSentence: avgWordsPerSentence,
            avgSyllablesPerWord: avgSyllablesPerWord,
            complexWords: complexWordCount
        },
        scores: {
            fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
            fleschKincaidGrade: Math.max(0, fleschKincaidGrade),
            gunningFog: Math.max(0, gunningFog),
            smog: Math.max(0, smog),
            colemanLiau: Math.max(0, colemanLiau),
            ari: Math.max(0, ari)
        }
    };
}

self.onmessage = function(e) {
    const { type, text } = e.data;

    if (type === 'analyze') {
        self.postMessage({
            type: 'progress',
            data: { progress: 0.3 }
        });

        const result = analyzeReadability(text);

        self.postMessage({
            type: 'progress',
            data: { progress: 0.9 }
        });

        self.postMessage({
            type: 'result',
            data: result
        });
    }
};
