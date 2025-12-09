// Gamma Correction - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, gamma } = e.data;
    processGammaCorrection(new Uint8ClampedArray(imageData), width, height, gamma);
};

function processGammaCorrection(data, width, height, gamma) {
    const startTime = performance.now();
    const totalPixels = width * height;
    const result = new Uint8ClampedArray(data.length);

    // Pre-compute lookup table for performance
    const lookupTable = new Uint8Array(256);
    const invGamma = 1.0 / gamma;

    for (let i = 0; i < 256; i++) {
        // Normalize to 0-1, apply gamma, denormalize to 0-255
        lookupTable[i] = Math.round(255 * Math.pow(i / 255, gamma));
    }

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        // Apply gamma correction using lookup table
        result[idx] = lookupTable[data[idx]];         // R
        result[idx + 1] = lookupTable[data[idx + 1]]; // G
        result[idx + 2] = lookupTable[data[idx + 2]]; // B
        result[idx + 3] = data[idx + 3];              // A (unchanged)

        // Report progress every 5%
        const progress = Math.floor((i / totalPixels) * 100);
        if (progress >= lastProgress + 5) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                percent: progress,
                processedPixels: i
            });
        }
    }

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        imageData: result.buffer,
        width: width,
        height: height,
        gamma: gamma,
        executionTime: executionTime
    }, [result.buffer]);
}
