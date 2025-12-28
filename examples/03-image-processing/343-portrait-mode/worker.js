function isSkinTone(r, g, b) {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
    return y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

function boxBlur(data, width, height, radius) {
    const output = new Uint8ClampedArray(data);
    const size = radius * 2 + 1;
    const area = size * size;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let rSum = 0, gSum = 0, bSum = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const ny = Math.max(0, Math.min(height - 1, y + ky));
                    const nx = Math.max(0, Math.min(width - 1, x + kx));
                    const idx = (ny * width + nx) * 4;
                    rSum += data[idx];
                    gSum += data[idx + 1];
                    bSum += data[idx + 2];
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = rSum / area;
            output[idx + 1] = gSum / area;
            output[idx + 2] = bSum / area;
        }
    }
    return output;
}

self.onmessage = function(e) {
    const { imageData, blurRadius, edgeSensitivity } = e.data;
    const { width, height, data } = imageData;

    // Create subject mask based on skin detection and center weighting
    const mask = new Float32Array(width * height);
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const skinScore = isSkinTone(data[idx], data[idx + 1], data[idx + 2]) ? 1 : 0;

            // Center weighting
            const dx = (x - cx) / cx;
            const dy = (y - cy) / cy;
            const centerScore = 1 - Math.sqrt(dx * dx + dy * dy) * 0.7;

            // Combine scores
            mask[y * width + x] = Math.min(1, skinScore * 0.6 + Math.max(0, centerScore) * 0.4);
        }
    }

    // Smooth the mask
    for (let pass = 0; pass < 5; pass++) {
        const temp = new Float32Array(mask);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                temp[idx] = (
                    mask[idx - width - 1] + mask[idx - width] + mask[idx - width + 1] +
                    mask[idx - 1] + mask[idx] * 2 + mask[idx + 1] +
                    mask[idx + width - 1] + mask[idx + width] + mask[idx + width + 1]
                ) / 10;
            }
        }
        for (let i = 0; i < mask.length; i++) mask[i] = temp[i];
    }

    // Create blurred background
    const blurred = boxBlur(data, width, height, blurRadius);
    const output = new Uint8ClampedArray(data.length);

    // Blend based on mask
    const threshold = edgeSensitivity / 100;
    for (let i = 0; i < mask.length; i++) {
        const idx = i * 4;
        const blend = mask[i] > threshold ? 0 : 1 - mask[i] / threshold;

        output[idx] = data[idx] * (1 - blend) + blurred[idx] * blend;
        output[idx + 1] = data[idx + 1] * (1 - blend) + blurred[idx + 1] * blend;
        output[idx + 2] = data[idx + 2] * (1 - blend) + blurred[idx + 2] * blend;
        output[idx + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
