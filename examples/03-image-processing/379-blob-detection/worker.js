self.onmessage = function(e) {
    const { imageData, threshold, minSize } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Apply Laplacian of Gaussian at multiple scales
    const scales = [1, 2, 4, 8];
    const responses = [];

    for (const sigma of scales) {
        const log = applyLoG(gray, width, height, sigma);
        responses.push({ sigma, log });
    }

    // Find local maxima across scale space
    const blobs = [];

    for (let s = 0; s < responses.length; s++) {
        const { sigma, log } = responses[s];

        for (let y = minSize; y < height - minSize; y++) {
            for (let x = minSize; x < width - minSize; x++) {
                const idx = y * width + x;
                const val = Math.abs(log[idx]);

                if (val < threshold) continue;

                // Check if local maximum in space
                let isMax = true;
                for (let dy = -1; dy <= 1 && isMax; dy++) {
                    for (let dx = -1; dx <= 1 && isMax; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        if (Math.abs(log[(y + dy) * width + (x + dx)]) > val) {
                            isMax = false;
                        }
                    }
                }

                // Check neighboring scales
                if (isMax && s > 0) {
                    if (Math.abs(responses[s - 1].log[idx]) > val) isMax = false;
                }
                if (isMax && s < responses.length - 1) {
                    if (Math.abs(responses[s + 1].log[idx]) > val) isMax = false;
                }

                if (isMax) {
                    blobs.push({ x, y, r: sigma * Math.sqrt(2) * 2 });
                }
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw blobs as circles
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];

    for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        const color = colors[i % colors.length];
        const r = Math.max(3, Math.round(blob.r));

        // Draw circle outline
        for (let angle = 0; angle < 360; angle += 5) {
            const rad = angle * Math.PI / 180;
            const px = Math.round(blob.x + r * Math.cos(rad));
            const py = Math.round(blob.y + r * Math.sin(rad));

            if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        blobs: blobs.length
    });
};

function applyLoG(gray, width, height, sigma) {
    const result = new Float32Array(width * height);
    const kernelSize = Math.ceil(sigma * 6) | 1;
    const half = Math.floor(kernelSize / 2);

    // Create LoG kernel
    const kernel = [];
    for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
            const r2 = x * x + y * y;
            const s2 = sigma * sigma;
            const t = (r2 - 2 * s2) / (s2 * s2);
            kernel.push(t * Math.exp(-r2 / (2 * s2)));
        }
    }

    // Normalize kernel
    const sum = kernel.reduce((a, b) => a + b, 0);
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] -= sum / kernel.length;
    }

    // Apply convolution
    for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
            let val = 0;
            let ki = 0;
            for (let ky = -half; ky <= half; ky++) {
                for (let kx = -half; kx <= half; kx++) {
                    val += gray[(y + ky) * width + (x + kx)] * kernel[ki++];
                }
            }
            result[y * width + x] = val * sigma * sigma; // Scale normalization
        }
    }

    return result;
}
