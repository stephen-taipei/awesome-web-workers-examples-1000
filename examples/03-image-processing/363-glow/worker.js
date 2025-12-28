self.onmessage = function(e) {
    const { imageData, intensity, radius } = e.data;
    const { width, height, data } = imageData;
    const blurred = gaussianBlur(data, width, height, radius);
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        output[i] = Math.min(255, data[i] + blurred[i] * intensity);
        output[i + 1] = Math.min(255, data[i + 1] + blurred[i + 1] * intensity);
        output[i + 2] = Math.min(255, data[i + 2] + blurred[i + 2] * intensity);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};

function gaussianBlur(data, width, height, radius) {
    const kernel = createGaussianKernel(radius);
    const temp = new Uint8ClampedArray(data.length);
    const output = new Uint8ClampedArray(data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, w = 0;
            for (let k = -radius; k <= radius; k++) {
                const px = Math.min(Math.max(x + k, 0), width - 1);
                const idx = (y * width + px) * 4;
                const weight = kernel[k + radius];
                r += data[idx] * weight;
                g += data[idx + 1] * weight;
                b += data[idx + 2] * weight;
                w += weight;
            }
            const idx = (y * width + x) * 4;
            temp[idx] = r / w;
            temp[idx + 1] = g / w;
            temp[idx + 2] = b / w;
            temp[idx + 3] = data[idx + 3];
        }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, w = 0;
            for (let k = -radius; k <= radius; k++) {
                const py = Math.min(Math.max(y + k, 0), height - 1);
                const idx = (py * width + x) * 4;
                const weight = kernel[k + radius];
                r += temp[idx] * weight;
                g += temp[idx + 1] * weight;
                b += temp[idx + 2] * weight;
                w += weight;
            }
            const idx = (y * width + x) * 4;
            output[idx] = r / w;
            output[idx + 1] = g / w;
            output[idx + 2] = b / w;
            output[idx + 3] = temp[idx + 3];
        }
    }

    return output;
}

function createGaussianKernel(radius) {
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    const sigma = radius / 3;
    let sum = 0;
    for (let i = 0; i < size; i++) {
        const x = i - radius;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }
    for (let i = 0; i < size; i++) kernel[i] /= sum;
    return kernel;
}
