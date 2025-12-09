self.onmessage = function(e) {
    const { dictionary, word } = e.data;

    const startTime = performance.now();

    const inputWord = word.toLowerCase();
    const suggestions = [];

    // Simple strategy: find words with Edit Distance <= 2 (or 3 depending on length)
    // Or just sort dictionary by distance and take top 5

    // Optimization: If exact match found, return immediately
    if (dictionary.includes(inputWord)) {
        suggestions.push({ word: inputWord, distance: 0 });
    } else {
        const candidates = [];

        for (let i = 0; i < dictionary.length; i++) {
            const dictWord = dictionary[i];

            // Optimization: Length difference check
            if (Math.abs(dictWord.length - inputWord.length) > 3) continue;

            const dist = levenshtein(inputWord, dictWord);
            candidates.push({ word: dictWord, distance: dist });
        }

        candidates.sort((a, b) => a.distance - b.distance);

        // Take top 5
        for (let i = 0; i < Math.min(5, candidates.length); i++) {
            // Only reasonable suggestions (distance < length/2 + 1 roughly)
            if (candidates[i].distance < Math.max(3, inputWord.length)) {
                suggestions.push(candidates[i]);
            }
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            suggestions: suggestions,
            time: endTime - startTime
        }
    });
};

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
