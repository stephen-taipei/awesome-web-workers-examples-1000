/**
 * Dark Channel Prior Dehazing Algorithm
 * Based on the paper: "Single Image Haze Removal Using Dark Channel Prior"
 * by He, Sun, and Tang (CVPR 2009)
 */

self.onmessage = function(e) {
    const { command, imageData, width, height, patchSize, omega, t0 } = e.data;

    if (command === 'dehaze') {
        const start = performance.now();

        const pixels = new Uint8ClampedArray(imageData);
        const output = new Uint8ClampedArray(pixels.length);

        // Normalize image to [0, 1]
        const normalized = new Float32Array(width * height * 3);
        for (let i = 0; i < width * height; i++) {
            normalized[i * 3] = pixels[i * 4] / 255;
            normalized[i * 3 + 1] = pixels[i * 4 + 1] / 255;
            normalized[i * 3 + 2] = pixels[i * 4 + 2] / 255;
        }

        self.postMessage({ type: 'status', data: 'Computing dark channel...' });

        // Step 1: Compute dark channel
        const darkChannel = computeDarkChannel(normalized, width, height, patchSize);

        self.postMessage({ type: 'status', data: 'Estimating atmospheric light...' });

        // Step 2: Estimate atmospheric light
        const atmosphericLight = estimateAtmosphericLight(normalized, darkChannel, width, height);

        self.postMessage({ type: 'status', data: 'Estimating transmission map...' });

        // Step 3: Estimate transmission map
        const transmission = estimateTransmission(normalized, atmosphericLight, width, height, patchSize, omega);

        self.postMessage({ type: 'status', data: 'Refining transmission (guided filter)...' });

        // Step 4: Refine transmission using guided filter (simplified)
        const refinedTransmission = guidedFilter(transmission, normalized, width, height, patchSize);

        self.postMessage({ type: 'status', data: 'Recovering scene radiance...' });

        // Step 5: Recover scene radiance
        for (let i = 0; i < width * height; i++) {
            const t = Math.max(refinedTransmission[i], t0);

            for (let c = 0; c < 3; c++) {
                const I = normalized[i * 3 + c];
                const A = atmosphericLight[c];

                // J(x) = (I(x) - A) / t(x) + A
                let J = (I - A) / t + A;

                // Clamp and convert back to 0-255
                J = Math.max(0, Math.min(1, J));
                output[i * 4 + c] = Math.round(J * 255);
            }
            output[i * 4 + 3] = pixels[i * 4 + 3]; // Preserve alpha
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: output.buffer,
                width,
                height,
                darkChannel: darkChannel.buffer,
                transmission: refinedTransmission.buffer,
                atmosphericLight: atmosphericLight.map(v => Math.round(v * 255)),
                duration: (end - start).toFixed(2)
            }
        }, [output.buffer, darkChannel.buffer, refinedTransmission.buffer]);
    }
};

/**
 * Compute dark channel: minimum of RGB in local patch
 */
function computeDarkChannel(image, width, height, patchSize) {
    const darkChannel = new Float32Array(width * height);
    const halfPatch = Math.floor(patchSize / 2);

    // First pass: compute per-pixel minimum across RGB
    const pixelMin = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        pixelMin[i] = Math.min(
            image[i * 3],
            image[i * 3 + 1],
            image[i * 3 + 2]
        );
    }

    // Second pass: compute minimum in local patch using sliding window
    // Using min-filter with O(1) complexity per pixel
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let minVal = 1;

            const y1 = Math.max(0, y - halfPatch);
            const y2 = Math.min(height - 1, y + halfPatch);
            const x1 = Math.max(0, x - halfPatch);
            const x2 = Math.min(width - 1, x + halfPatch);

            for (let py = y1; py <= y2; py++) {
                for (let px = x1; px <= x2; px++) {
                    minVal = Math.min(minVal, pixelMin[py * width + px]);
                }
            }

            darkChannel[y * width + x] = minVal;
        }
    }

    return darkChannel;
}

