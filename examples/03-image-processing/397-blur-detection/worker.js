self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Calculate Laplacian
    const laplacian = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            laplacian[idx] = -4 * gray[idx] +
                             gray[idx - 1] + gray[idx + 1] +
                             gray[idx - width] + gray[idx + width];
        }
    }

    // Calculate variance of Laplacian
    let sum = 0, sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const val = laplacian[y * width + x];
            sum += val;
            sumSq += val * val;
            count++;
        }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    const blurScore = variance;

    // Calculate local blur map using sliding window
    const windowSize = 15;
    const half = Math.floor(windowSize / 2);
    const blurMap = new Float32Array(width * height);

    for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
            let localSum = 0, localSumSq = 0, localCount = 0;

            for (let wy = -half; wy <= half; wy++) {
                for (let wx = -half; wx <= half; wx++) {
                    const val = laplacian[(y + wy) * width + (x + wx)];
                    localSum += val;
                    localSumSq += val * val;
                    localCount++;
                }
            }

            const localMean = localSum / localCount;
            const localVar = (localSumSq / localCount) - (localMean * localMean);
            blurMap[y * width + x] = localVar;
        }
    }

    // Normalize blur map
    const maxBlur = Math.max(...blurMap);
    const minBlur = Math.min(...blurMap.filter(v => v > 0));

    // Create visualization
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < blurMap.length; i++) {
        const normalized = maxBlur > minBlur ?
            (blurMap[i] - minBlur) / (maxBlur - minBlur) : 0;
        const idx = i * 4;

        // Red = blurry, Green = sharp
        output[idx] = Math.floor((1 - normalized) * 255);
        output[idx + 1] = Math.floor(normalized * 255);
        output[idx + 2] = 0;
        output[idx + 3] = 255;
    }

    // Classify the image
    let classification, status;
    if (blurScore > 500) {
        classification = 'sharp';
        status = 'Sharp - Image is in focus';
    } else if (blurScore > 100) {
        classification = 'moderate';
        status = 'Moderate - Some blur detected';
    } else {
        classification = 'blurry';
        status = 'Blurry - Image is out of focus';
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        blurScore,
        classification,
        status
    });
};
