self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'COMPARE') compare(payload.s1, payload.s2);
};

function compare(s1, s2) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Calculating...' } });

    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    const similarity = maxLen === 0 ? 100 : ((1 - distance / maxLen) * 100).toFixed(1);

    self.postMessage({
        type: 'RESULT',
        payload: {
            duration: performance.now() - startTime,
            stats: { distance, similarity }
        }
    });
}

function levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}
