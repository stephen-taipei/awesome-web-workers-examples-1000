self.onmessage = function(e) {
    const { list, query, maxDist } = e.data;

    const startTime = performance.now();

    const results = [];

    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const dist = levenshtein(query.toLowerCase(), item.toLowerCase());

        if (dist <= maxDist) {
            results.push({ item, distance: dist });
        }
    }

    // Sort by distance (ascending)
    results.sort((a, b) => a.distance - b.distance);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            results: results,
            time: endTime - startTime
        }
    });
};

// Levenshtein distance implementation
// O(M*N)
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
