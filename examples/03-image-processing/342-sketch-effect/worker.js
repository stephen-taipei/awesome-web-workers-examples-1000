self.onmessage = function(e) {
    const { imageData, blurRadius } = e.data;
    const startTime = performance.now();

    // 1. Convert to Grayscale
    const grayData = toGrayscale(imageData);
    self.postMessage({ type: 'progress', data: 25 });

    // 2. Invert Grayscale
    const invertedData = invert(grayData);
    self.postMessage({ type: 'progress', data: 50 });

    // 3. Apply Gaussian Blur to Inverted
    const blurredInvertedData = gaussianBlur(invertedData, blurRadius);
    self.postMessage({ type: 'progress', data: 75 });

    // 4. Color Dodge Blend (Grayscale + Blurred Inverted)
    const resultData = colorDodge(grayData, blurredInvertedData);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function toGrayscale(imageData) {
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        result[i] = avg;
        result[i + 1] = avg;
        result[i + 2] = avg;
        result[i + 3] = data[i + 3];
    }
    return new ImageData(result, imageData.width, imageData.height);
}

function invert(imageData) {
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        result[i] = 255 - data[i];
        result[i + 1] = 255 - data[i + 1];
        result[i + 2] = 255 - data[i + 2];
        result[i + 3] = data[i + 3];
    }
    return new ImageData(result, imageData.width, imageData.height);
}

function gaussianBlur(imageData, radius) {
    // A simplified Gaussian blur (box blur approximations) can be used for performance,
    // but here is a separable Gaussian blur for quality.
    // For sketch effect, we often need a strong blur.

    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempBuffer = new Uint8ClampedArray(data.length);
    const resultBuffer = new Uint8ClampedArray(data.length);

    // Sigma approximation
    const sigma = radius / 2;
    const kernel = generateGaussianKernel(radius, sigma);
    const kSize = kernel.length;
    const kMid = Math.floor(kSize / 2);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, a = 0;
            // Since it's grayscale/inverted, R=G=B, so we only process R (and Alpha)
            // But wait, the previous step produced RGB channels equal.

            for (let k = 0; k < kSize; k++) {
                const px = Math.min(Math.max(x + k - kMid, 0), width - 1);
                const idx = (y * width + px) * 4;
                r += data[idx] * kernel[k];
                a += data[idx + 3] * kernel[k]; // Blur alpha too? Usually alpha is 255.
            }

            const idx = (y * width + x) * 4;
            tempBuffer[idx] = r;
            tempBuffer[idx+1] = r;
            tempBuffer[idx+2] = r;
            tempBuffer[idx+3] = a; // Or just data[idx+3]
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0;

            for (let k = 0; k < kSize; k++) {
                const py = Math.min(Math.max(y + k - kMid, 0), height - 1);
                const idx = (py * width + x) * 4;
                r += tempBuffer[idx] * kernel[k];
            }

            const idx = (y * width + x) * 4;
            resultBuffer[idx] = r;
            resultBuffer[idx+1] = r;
            resultBuffer[idx+2] = r;
            resultBuffer[idx+3] = data[idx+3];
        }
    }

    return new ImageData(resultBuffer, width, height);
}

function generateGaussianKernel(radius, sigma) {
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    let sum = 0;
    const mid = Math.floor(size / 2);

    for (let i = 0; i < size; i++) {
        const x = i - mid;
        const val = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = val;
        sum += val;
    }

    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

function colorDodge(bottom, top) {
    const width = bottom.width;
    const height = bottom.height;
    const bData = bottom.data;
    const tData = top.data;
    const outputBuffer = new Uint8ClampedArray(bData.length);

    for (let i = 0; i < bData.length; i += 4) {
        // Color Dodge formula: min(Base / (1 - Blend), 255)
        // Note: Blend is normalized 0-1.
        // If Blend = 1 (255), result is 255.

        // Optimized integer math:
        // Result = Base / ((255 - Blend) / 255) = (Base * 255) / (255 - Blend)

        const base = bData[i];
        const blend = tData[i];

        let val;
        if (blend === 255) {
            val = 255;
        } else {
            val = Math.min(255, (base * 255) / (255 - blend));
        }

        outputBuffer[i] = val;
        outputBuffer[i+1] = val;
        outputBuffer[i+2] = val;
        outputBuffer[i+3] = bData[i+3];
    }

    return new ImageData(outputBuffer, width, height);
}
