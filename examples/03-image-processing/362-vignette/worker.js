self.onmessage = function(e) {
    const { imageData, intensity, radius } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
            const vignette = 1 - Math.pow(Math.max(0, dist - radius) / (1 - radius), 2) * intensity;
            const idx = (y * width + x) * 4;
            output[idx] = data[idx] * vignette;
            output[idx + 1] = data[idx + 1] * vignette;
            output[idx + 2] = data[idx + 2] * vignette;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
