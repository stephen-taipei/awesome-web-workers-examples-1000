self.onmessage = function(e) {
    const { imageData, threshold, radius, intensity } = e.data;
    const startTime = performance.now();

    try {
        // Step 1: Extract bright areas (Thresholding)
        self.postMessage({ type: 'progress', progress: 0.1, status: '提取高亮區域' });
        const brightData = extractHighlights(imageData, threshold);

        // Step 2: Blur the bright areas (Gaussian Blur)
        self.postMessage({ type: 'progress', progress: 0.3, status: '模糊處理' });
        const blurredData = gaussianBlur(brightData, radius, imageData.width, imageData.height);

        // Step 3: Composite (Add) blurred highlights back to original image
        self.postMessage({ type: 'progress', progress: 0.8, status: '圖像合成' });
        const resultImageData = composite(imageData, blurredData, intensity);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: resultImageData,
            duration: endTime - startTime
        });
    } catch (error) {
        console.error(error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

function extractHighlights(imageData, threshold) {
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        // Simple luminance or just check if any channel > threshold
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        if (brightness > threshold) {
            result[i] = r;
            result[i+1] = g;
            result[i+2] = b;
            result[i+3] = a;
        } else {
            // Below threshold, set to black (transparent black if using alpha composition,
            // but we use additive blending so black is fine)
            result[i] = 0;
            result[i+1] = 0;
            result[i+2] = 0;
            result[i+3] = a; // Keep alpha? Or 0? If we add, 0 is better if we respect alpha.
                             // But here we are producing a buffer for blur.
        }
    }
    return result;
}

function gaussianBlur(dataArray, radius, width, height) {
    // Standard separable Gaussian blur
    // 1D Kernel generation
    const sigma = radius / 3;
    const kernelSize = Math.ceil(radius * 2 + 1);
    const kernel = new Float32Array(kernelSize);
    const half = Math.floor(kernelSize / 2);

    let sum = 0;
    for (let i = 0; i < kernelSize; i++) {
        const x = i - half;
        const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = weight;
        sum += weight;
    }
    // Normalize
    for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

    // Temp buffer
    const temp = new Uint8ClampedArray(dataArray.length);
    const result = new Uint8ClampedArray(dataArray.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            for (let k = 0; k < kernelSize; k++) {
                const offset = k - half;
                const px = Math.min(width - 1, Math.max(0, x + offset));
                const idx = (y * width + px) * 4;
                const w = kernel[k];

                r += dataArray[idx] * w;
                g += dataArray[idx+1] * w;
                b += dataArray[idx+2] * w;
                a += dataArray[idx+3] * w;
            }

            const idx = (y * width + x) * 4;
            temp[idx] = r;
            temp[idx+1] = g;
            temp[idx+2] = b;
            temp[idx+3] = a;
        }
    }

    self.postMessage({ type: 'progress', progress: 0.5, status: '模糊處理 (垂直)' });

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;

            for (let k = 0; k < kernelSize; k++) {
                const offset = k - half;
                const py = Math.min(height - 1, Math.max(0, y + offset));
                const idx = (py * width + x) * 4;
                const w = kernel[k];

                r += temp[idx] * w;
                g += temp[idx+1] * w;
                b += temp[idx+2] * w;
                a += temp[idx+3] * w;
            }

            const idx = (y * width + x) * 4;
            result[idx] = r;
            result[idx+1] = g;
            result[idx+2] = b;
            result[idx+3] = a;
        }
    }

    return result;
}

function composite(originalImageData, blurredData, intensity) {
    const width = originalImageData.width;
    const height = originalImageData.height;
    const src = originalImageData.data;
    const dest = new Uint8ClampedArray(src.length);

    for (let i = 0; i < src.length; i += 4) {
        // Screen blend mode or Additive?
        // Glow usually uses additive (Linear Dodge) or Screen.
        // Let's use Additive with intensity

        dest[i] = Math.min(255, src[i] + blurredData[i] * intensity);
        dest[i+1] = Math.min(255, src[i+1] + blurredData[i+1] * intensity);
        dest[i+2] = Math.min(255, src[i+2] + blurredData[i+2] * intensity);
        dest[i+3] = src[i+3]; // Keep original alpha
    }

    return new ImageData(dest, width, height);
}
