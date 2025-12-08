// Levels Adjustment - Web Worker

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'histogram') {
        calculateHistogram(new Uint8ClampedArray(data.imageData), data.width, data.height);
    } else if (data.type === 'levels') {
        processLevels(
            new Uint8ClampedArray(data.imageData),
            data.width,
            data.height,
            data.inputBlack,
            data.inputWhite,
            data.outputBlack,
            data.outputWhite,
            data.gamma
        );
    }
};

function calculateHistogram(data, width, height) {
    const totalPixels = width * height;

    // Initialize histogram arrays
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0)
    };

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        histogram.r[data[idx]]++;
        histogram.g[data[idx + 1]]++;
        histogram.b[data[idx + 2]]++;
    }

    self.postMessage({
        type: 'histogram',
        histogram: histogram
    });
}

function processLevels(data, width, height, inputBlack, inputWhite, outputBlack, outputWhite, gamma) {
    const startTime = performance.now();
    const totalPixels = width * height;
    const result = new Uint8ClampedArray(data.length);

    // Pre-compute lookup table
    const lookupTable = new Uint8Array(256);
    const inputRange = inputWhite - inputBlack;
    const outputRange = outputWhite - outputBlack;

    for (let i = 0; i < 256; i++) {
        let value;

        if (i <= inputBlack) {
            value = outputBlack;
        } else if (i >= inputWhite) {
            value = outputWhite;
        } else {
            // Normalize to 0-1 within input range
            let normalized = (i - inputBlack) / inputRange;

            // Apply gamma correction
            normalized = Math.pow(normalized, 1 / gamma);

            // Map to output range
            value = outputBlack + normalized * outputRange;
        }

        lookupTable[i] = clamp(Math.round(value), 0, 255);
    }

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        // Apply levels using lookup table
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
                percent: progress
            });
        }
    }

    const executionTime = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        imageData: result.buffer,
        width: width,
        height: height,
        inputBlack: inputBlack,
        inputWhite: inputWhite,
        outputBlack: outputBlack,
        outputWhite: outputWhite,
        gamma: gamma,
        executionTime: executionTime
    }, [result.buffer]);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
