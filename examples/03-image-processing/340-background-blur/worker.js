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
            output[idx + 3] = data[idx + 3];
        }
    }

    return output;
}

self.onmessage = function(e) {
    const { imageData, blurRadius, foregroundRange } = e.data;
    const { width, height, data } = imageData;

    // Create blurred version
    const blurred = boxBlur(data, width, height, blurRadius);
    const output = new Uint8ClampedArray(data.length);

    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const foregroundDist = maxDist * foregroundRange;

    // Blend based on distance from center (simulating depth)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Blend factor: 0 = original (foreground), 1 = blurred (background)
            let blend = 0;
            if (dist > foregroundDist) {
                blend = Math.min(1, (dist - foregroundDist) / (maxDist - foregroundDist));
            }

            output[idx] = data[idx] * (1 - blend) + blurred[idx] * blend;
            output[idx + 1] = data[idx + 1] * (1 - blend) + blurred[idx + 1] * blend;
            output[idx + 2] = data[idx + 2] * (1 - blend) + blurred[idx + 2] * blend;
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
