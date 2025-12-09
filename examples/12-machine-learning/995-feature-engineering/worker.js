self.onmessage = function(e) {
    const { command, sampleSize, featureCount, config } = e.data;

    if (command === 'process') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating Random Data...' });

        // 1. Generate Data (Flat Float32Array to save memory)
        const totalElements = sampleSize * featureCount;
        const inputData = new Float32Array(totalElements);
        
        // Generate random values between 1 and 100 (to make log transform safe)
        for (let i = 0; i < totalElements; i++) {
            inputData[i] = Math.random() * 99 + 1;
        }

        self.postMessage({ type: 'status', data: 'Processing Features...' });

        // Calculate output dimensions
        // Start with original features
        let outputFeatures = featureCount;
        let featureNames = [];
        for(let i=0; i<featureCount; i++) featureNames.push(`f${i}`);

        // Track what we need to compute
        const doLog = config.logTransform;
        const doPoly = config.polyFeatures;
        const doNorm = config.normalize;
        const doStd = config.standardize;

        // If Poly enabled: n + n*(n-1)/2 interaction terms (simplified: just pairs f_i * f_j where j >= i)
        // Actually usually pairs. Let's do simple pairs (f_i * f_j for j >= i)
        // Count: n + n*(n+1)/2 = n + (n^2+n)/2.
        // Wait, standard poly features often include original, so total = n + n(n+1)/2 (quadratic)
        // Let's assume we append poly features to the dataset.
        
        let polyCount = 0;
        if (doPoly) {
            polyCount = (featureCount * (featureCount + 1)) / 2;
        }

        const totalOutputCols = featureCount + (doLog ? featureCount : 0) + polyCount;
        
        // Create headers
        let headers = [...featureNames];
        if (doLog) {
            featureNames.forEach(f => headers.push(`log(${f})`));
        }
        if (doPoly) {
            for (let i = 0; i < featureCount; i++) {
                for (let j = i; j < featureCount; j++) {
                    headers.push(`f${i}*f${j}`);
                }
            }
        }

        // Allocate Output Array
        // Note: For very large datasets, we might want to process in chunks. 
        // 1M rows * 20 cols = 20M floats = 80MB. This fits easily in RAM.
        // If we add poly features: 5 cols -> +15 cols = 20 cols total.
        // 20 cols -> ~210 poly cols. That grows fast. 
        // 1M * 200 = 200M floats = 800MB. Still okay for modern browsers, but heavy.
        
        const outputData = new Float32Array(sampleSize * totalOutputCols);

        // Process row by row
        for (let row = 0; row < sampleSize; row++) {
            const rowOffset = row * featureCount;
            const outOffset = row * totalOutputCols;
            
            let colIdx = 0;

            // 1. Original features (copy)
            for (let i = 0; i < featureCount; i++) {
                outputData[outOffset + colIdx] = inputData[rowOffset + i];
                colIdx++;
            }

            // 2. Log Transform
            if (doLog) {
                for (let i = 0; i < featureCount; i++) {
                    outputData[outOffset + colIdx] = Math.log(inputData[rowOffset + i]);
                    colIdx++;
                }
            }

            // 3. Poly Features
            if (doPoly) {
                for (let i = 0; i < featureCount; i++) {
                    for (let j = i; j < featureCount; j++) {
                        const val1 = inputData[rowOffset + i];
                        const val2 = inputData[rowOffset + j];
                        outputData[outOffset + colIdx] = val1 * val2;
                        colIdx++;
                    }
                }
            }
        }

        // Post-processing: Normalize / Standardize (Column-wise)
        // This requires a second pass
        if (doNorm || doStd) {
            self.postMessage({ type: 'status', data: 'Scaling Data...' });

            for (let col = 0; col < totalOutputCols; col++) {
                // Calculate Min/Max or Mean/StdDev for the column
                let min = Infinity, max = -Infinity;
                let sum = 0, sumSq = 0;

                for (let row = 0; row < sampleSize; row++) {
                    const val = outputData[row * totalOutputCols + col];
                    if (doNorm) {
                        if (val < min) min = val;
                        if (val > max) max = val;
                    }
                    if (doStd) {
                        sum += val;
                        sumSq += val * val;
                    }
                }

                let mean = sum / sampleSize;
                let stdDev = Math.sqrt((sumSq / sampleSize) - (mean * mean));

                // Apply transform
                for (let row = 0; row < sampleSize; row++) {
                    const idx = row * totalOutputCols + col;
                    let val = outputData[idx];

                    if (doNorm) {
                        const range = max - min;
                        val = range === 0 ? 0 : (val - min) / range;
                    }

                    if (doStd) {
                        val = stdDev === 0 ? 0 : (val - mean) / stdDev;
                    }

                    outputData[idx] = val;
                }
            }
        }

        // Prepare Preview (First 5 rows)
        const preview = [];
        for (let i = 0; i < Math.min(5, sampleSize); i++) {
            const row = [];
            for (let j = 0; j < totalOutputCols; j++) {
                row.push(outputData[i * totalOutputCols + j]);
            }
            preview.push(row);
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                preview,
                headers,
                inputRows: sampleSize,
                inputCols: featureCount,
                outputRows: sampleSize,
                outputCols: totalOutputCols,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
