self.onmessage = function(e) {
    const { imageData, offset } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(cx * cx + cy * cy);
            const shift = Math.floor(offset * dist);

            // Red channel - shift outward
            const rx = Math.min(width - 1, Math.max(0, x + Math.sign(dx) * shift));
            const ry = Math.min(height - 1, Math.max(0, y + Math.sign(dy) * shift));
            const rIdx = (ry * width + rx) * 4;

            // Blue channel - shift inward
            const bx = Math.min(width - 1, Math.max(0, x - Math.sign(dx) * shift));
            const by = Math.min(height - 1, Math.max(0, y - Math.sign(dy) * shift));
            const bIdx = (by * width + bx) * 4;

            // Green stays in place
            const idx = (y * width + x) * 4;

            output[idx] = data[rIdx];
            output[idx + 1] = data[idx + 1];
            output[idx + 2] = data[bIdx + 2];
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
