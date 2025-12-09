self.onmessage = function(e) {
    const { command, sampleSize, noise } = e.data;

    if (command === 'calculate') {
        const start = performance.now();

        // 1. Generate synthetic data
        // We simulate a binary classification problem.
        // Label 0: score centered around 0.3
        // Label 1: score centered around 0.7
        // Noise makes them overlap.
        self.postMessage({ type: 'status', data: 'Generating Data...' });
        
        const data = new Float32Array(sampleSize * 2); // Storing [score, label] interleaved
        
        for (let i = 0; i < sampleSize; i++) {
            const label = Math.random() > 0.5 ? 1 : 0;
            let score;
            
            // Simple simulation of scores based on label + noise
            if (label === 1) {
                score = 0.7 + (Math.random() - 0.5) * noise * 2;
            } else {
                score = 0.3 + (Math.random() - 0.5) * noise * 2;
            }
            
            // Clamp score to 0-1
            score = Math.max(0, Math.min(1, score));
            
            data[i * 2] = score;
            data[i * 2 + 1] = label;
        }

        // 2. Sort by score descending
        self.postMessage({ type: 'status', data: 'Sorting...' });
        
        // Create an index array to sort
        const indices = new Int32Array(sampleSize);
        for(let i=0; i<sampleSize; i++) indices[i] = i;

        indices.sort((a, b) => data[b * 2] - data[a * 2]);

        // 3. Calculate ROC points
        self.postMessage({ type: 'status', data: 'Calculating Curve...' });
        
        // Count total positives and negatives
        let totalPos = 0;
        let totalNeg = 0;
        for (let i = 0; i < sampleSize; i++) {
            if (data[i * 2 + 1] === 1) totalPos++;
            else totalNeg++;
        }

        const rocPoints = [];
        let tp = 0;
        let fp = 0;
        let lastScore = -1;

        // Downsample for visualization if too many points
        const downsampleRate = Math.max(1, Math.floor(sampleSize / 1000));

        for (let i = 0; i < sampleSize; i++) {
            const idx = indices[i];
            const score = data[idx * 2];
            const label = data[idx * 2 + 1];

            // Threshold update logic:
            // If score changes, record the point
            // (But for smooth drawing with many points, we might skip some)
            
            if (label === 1) tp++;
            else fp++;

            if (i % downsampleRate === 0 || i === sampleSize - 1) {
                rocPoints.push([fp / totalNeg, tp / totalPos]);
            }
        }

        // 4. Calculate AUC (using Trapezoidal rule on the full points implicitly or accumulated)
        // Re-calculating exactly for AUC
        let auc = 0;
        let aucTp = 0;
        let aucFp = 0;
        let prevFp = 0;
        
        // Reset for exact AUC calculation
        for (let i = 0; i < sampleSize; i++) {
            const idx = indices[i];
            const label = data[idx * 2 + 1];
            
            if (label === 1) {
                aucTp++;
            } else {
                aucFp++;
                auc += aucTp; // Add current TPs for every FP step (Mann-Whitney U equivalent logic or geometric integration)
            }
        }
        // AUC = U / (n1 * n0)
        // Actually, simple accumulation: for every negative, add number of positives ranked higher.
        auc = auc / (totalPos * totalNeg);

        const end = performance.now();
        
        self.postMessage({
            type: 'result',
            data: {
                auc,
                rocPoints,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
