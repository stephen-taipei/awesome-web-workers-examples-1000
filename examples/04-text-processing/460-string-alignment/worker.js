self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ALIGN') align(payload.text1, payload.text2, payload.matchScore, payload.mismatchScore, payload.gapScore);
};

function align(seq1, seq2, matchScore, mismatchScore, gapScore) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Aligning sequences...' } });

    const m = seq1.length;
    const n = seq2.length;

    // Initialize scoring matrix
    const score = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) score[i][0] = i * gapScore;
    for (let j = 0; j <= n; j++) score[0][j] = j * gapScore;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const match = score[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore);
            const deleteGap = score[i - 1][j] + gapScore;
            const insertGap = score[i][j - 1] + gapScore;
            score[i][j] = Math.max(match, deleteGap, insertGap);
        }
    }

    // Traceback
    let aligned1 = '';
    let aligned2 = '';
    let i = m, j = n;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
            const currentScore = score[i][j];
            const diagonal = score[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? matchScore : mismatchScore);

            if (currentScore === diagonal) {
                aligned1 = seq1[i - 1] + aligned1;
                aligned2 = seq2[j - 1] + aligned2;
                i--;
                j--;
                continue;
            }
        }

        if (i > 0 && score[i][j] === score[i - 1][j] + gapScore) {
            aligned1 = seq1[i - 1] + aligned1;
            aligned2 = '-' + aligned2;
            i--;
        } else {
            aligned1 = '-' + aligned1;
            aligned2 = seq2[j - 1] + aligned2;
            j--;
        }
    }

    // Calculate statistics
    let matches = 0, mismatches = 0, gaps = 0;
    let matchLine = '';
    let alignedHtml1 = '';
    let alignedHtml2 = '';

    for (let k = 0; k < aligned1.length; k++) {
        const c1 = aligned1[k];
        const c2 = aligned2[k];

        if (c1 === '-' || c2 === '-') {
            gaps++;
            matchLine += ' ';
            alignedHtml1 += `<span style="color:#ff9800">${c1}</span>`;
            alignedHtml2 += `<span style="color:#ff9800">${c2}</span>`;
        } else if (c1 === c2) {
            matches++;
            matchLine += '|';
            alignedHtml1 += `<span style="color:#4caf50">${c1}</span>`;
            alignedHtml2 += `<span style="color:#4caf50">${c2}</span>`;
        } else {
            mismatches++;
            matchLine += '.';
            alignedHtml1 += `<span style="color:#f44336">${c1}</span>`;
            alignedHtml2 += `<span style="color:#f44336">${c2}</span>`;
        }
    }

    const identity = aligned1.length > 0 ? matches / aligned1.length : 0;

    self.postMessage({
        type: 'RESULT',
        payload: {
            aligned1,
            aligned2,
            alignedHtml1,
            alignedHtml2,
            matchLine,
            score: score[m][n],
            matches,
            mismatches,
            gaps,
            identity,
            duration: performance.now() - startTime
        }
    });
}
