self.onmessage = function(e) {
    const { imageData, satBoost } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            let r = data[idx], g = data[idx + 1], b = data[idx + 2];

            // Increase contrast
            r = ((r / 255 - 0.5) * 1.2 + 0.5) * 255;
            g = ((g / 255 - 0.5) * 1.2 + 0.5) * 255;
            b = ((b / 255 - 0.5) * 1.2 + 0.5) * 255;

            // Boost saturation
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * (1 + satBoost);
            g = gray + (g - gray) * (1 + satBoost);
            b = gray + (b - gray) * (1 + satBoost);

            // Vignette
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
            const vignette = 1 - dist * dist * 0.5;

            output[idx] = Math.max(0, Math.min(255, r * vignette));
            output[idx + 1] = Math.max(0, Math.min(255, g * vignette));
            output[idx + 2] = Math.max(0, Math.min(255, b * vignette));
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
