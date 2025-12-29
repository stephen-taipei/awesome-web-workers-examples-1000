self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'SEARCH') search(payload.text, payload.pattern);
};

function search(text, pattern) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Building bad character table...' } });

    // Boyer-Moore algorithm
    const positions = boyerMooreSearch(text.toLowerCase(), pattern.toLowerCase());

    self.postMessage({ type: 'PROGRESS', payload: { percent: 70, message: 'Highlighting matches...' } });

    // Highlight matches
    let highlighted = escapeHTML(text);
    let offset = 0;
    const openTag = '<mark style="background:#ffeb3b;padding:2px;">';
    const closeTag = '</mark>';

    for (const pos of positions) {
        const adjustedPos = pos + offset;
        highlighted = highlighted.slice(0, adjustedPos) + openTag +
                      highlighted.slice(adjustedPos, adjustedPos + pattern.length) + closeTag +
                      highlighted.slice(adjustedPos + pattern.length);
        offset += openTag.length + closeTag.length;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            highlighted,
            duration: performance.now() - startTime,
            stats: { count: positions.length, positions }
        }
    });
}

function boyerMooreSearch(text, pattern) {
    const positions = [];
    if (pattern.length === 0) return positions;

    // Build bad character table
    const badChar = {};
    for (let i = 0; i < pattern.length; i++) {
        badChar[pattern[i]] = i;
    }

    let s = 0;
    while (s <= text.length - pattern.length) {
        let j = pattern.length - 1;

        while (j >= 0 && pattern[j] === text[s + j]) j--;

        if (j < 0) {
            positions.push(s);
            s++;
        } else {
            const bc = badChar[text[s + j]];
            s += Math.max(1, j - (bc !== undefined ? bc : -1));
        }
    }

    return positions;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
