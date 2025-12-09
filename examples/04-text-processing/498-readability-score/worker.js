self.onmessage = function(e) {
    const { text } = e.data;

    // 1. Tokenize
    // Sentences: Split by . ! ?
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
    const sentenceCount = Math.max(1, sentences.length);

    // Words: Split by whitespace, remove punctuation
    const words = text.match(/\b\w+\b/g) || [];
    const wordCount = Math.max(1, words.length);

    // Syllables
    let syllableCount = 0;
    words.forEach(word => {
        syllableCount += countSyllables(word);
    });
    if (syllableCount === 0) syllableCount = 1;

    // Complex words (>= 3 syllables)
    const complexWordCount = words.filter(w => countSyllables(w) >= 3).length;

    // 2. Calculate Scores

    // Flesch Reading Ease
    // 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
    const ASL = wordCount / sentenceCount; // Avg Sentence Length
    const ASW = syllableCount / wordCount; // Avg Syllables per Word
    const fleschEase = 206.835 - (1.015 * ASL) - (84.6 * ASW);

    // Flesch-Kincaid Grade Level
    // 0.39(total words/total sentences) + 11.8(total syllables/total words) - 15.59
    const fleschGrade = (0.39 * ASL) + (11.8 * ASW) - 15.59;

    // Gunning Fog
    // 0.4 * ((words/sentences) + 100 * (complex words/words))
    const percentComplex = (complexWordCount / wordCount) * 100;
    const gunningFog = 0.4 * (ASL + percentComplex);

    // Coleman-Liau Index
    // 0.0588L - 0.296S - 15.8
    // L = avg number of letters per 100 words
    // S = avg number of sentences per 100 words
    const letterCount = text.replace(/[^a-zA-Z]/g, '').length;
    const L = (letterCount / wordCount) * 100;
    const S = (sentenceCount / wordCount) * 100;
    const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

    // ARI (Automated Readability Index)
    // 4.71(characters/words) + 0.5(words/sentences) - 21.43
    const charCount = text.replace(/\s/g, '').length; // Visible chars
    const ari = 4.71 * (charCount / wordCount) + 0.5 * ASL - 21.43;

    self.postMessage({
        scores: [
            { name: "Flesch Reading Ease", value: fleschEase, description: "Higher is easier (0-100)" },
            { name: "Flesch-Kincaid Grade", value: fleschGrade, description: "US School Grade Level" },
            { name: "Gunning Fog", value: gunningFog, description: "Years of formal education" },
            { name: "Coleman-Liau", value: colemanLiau, description: "Based on characters" },
            { name: "ARI", value: ari, description: "Automated Readability Index" }
        ],
        counts: {
            sentences: sentenceCount,
            words: wordCount,
            syllables: syllableCount
        }
    });
};

function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    // Basic heuristic rules
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}
