self.onmessage = function(e) {
    const { imageData, smoothing, edgeIntensity } = e.data;
    const startTime = performance.now();

    // 1. Median Filter for smoothing (simulating color wash)
    const smoothedData = medianFilter(imageData, smoothing);
    self.postMessage({ type: 'progress', data: 50 });

    // 2. Edge Detection (Sobel)
    const edges = detectEdges(smoothedData);
    self.postMessage({ type: 'progress', data: 75 });

    // 3. Blend (Subtract edges from smoothed)
    const resultData = blendEdges(smoothedData, edges, edgeIntensity);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function medianFilter(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const resultBuffer = new Uint8ClampedArray(data.length);
    const side = radius;
    const windowSize = (2 * side + 1) * (2 * side + 1);

    // Optimizations could be done here (histogram based median), but simple sort for now

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rList = [];
            const gList = [];
            const bList = [];

            for (let dy = -side; dy <= side; dy++) {
                for (let dx = -side; dx <= side; dx++) {
                    const ny = Math.min(Math.max(y + dy, 0), height - 1);
                    const nx = Math.min(Math.max(x + dx, 0), width - 1);
                    const idx = (ny * width + nx) * 4;
                    rList.push(data[idx]);
                    gList.push(data[idx+1]);
                    bList.push(data[idx+2]);
                }
            }

            rList.sort((a, b) => a - b);
            gList.sort((a, b) => a - b);
            bList.sort((a, b) => a - b);

            const mid = Math.floor(rList.length / 2);

            const idx = (y * width + x) * 4;
            resultBuffer[idx] = rList[mid];
            resultBuffer[idx+1] = gList[mid];
            resultBuffer[idx+2] = bList[mid];
            resultBuffer[idx+3] = data[idx+3];
        }

        if (y % 20 === 0) {
            self.postMessage({ type: 'progress', data: (y / height) * 50 });
        }
    }

    return new ImageData(resultBuffer, width, height);
}

function detectEdges(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    // We only need a grayscale intensity map for edges
    const edgeMap = new Float32Array(width * height);

    const gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumX = 0;
            let sumY = 0;

            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const ny = Math.min(Math.max(y + i, 0), height - 1);
                    const nx = Math.min(Math.max(x + j, 0), width - 1);
                    const idx = (ny * width + nx) * 4;

                    // Use luminance for edge detection
                    const lum = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];

                    sumX += lum * gx[i+1][j+1];
                    sumY += lum * gy[i+1][j+1];
                }
            }

            const mag = Math.sqrt(sumX * sumX + sumY * sumY);
            edgeMap[y * width + x] = mag;
        }
    }
    return edgeMap;
}

function blendEdges(imageData, edgeMap, intensity) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputBuffer = new Uint8ClampedArray(data.length);

    for (let i = 0; i < width * height; i++) {
        const edgeVal = edgeMap[i];
        // Darken based on edge strength
        // Simple subtractive model: Pixel - (Edge * Intensity)
        const factor = Math.max(0, 1 - (edgeVal * intensity) / 255);

        const idx = i * 4;
        outputBuffer[idx] = data[idx] * factor; // Red
        outputBuffer[idx+1] = data[idx+1] * factor; // Green
        outputBuffer[idx+2] = data[idx+2] * factor; // Blue
        outputBuffer[idx+3] = data[idx+3]; // Alpha
    }

    return new ImageData(outputBuffer, width, height);
}
