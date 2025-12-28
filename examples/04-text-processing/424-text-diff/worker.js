/**
 * Text Diff Web Worker - Simple line-based diff
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'DIFF') computeDiff(payload.text1, payload.text2);
};

function computeDiff(text1, text2) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Computing diff...' } });

    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    // Simple LCS-based diff
    const lcs = computeLCS(lines1, lines2);

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: 'Generating output...' } });

    const result = [];
    let i = 0, j = 0, k = 0;
    let added = 0, removed = 0, unchanged = 0;

    while (i < lines1.length || j < lines2.length) {
        if (k < lcs.length && i < lines1.length && lines1[i] === lcs[k]) {
            if (j < lines2.length && lines2[j] === lcs[k]) {
                result.push({ type: 'same', line: lines1[i] });
                unchanged++;
                i++; j++; k++;
            } else {
                result.push({ type: 'add', line: lines2[j] });
                added++;
                j++;
            }
        } else if (i < lines1.length && (k >= lcs.length || lines1[i] !== lcs[k])) {
            result.push({ type: 'remove', line: lines1[i] });
            removed++;
            i++;
        } else if (j < lines2.length) {
            result.push({ type: 'add', line: lines2[j] });
            added++;
            j++;
        }
    }

    const html = result.map(r => {
        const escaped = escapeHTML(r.line);
        if (r.type === 'add') return `<div style="background:#1b4332;color:#4caf50">+ ${escaped}</div>`;
        if (r.type === 'remove') return `<div style="background:#442222;color:#f44336">- ${escaped}</div>`;
        return `<div style="color:#888">  ${escaped}</div>`;
    }).join('');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: html,
            duration: performance.now() - startTime,
            stats: { added, removed, unchanged }
        }
    });
}

function computeLCS(arr1, arr2) {
    const m = arr1.length, n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (arr1[i-1] === arr2[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
            else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }

    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (arr1[i-1] === arr2[j-1]) { lcs.unshift(arr1[i-1]); i--; j--; }
        else if (dp[i-1][j] > dp[i][j-1]) i--;
        else j--;
    }
    return lcs;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
