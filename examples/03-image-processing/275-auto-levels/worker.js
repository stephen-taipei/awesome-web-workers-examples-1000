/**
 * Auto Levels - Automatic Histogram-based Level Adjustment
 * Stretches the tonal range to use the full 0-255 spectrum
 */

self.onmessage = function(e) {
    const { command, imageData, width, height, mode, clipPercent, gamma } = e.data;

    if (command === 'autoLevels') {
        const start = performance.now();

        const pixels = new Uint8ClampedArray(imageData);
        const output = new Uint8ClampedArray(pixels.length);
        const numPixels = width * height;

        self.postMessage({ type: 'status', data: 'Computing histogram...' });

        // Compute histogram before adjustment
        const histogramBefore = new Uint32Array(256);

        let result;
        switch (mode) {
            case 'rgb':
                result = autoLevelsRGB(pixels, output, numPixels, clipPercent, gamma, histogramBefore);
                break;
            case 'luminance':
                result = autoLevelsLuminance(pixels, output, numPixels, clipPercent, gamma, histogramBefore);
                break;
            case 'hsv':
                result = autoLevelsHSV(pixels, output, numPixels, clipPercent, gamma, histogramBefore);
                break;
        }

        // Compute histogram after adjustment
        const histogramAfter = new Uint32Array(256);
        for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            const lum = Math.round(0.299 * output[idx] + 0.587 * output[idx + 1] + 0.114 * output[idx + 2]);
            histogramAfter[lum]++;
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: output.buffer,
                width,
                height,
                histogramBefore: histogramBefore.buffer,
                histogramAfter: histogramAfter.buffer,
                inputMin: result.inputMin,
                inputMax: result.inputMax,
                outputMin: result.outputMin,
                outputMax: result.outputMax,
                duration: (end - start).toFixed(2)
            }
        }, [output.buffer, histogramBefore.buffer, histogramAfter.buffer]);
    }
};

/**
 * Per-channel RGB auto levels
 */
function autoLevelsRGB(input, output, numPixels, clipPercent, gamma, histogramBefore) {
    // Build histograms for each channel
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);

    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        histR[input[idx]]++;
        histG[input[idx + 1]]++;
        histB[input[idx + 2]]++;

        // Also compute luminance histogram for display
        const lum = Math.round(0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]);
        histogramBefore[lum]++;
    }

    // Find clipped min/max for each channel
    const clipPixels = Math.floor(numPixels * clipPercent / 100);

    const rangeR = findClippedRange(histR, clipPixels);
    const rangeG = findClippedRange(histG, clipPixels);
    const rangeB = findClippedRange(histB, clipPixels);

    // Create lookup tables
    const lutR = createLUT(rangeR.min, rangeR.max, gamma);
    const lutG = createLUT(rangeG.min, rangeG.max, gamma);
    const lutB = createLUT(rangeB.min, rangeB.max, gamma);

    // Apply LUTs
    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        output[idx] = lutR[input[idx]];
        output[idx + 1] = lutG[input[idx + 1]];
        output[idx + 2] = lutB[input[idx + 2]];
        output[idx + 3] = input[idx + 3];
    }

    const avgMin = Math.round((rangeR.min + rangeG.min + rangeB.min) / 3);
    const avgMax = Math.round((rangeR.max + rangeG.max + rangeB.max) / 3);

    return { inputMin: avgMin, inputMax: avgMax, outputMin: 0, outputMax: 255 };
}

/**
 * Luminance-based auto levels (preserves color ratios)
 */
function autoLevelsLuminance(input, output, numPixels, clipPercent, gamma, histogramBefore) {
    // Build luminance histogram
    const histLum = new Uint32Array(256);

    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        const lum = Math.round(0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]);
        histLum[lum]++;
        histogramBefore[lum]++;
    }

    // Find clipped range
    const clipPixels = Math.floor(numPixels * clipPercent / 100);
    const range = findClippedRange(histLum, clipPixels);

    // Apply adjustment preserving color ratios
    const rangeSize = range.max - range.min;
    const scale = rangeSize > 0 ? 255 / rangeSize : 1;

    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        const r = input[idx];
        const g = input[idx + 1];
        const b = input[idx + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // New luminance
        let newLum = (lum - range.min) * scale;
        newLum = Math.pow(newLum / 255, 1 / gamma) * 255;
        newLum = Math.max(0, Math.min(255, newLum));

        // Scale RGB to match new luminance
        const ratio = lum > 0 ? newLum / lum : 1;

        output[idx] = clamp(r * ratio);
        output[idx + 1] = clamp(g * ratio);
        output[idx + 2] = clamp(b * ratio);
        output[idx + 3] = input[idx + 3];
    }

    return { inputMin: range.min, inputMax: range.max, outputMin: 0, outputMax: 255 };
}

/**
 * HSV Value-based auto levels
 */
function autoLevelsHSV(input, output, numPixels, clipPercent, gamma, histogramBefore) {
    // Build value (brightness) histogram
    const histV = new Uint32Array(256);

    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        const v = Math.max(input[idx], input[idx + 1], input[idx + 2]);
        histV[v]++;

        const lum = Math.round(0.299 * input[idx] + 0.587 * input[idx + 1] + 0.114 * input[idx + 2]);
        histogramBefore[lum]++;
    }

    // Find clipped range
    const clipPixels = Math.floor(numPixels * clipPercent / 100);
    const range = findClippedRange(histV, clipPixels);

    // Create LUT for value channel
    const lutV = createLUT(range.min, range.max, gamma);

    // Apply adjustment in HSV space
    for (let i = 0; i < numPixels; i++) {
        const idx = i * 4;
        const r = input[idx];
        const g = input[idx + 1];
        const b = input[idx + 2];

        // Convert to HSV
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        // Calculate new value
        const newV = lutV[max];

        // Scale RGB to new value
        if (max === 0) {
            output[idx] = newV;
            output[idx + 1] = newV;
            output[idx + 2] = newV;
        } else {
            const scale = newV / max;
            output[idx] = clamp(r * scale);
            output[idx + 1] = clamp(g * scale);
            output[idx + 2] = clamp(b * scale);
        }
        output[idx + 3] = input[idx + 3];
    }

    return { inputMin: range.min, inputMax: range.max, outputMin: 0, outputMax: 255 };
}

/**
 * Find clipped min/max range based on histogram
 */
function findClippedRange(histogram, clipPixels) {
    let sum = 0;
    let min = 0;
    let max = 255;

    // Find minimum with clipping
    for (let i = 0; i < 256; i++) {
        sum += histogram[i];
        if (sum > clipPixels) {
            min = i;
            break;
        }
    }

    // Find maximum with clipping
    sum = 0;
    for (let i = 255; i >= 0; i--) {
        sum += histogram[i];
        if (sum > clipPixels) {
            max = i;
            break;
        }
    }

    // Ensure min < max
    if (min >= max) {
        min = 0;
        max = 255;
    }

    return { min, max };
}

/**
 * Create lookup table for level adjustment
 */
function createLUT(min, max, gamma) {
    const lut = new Uint8Array(256);
    const range = max - min;

    if (range === 0) {
        for (let i = 0; i < 256; i++) lut[i] = i;
        return lut;
    }

    for (let i = 0; i < 256; i++) {
        let val = (i - min) / range;
        val = Math.max(0, Math.min(1, val));

        // Apply gamma correction
        val = Math.pow(val, 1 / gamma);

        lut[i] = Math.round(val * 255);
    }

    return lut;
}

function clamp(val) {
    return Math.max(0, Math.min(255, Math.round(val)));
}
