// Boyer-Moore Search Worker

self.onmessage = function(e) {
    const { text, term } = e.data;

    try {
        const startTime = performance.now();

        const indices = boyerMooreSearch(text, term);

        // Extract context for display
        const matches = indices.map(idx => {
            const start = Math.max(0, idx - 20);
            const end = Math.min(text.length, idx + term.length + 20);
            return {
                index: idx,
                contextBefore: text.substring(start, idx),
                matchText: text.substring(idx, idx + term.length),
                contextAfter: text.substring(idx + term.length, end)
            };
        });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                matches: matches,
                term: term
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

// Boyer-Moore Algorithm (Simplified Bad Character Rule + Good Suffix Rule)
// Actually standard JS indexOf is highly optimized (usually SIMD/Boyer-Moore-Horspool).
// But for educational purposes, we implement BM.
function boyerMooreSearch(text, pattern) {
    const n = text.length;
    const m = pattern.length;
    if (m === 0) return [];

    const results = [];

    // Preprocessing: Bad Character Table
    const badChar = new Map();
    for (let i = 0; i < m; i++) {
        badChar.set(pattern[i], i);
    }

    let s = 0; // Shift of the pattern with respect to text

    while (s <= n - m) {
        let j = m - 1;

        // Keep reducing j while characters of pattern and text are matching
        while (j >= 0 && pattern[j] === text[s + j]) {
            j--;
        }

        if (j < 0) {
            // Match found
            results.push(s);

            // Shift pattern
            // If pattern occurs again, we can shift at least 1.
            // Using Bad Character heuristic for next shift:
            // We look at text[s+m].
            if (s + m < n) {
                const bcShift = m - (badChar.get(text[s + m]) !== undefined ? badChar.get(text[s + m]) : -1);
                s += 1; // Simplification: just s += 1 or use advanced shift
                // Ideally: s += (m - badChar[text[s+m]])? No, that's Horspool.
                // Standard BM for multiple matches: s += m - badChar[text[s+m]] is wrong because index logic.
                // Simplest: s += 1 or Horspool shift logic for next char.
            } else {
                s += 1;
            }
        } else {
            // Mismatch at j
            // Bad Character Rule:
            // We want to align text[s+j] with a character in pattern.
            // badChar.get(text[s+j]) gives the LAST occurrence index in pattern.
            // We want to shift such that pattern index k matches j.
            // Shift = j - badChar[text[s+j]].
            const bcIndex = badChar.get(text[s + j]);
            const shift = Math.max(1, j - (bcIndex !== undefined ? bcIndex : -1));
            s += shift;
        }
    }

    return results;
}
