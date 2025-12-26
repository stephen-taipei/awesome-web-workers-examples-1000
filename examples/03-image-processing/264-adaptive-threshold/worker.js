/**
 * Adaptive Threshold Worker
 * Implements local thresholding for image binarization
 */

self.onmessage = function(e) {
    const { type, imageData, params } = e.data;

    switch (type) {
        case 'ADAPTIVE_THRESHOLD':
            processAdaptiveThreshold(imageData, params);
            break;

        case 'GLOBAL_THRESHOLD':
            processGlobalThreshold(imageData, params);
            break;
    }
};

function processAdaptiveThreshold(imageData, params) {
    const { blockSize, constant, method } = params;
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Convert to grayscale first
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }

    // Create output array
    const output = new Uint8ClampedArray(data.length);

    // Create integral image for mean method
    let integral = null;
    if (method === 'mean') {
        integral = createIntegralImage(gray, width, height);
    }

    // Create Gaussian kernel for gaussian method
    let gaussianKernel = null;
    if (method === 'gaussian') {
        gaussianKernel = createGaussianKernel(blockSize);
    }

    const halfBlock = Math.floor(blockSize / 2);
    const totalPixels = width * height;
    let processedPixels = 0;
    let lastProgress = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const pixelIdx = idx * 4;

            let threshold;

            if (method === 'mean') {
                threshold = getMeanThreshold(integral, x, y, width, height, halfBlock);
            } else {
                threshold = getGaussianThreshold(gray, x, y, width, height, halfBlock, gaussianKernel);
            }

            threshold -= constant;

            const value = gray[idx] > threshold ? 255 : 0;
            output[pixelIdx] = value;
            output[pixelIdx + 1] = value;
            output[pixelIdx + 2] = value;
            output[pixelIdx + 3] = 255;

            processedPixels++;
        }

        // Report progress every row
        const progress = Math.floor((y / height) * 100);
        if (progress > lastProgress) {
            lastProgress = progress;
            self.postMessage({
                type: 'PROGRESS',
                progress: progress
            });
        }
    }

    self.postMessage({
        type: 'RESULT',
        imageData: new ImageData(output, width, height)
    });
}

function createIntegralImage(gray, width, height) {
    const integral = new Float64Array(width * height);

    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            rowSum += gray[idx];

            if (y === 0) {
                integral[idx] = rowSum;
            } else {
                integral[idx] = integral[(y - 1) * width + x] + rowSum;
            }
        }
    }

    return integral;
}

function getMeanThreshold(integral, x, y, width, height, halfBlock) {
    const x1 = Math.max(0, x - halfBlock - 1);
    const y1 = Math.max(0, y - halfBlock - 1);
    const x2 = Math.min(width - 1, x + halfBlock);
    const y2 = Math.min(height - 1, y + halfBlock);

    const count = (x2 - x1) * (y2 - y1);

    let sum = integral[y2 * width + x2];

    if (x1 > 0) {
        sum -= integral[y2 * width + (x1 - 1)];
    }
    if (y1 > 0) {
        sum -= integral[(y1 - 1) * width + x2];
    }
    if (x1 > 0 && y1 > 0) {
        sum += integral[(y1 - 1) * width + (x1 - 1)];
    }

    return sum / count;
}

function createGaussianKernel(size) {
    const kernel = [];
    const sigma = size / 6;
    const half = Math.floor(size / 2);
    let sum = 0;

    for (let y = -half; y <= half; y++) {
        const row = [];
        for (let x = -half; x <= half; x++) {
            const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
            row.push(value);
            sum += value;
        }
        kernel.push(row);
    }

    // Normalize
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }

    return kernel;
}

function getGaussianThreshold(gray, x, y, width, height, halfBlock, kernel) {
    let sum = 0;
    let weightSum = 0;
    const kernelSize = halfBlock * 2 + 1;

    for (let ky = -halfBlock; ky <= halfBlock; ky++) {
        for (let kx = -halfBlock; kx <= halfBlock; kx++) {
            const px = Math.min(Math.max(0, x + kx), width - 1);
            const py = Math.min(Math.max(0, y + ky), height - 1);
            const weight = kernel[ky + halfBlock][kx + halfBlock];
            sum += gray[py * width + px] * weight;
            weightSum += weight;
        }
    }

    return sum / weightSum;
}

function processGlobalThreshold(imageData, params) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Convert to grayscale and calculate histogram
    const gray = new Uint8Array(width * height);
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        const value = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        gray[i] = value;
        histogram[value]++;
    }

    // Otsu's method to find optimal threshold
    const totalPixels = width * height;
    let sumTotal = 0;
    for (let i = 0; i < 256; i++) {
        sumTotal += i * histogram[i];
    }

    let sumBackground = 0;
    let weightBackground = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
        weightBackground += histogram[t];
        if (weightBackground === 0) continue;

        const weightForeground = totalPixels - weightBackground;
        if (weightForeground === 0) break;

        sumBackground += t * histogram[t];

        const meanBackground = sumBackground / weightBackground;
        const meanForeground = (sumTotal - sumBackground) / weightForeground;

        const variance = weightBackground * weightForeground * Math.pow(meanBackground - meanForeground, 2);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }

    // Apply threshold
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < width * height; i++) {
        const value = gray[i] > threshold ? 255 : 0;
        const idx = i * 4;
        output[idx] = value;
        output[idx + 1] = value;
        output[idx + 2] = value;
        output[idx + 3] = 255;
    }

    self.postMessage({
        type: 'GLOBAL_RESULT',
        imageData: new ImageData(output, width, height),
        threshold: threshold
    });
}
