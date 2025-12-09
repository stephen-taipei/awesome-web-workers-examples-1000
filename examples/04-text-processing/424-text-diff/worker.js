// Text Diff Worker
// Implements LCS (Longest Common Subsequence) for line-by-line diff

self.onmessage = function(e) {
    const { text1, text2 } = e.data;

    try {
        const startTime = performance.now();

        const lines1 = text1.split(/\r?\n/);
        const lines2 = text2.split(/\r?\n/);

        const diffs = computeDiff(lines1, lines2);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                diffs: diffs,
                diffCount: diffs.filter(d => d.type !== 'same').length
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function computeDiff(lines1, lines2) {
    // 1. Compute LCS Matrix
    // Note: For very large files, O(N*M) memory is too much.
    // Optimization: Myers Diff Algorithm is O(ND), better for typical diffs.
    // Here we implement basic DP LCS for simplicity as files are expected to be small-medium.

    const N = lines1.length;
    const M = lines2.length;

    // DP Table: dp[i][j] stores length of LCS of lines1[0..i-1] and lines2[0..j-1]
    // To save space, we could use only 2 rows, but we need to backtrack for the solution.
    // If N*M > 10^7, this might crash.
    const dp = new Int32Array((N + 1) * (M + 1));

    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
            if (lines1[i-1] === lines2[j-1]) {
                dp[i*(M+1) + j] = dp[(i-1)*(M+1) + (j-1)] + 1;
            } else {
                dp[i*(M+1) + j] = Math.max(dp[(i-1)*(M+1) + j], dp[i*(M+1) + (j-1)]);
            }
        }
    }

    // 2. Backtrack to find diff
    let i = N;
    let j = M;
    const result = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i-1] === lines2[j-1]) {
            result.push({ type: 'same', oldText: lines1[i-1], newText: lines2[j-1], oldLine: i, newLine: j });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i*(M+1) + (j-1)] >= dp[(i-1)*(M+1) + j])) {
            // Addition (in lines2 but not lines1)
            result.push({ type: 'add', oldText: '', newText: lines2[j-1], oldLine: '', newLine: j });
            j--;
        } else if (i > 0 && (j === 0 || dp[i*(M+1) + (j-1)] < dp[(i-1)*(M+1) + j])) {
            // Deletion (in lines1 but not lines2)
            result.push({ type: 'del', oldText: lines1[i-1], newText: '', oldLine: i, newLine: '' });
            i--;
        }
    }

    result.reverse();

    // 3. Post-processing: Group changes into Modified blocks?
    // Side-by-side view is simpler if we align Add/Del into Change if they are adjacent.
    // Basic approach: Just list them.
    // Improvement: If we have DEL followed immediately by ADD, we can visually combine them as CHANGE?
    // Let's iterate and merge adjacent del+add pairs into change rows for better side-by-side

    const alignedResult = [];
    let k = 0;
    while(k < result.length) {
        // Check if we have a block of DELs followed by ADDs
        if (result[k].type === 'del') {
            let delBlock = [result[k]];
            k++;
            while(k < result.length && result[k].type === 'del') {
                delBlock.push(result[k]);
                k++;
            }

            let addBlock = [];
            while(k < result.length && result[k].type === 'add') {
                addBlock.push(result[k]);
                k++;
            }

            if (addBlock.length > 0) {
                // We have a block of DELs and ADDs. Match them up.
                const count = Math.max(delBlock.length, addBlock.length);
                for(let m=0; m<count; m++) {
                    const delItem = delBlock[m] || { oldText: '', oldLine: '' };
                    const addItem = addBlock[m] || { newText: '', newLine: '' };
                    alignedResult.push({
                        type: 'change', // or mixed
                        oldText: delItem.oldText,
                        newText: addItem.newText,
                        oldLine: delItem.oldLine,
                        newLine: addItem.newLine
                    });
                }
            } else {
                // Just DELs
                delBlock.forEach(item => alignedResult.push(item));
            }
        } else {
            alignedResult.push(result[k]);
            k++;
        }
    }

    return alignedResult;
}
