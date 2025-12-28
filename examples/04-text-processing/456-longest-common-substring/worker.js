self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'FIND') findLCS(payload.text1, payload.text2);
};

function findLCS(text1, text2) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Finding LCS...' } });

    const m = text1.length;
    const n = text2.length;

    // DP table
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    let maxLength = 0;
    let endPos1 = 0;

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > maxLength) {
                    maxLength = dp[i][j];
                    endPos1 = i;
                }
            }
        }
    }

    const pos1 = endPos1 - maxLength;
    const lcs = text1.slice(pos1, endPos1);

    // Find position in text2
    const pos2 = text2.indexOf(lcs);

    // Create highlighted versions
    const highlighted1 = highlightSubstring(text1, pos1, maxLength);
    const highlighted2 = highlightSubstring(text2, pos2, maxLength);

    self.postMessage({
        type: 'RESULT',
        payload: {
            lcs,
            pos1,
            pos2,
            highlighted1,
            highlighted2,
            duration: performance.now() - startTime
        }
    });
}

function highlightSubstring(text, start, length) {
    if (length === 0) return escapeHtml(text);

    const before = escapeHtml(text.slice(0, start));
    const match = escapeHtml(text.slice(start, start + length));
    const after = escapeHtml(text.slice(start + length));

    return before + `<mark style="background:#4caf5044;padding:2px 0">${match}</mark>` + after;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
