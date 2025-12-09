self.onmessage = function(e) {
    const { command, imageData, width, height, strength, radius, gamma, saturation } = e.data;

    if (command === 'apply') {
        const start = performance.now();

        const pixels = new Uint8ClampedArray(imageData);
        const output = new Uint8ClampedArray(pixels.length);

        self.postMessage({ type: 'status', data: 'Computing luminance...' });

        // Step 1: Extract luminance channel
        const luminance = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const idx = i * 4;
            luminance[i] = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        }

        self.postMessage({ type: 'status', data: 'Computing local mean (box blur)...' });

        // Step 2: Compute local mean using box blur (approximation of Gaussian)
        const localMean = boxBlur(luminance, width, height, radius);

        self.postMessage({ type: 'status', data: 'Computing local contrast...' });

        // Step 3: Compute local standard deviation for contrast
        const localContrast = computeLocalContrast(luminance, localMean, width, height, radius);

        self.postMessage({ type: 'status', data: 'Applying HDR tone mapping...' });

        // Step 4: Apply local contrast enhancement and tone mapping
        const totalPixels = width * height;

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];

            const lum = luminance[i];
            const mean = localMean[i];
            const contrast = localContrast[i];

            // Local contrast enhancement
            // Enhance details by boosting difference from local mean
            let newLum = lum;

            if (contrast > 1) {
                // Normalize local contrast
                const detail = (lum - mean) / contrast;
                // Boost detail based on strength
                const boostedDetail = detail * (1 + strength * 2);
                newLum = mean + boostedDetail * contrast;
            }

            // Apply gamma correction
            newLum = 255 * Math.pow(newLum / 255, 1 / gamma);

            // Reinhard-style tone mapping for HDR compression
            const mapped = newLum / (1 + newLum / 255);
            newLum = mapped * (1 + mapped / (255 * 255));

            // Clamp
            newLum = Math.max(0, Math.min(255, newLum));

            // Apply luminance change to RGB while preserving color ratios
            const lumRatio = lum > 0 ? newLum / lum : 1;

            let newR = r * lumRatio;
            let newG = g * lumRatio;
            let newB = b * lumRatio;

            // Apply saturation boost
            const gray = 0.299 * newR + 0.587 * newG + 0.114 * newB;
            newR = gray + (newR - gray) * saturation;
            newG = gray + (newG - gray) * saturation;
            newB = gray + (newB - gray) * saturation;

            output[idx] = clamp(newR);
            output[idx + 1] = clamp(newG);
            output[idx + 2] = clamp(newB);
            output[idx + 3] = a;

            // Progress update
            if (i % Math.floor(totalPixels / 10) === 0) {
                self.postMessage({ type: 'progress', data: Math.round((i / totalPixels) * 100) });
            }
        }

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                imageData: output.buffer,
                width,
                height,
                duration: (end - start).toFixed(2)
            }
        }, [output.buffer]);
    }
};

function clamp(val) {
    return Math.max(0, Math.min(255, Math.round(val)));
}

// Optimized box blur using integral image (summed area table)
function boxBlur(input, width, height, radius) {
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

    // Compute box blur using integral image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - radius);
            const y1 = Math.max(0, y - radius);
            const x2 = Math.min(width - 1, x + radius);
            const y2 = Math.min(height - 1, y + radius);

            const area = (x2 - x1 + 1) * (y2 - y1 + 1);

            // Sum = D - B - C + A (where A, B, C, D are corners of the box)
            let sum = integral[y2 * width + x2];
            if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
            if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
            if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

            output[y * width + x] = sum / area;
        }
    }

    return output;
}

// Compute local standard deviation for contrast estimation
function computeLocalContrast(luminance, mean, width, height, radius) {
    const output = new Float32Array(width * height);

    // Create integral image of squared luminance
    const integralSq = new Float64Array(width * height);

    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            const val = luminance[y * width + x];
            rowSum += val * val;
            const above = y > 0 ? integralSq[(y - 1) * width + x] : 0;
            integralSq[y * width + x] = rowSum + above;
        }
    }

    // Compute local variance using E[X^2] - E[X]^2
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - radius);
            const y1 = Math.max(0, y - radius);
            const x2 = Math.min(width - 1, x + radius);
            const y2 = Math.min(height - 1, y + radius);

            const area = (x2 - x1 + 1) * (y2 - y1 + 1);

            let sumSq = integralSq[y2 * width + x2];
            if (x1 > 0) sumSq -= integralSq[y2 * width + (x1 - 1)];
            if (y1 > 0) sumSq -= integralSq[(y1 - 1) * width + x2];
            if (x1 > 0 && y1 > 0) sumSq += integralSq[(y1 - 1) * width + (x1 - 1)];

            const meanSq = sumSq / area;
            const localMean = mean[y * width + x];
            const variance = meanSq - localMean * localMean;

            output[y * width + x] = Math.sqrt(Math.max(0, variance));
        }
    }

    return output;
}
