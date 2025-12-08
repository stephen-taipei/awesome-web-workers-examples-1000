// Color Temperature - Web Worker

self.onmessage = function(e) {
    const { imageData, width, height, temperature } = e.data;
    processColorTemperature(new Uint8ClampedArray(imageData), width, height, temperature);
};

function processColorTemperature(data, width, height, temperature) {
    const startTime = performance.now();
    const totalPixels = width * height;
    const result = new Uint8ClampedArray(data.length);

    // Temperature adjustment factors
    // temperature: -100 (cool/blue) to +100 (warm/orange)
    const tempFactor = temperature / 100;

    // Calculate RGB adjustment multipliers
    let rMult, gMult, bMult;

    if (temperature > 0) {
        // Warm: increase red, slightly increase green, decrease blue
        rMult = 1 + tempFactor * 0.3;
        gMult = 1 + tempFactor * 0.1;
        bMult = 1 - tempFactor * 0.3;
    } else {
        // Cool: decrease red, slightly decrease green, increase blue
        rMult = 1 + tempFactor * 0.3;
        gMult = 1 + tempFactor * 0.1;
        bMult = 1 - tempFactor * 0.3;
    }

    let lastProgress = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;

        // Get RGB values
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Apply temperature adjustment
        let newR = r * rMult;
        let newG = g * gMult;
        let newB = b * bMult;

        // Preserve luminance to avoid over-brightening/darkening
        const origLuminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const newLuminance = 0.299 * newR + 0.587 * newG + 0.114 * newB;

        if (newLuminance > 0) {
            const lumRatio = origLuminance / newLuminance;
            // Partial luminance preservation
            const preserveFactor = 0.5;
            const adjustFactor = 1 + (lumRatio - 1) * preserveFactor;
            newR *= adjustFactor;
            newG *= adjustFactor;
            newB *= adjustFactor;
        }

        // Clamp values
        result[idx] = clamp(Math.round(newR), 0, 255);
        result[idx + 1] = clamp(Math.round(newG), 0, 255);
        result[idx + 2] = clamp(Math.round(newB), 0, 255);
        result[idx + 3] = a;

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
        temperature: temperature,
        executionTime: executionTime
    }, [result.buffer]);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
