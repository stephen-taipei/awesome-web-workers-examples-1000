self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'MATCH') patternMatch(payload.text, payload.pattern);
};

function patternMatch(text, pattern) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Matching...' } });

    const strings = text.split('\n').map(s => s.trim()).filter(s => s);
    const matches = strings.filter(s => wildcardMatch(s, pattern));

    self.postMessage({
        type: 'RESULT',
        payload: {
            matches,
            duration: performance.now() - startTime,
            stats: { count: matches.length, total: strings.length }
        }
    });
}

function wildcardMatch(str, pattern) {
    const m = str.length;
    const n = pattern.length;

    // DP table
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(false));
    dp[0][0] = true;

    // Handle patterns starting with *
    for (let j = 1; j <= n; j++) {
        if (pattern[j - 1] === '*') dp[0][j] = dp[0][j - 1];
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (pattern[j - 1] === '*') {
                dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
            } else if (pattern[j - 1] === '?' || str[i - 1] === pattern[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    }

    return dp[m][n];
}
