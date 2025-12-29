self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;
    const samples = strength;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;
            const dx = x - cx, dy = y - cy;

            for (let i = 0; i < samples; i++) {
                const scale = 1 - (i / samples) * 0.3;
                const sx = Math.round(cx + dx * scale);
                const sy = Math.round(cy + dy * scale);

                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / count;
            output[idx + 1] = g / count;
            output[idx + 2] = b / count;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
