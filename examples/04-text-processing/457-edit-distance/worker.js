self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CALCULATE') calculate(payload.text1, payload.text2);
};

function calculate(text1, text2) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Calculating...' } });

    const m = text1.length;
    const n = text2.length;

    // Create DP matrix
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // delete
                    dp[i][j - 1],     // insert
                    dp[i - 1][j - 1]  // replace
                );
            }
        }
    }

    const distance = dp[m][n];

    // Backtrack to find operations
    const operations = [];
    const path = [[m, n]];
    let i = m, j = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && text1[i - 1] === text2[j - 1]) {
            operations.unshift({ type: 'match', description: `'${text1[i - 1]}' matches` });
            i--;
            j--;
        } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
            operations.unshift({ type: 'replace', description: `Replace '${text1[i - 1]}' with '${text2[j - 1]}'` });
            i--;
            j--;
        } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
            operations.unshift({ type: 'insert', description: `Insert '${text2[j - 1]}'` });
            j--;
        } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
            operations.unshift({ type: 'delete', description: `Delete '${text1[i - 1]}'` });
            i--;
        } else {
            break;
        }
        path.push([i, j]);
    }

    // Filter out matches for cleaner display
    const editOperations = operations.filter(op => op.type !== 'match');

    // Calculate similarity
    const maxLen = Math.max(m, n);
    const similarity = maxLen === 0 ? 1 : 1 - (distance / maxLen);

    self.postMessage({
        type: 'RESULT',
        payload: {
            text1,
            text2,
            distance,
            similarity,
            operations: editOperations,
            matrix: dp,
            path: path.reverse(),
            duration: performance.now() - startTime
        }
    });
}
