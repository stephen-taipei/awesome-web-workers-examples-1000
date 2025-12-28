self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'FIND') findLCS(payload.text1, payload.text2);
};

function findLCS(text1, text2) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Finding LCS...' } });

    const m = text1.length;
    const n = text2.length;

    // Create DP matrix
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the LCS
    let lcs = '';
    const path = [];
    const lcsPositions1 = new Set();
    const lcsPositions2 = new Set();
    let i = m, j = n;

    while (i > 0 && j > 0) {
        path.push([i, j]);
        if (text1[i - 1] === text2[j - 1]) {
            lcs = text1[i - 1] + lcs;
            lcsPositions1.add(i - 1);
            lcsPositions2.add(j - 1);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    // Add remaining path
    while (i > 0 || j > 0) {
        path.push([i, j]);
        if (i > 0) i--;
        else j--;
    }
    path.push([0, 0]);

    // Create highlighted versions
    const highlighted1 = highlightPositions(text1, lcsPositions1);
    const highlighted2 = highlightPositions(text2, lcsPositions2);

    self.postMessage({
        type: 'RESULT',
        payload: {
            text1,
            text2,
            lcs,
            highlighted1,
            highlighted2,
            matrix: dp,
            path: path.reverse(),
            duration: performance.now() - startTime
        }
    });
}

function highlightPositions(text, positions) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        if (positions.has(i)) {
            result += `<span style="background:#4caf5044;padding:2px 4px;border-radius:2px;font-weight:bold">${escapeHtml(text[i])}</span>`;
        } else {
            result += `<span style="color:#999">${escapeHtml(text[i])}</span>`;
        }
    }
    return result;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
