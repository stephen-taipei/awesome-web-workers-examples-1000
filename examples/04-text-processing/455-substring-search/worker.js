self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SEARCH') search(payload.text, payload.pattern, payload.caseSensitive);
};

function search(text, pattern, caseSensitive) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Searching...' } });

    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

    // Use KMP algorithm for efficient substring search
    const matches = kmpSearch(searchText, searchPattern);

    // Create highlighted text
    let highlighted = '';
    let lastEnd = 0;

    for (const pos of matches) {
        // Escape and add text before match
        highlighted += escapeHtml(text.slice(lastEnd, pos));
        // Add highlighted match
        highlighted += `<mark style="background:#ffeb3b;padding:2px 0;border-radius:2px">${escapeHtml(text.slice(pos, pos + pattern.length))}</mark>`;
        lastEnd = pos + pattern.length;
    }

    // Add remaining text
    highlighted += escapeHtml(text.slice(lastEnd));

    self.postMessage({
        type: 'RESULT',
        payload: {
            pattern,
            matches,
            highlighted,
            duration: performance.now() - startTime
        }
    });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// KMP (Knuth-Morris-Pratt) algorithm
function kmpSearch(text, pattern) {
    if (pattern.length === 0) return [];

    const matches = [];
    const lps = computeLPS(pattern);
    let i = 0; // index for text
    let j = 0; // index for pattern

    while (i < text.length) {
        if (pattern[j] === text[i]) {
            i++;
            j++;
        }

        if (j === pattern.length) {
            matches.push(i - j);
            j = lps[j - 1];
        } else if (i < text.length && pattern[j] !== text[i]) {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }

    return matches;
}

// Compute Longest Proper Prefix which is also Suffix array
function computeLPS(pattern) {
    const lps = new Array(pattern.length).fill(0);
    let length = 0;
    let i = 1;

    while (i < pattern.length) {
        if (pattern[i] === pattern[length]) {
            length++;
            lps[i] = length;
            i++;
        } else {
            if (length !== 0) {
                length = lps[length - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }

    return lps;
}