/**
 * Estimate atmospheric light from brightest pixels in dark channel
 */
function estimateAtmosphericLight(image, darkChannel, width, height) {
    // Find top 0.1% brightest pixels in dark channel
    const numPixels = width * height;
    const topCount = Math.max(1, Math.floor(numPixels * 0.001));

    // Create array of indices sorted by dark channel value
    const indices = [];
    for (let i = 0; i < numPixels; i++) {
        indices.push({ idx: i, val: darkChannel[i] });
    }
    indices.sort((a, b) => b.val - a.val);

    // Find the brightest pixel among top dark channel pixels
    let maxIntensity = 0;
    let bestIdx = 0;

    for (let i = 0; i < topCount; i++) {
        const idx = indices[i].idx;
        const intensity = image[idx * 3] + image[idx * 3 + 1] + image[idx * 3 + 2];
        if (intensity > maxIntensity) {
            maxIntensity = intensity;
            bestIdx = idx;
        }
    }

    return [
        image[bestIdx * 3],
        image[bestIdx * 3 + 1],
        image[bestIdx * 3 + 2]
    ];
}

/**
 * Estimate transmission map
 */
function estimateTransmission(image, A, width, height, patchSize, omega) {
    // Normalize image by atmospheric light
    const normalized = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        for (let c = 0; c < 3; c++) {
            normalized[i * 3 + c] = image[i * 3 + c] / A[c];
        }
    }

    // Compute dark channel of normalized image
    const darkNorm = computeDarkChannel(normalized, width, height, patchSize);

    // Transmission: t(x) = 1 - omega * dark(I/A)
    const transmission = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        transmission[i] = 1 - omega * darkNorm[i];
    }

    return transmission;
}

/**
 * Simplified guided filter for transmission refinement
 */
function guidedFilter(p, I, width, height, r) {
    const eps = 0.001;
    const numPixels = width * height;

    // Convert guide to grayscale
    const gray = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
        gray[i] = 0.299 * I[i * 3] + 0.587 * I[i * 3 + 1] + 0.114 * I[i * 3 + 2];
    }

    // Compute means using box filter
    const meanI = boxFilter(gray, width, height, r);
    const meanP = boxFilter(p, width, height, r);

    // Compute correlations
    const IP = new Float32Array(numPixels);
    const II = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
        IP[i] = gray[i] * p[i];
        II[i] = gray[i] * gray[i];
    }

    const meanIP = boxFilter(IP, width, height, r);
    const meanII = boxFilter(II, width, height, r);

    // Compute coefficients
    const a = new Float32Array(numPixels);
    const b = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
        const covIP = meanIP[i] - meanI[i] * meanP[i];
        const varI = meanII[i] - meanI[i] * meanI[i];
        a[i] = covIP / (varI + eps);
        b[i] = meanP[i] - a[i] * meanI[i];
    }

    // Compute mean of coefficients
    const meanA = boxFilter(a, width, height, r);
    const meanB = boxFilter(b, width, height, r);

    // Output
    const q = new Float32Array(numPixels);
    for (let i = 0; i < numPixels; i++) {
        q[i] = meanA[i] * gray[i] + meanB[i];
    }

    return q;
}

/**
 * Box filter using integral image
 */
function boxFilter(input, width, height, r) {
    const output = new Float32Array(width * height);

    // Create integral image
    const integral = new Float64Array(width * height);
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += input[y * width + x];
            const above = y > 0 ? integral[(y - 1) * width + x] : 0;
            integral[y * width + x] = rowSum + above;
        }
    }

    // Compute box filter
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - r);
            const y1 = Math.max(0, y - r);
            const x2 = Math.min(width - 1, x + r);
            const y2 = Math.min(height - 1, y + r);

            const area = (x2 - x1 + 1) * (y2 - y1 + 1);

            let sum = integral[y2 * width + x2];
            if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
            if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
            if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

            output[y * width + x] = sum / area;
        }
    }

    return output;
}
