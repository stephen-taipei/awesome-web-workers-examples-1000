self.onmessage = function(e) {
    const { imageData, radius } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Create hexagonal kernel for bokeh effect
    const kernel = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
                kernel.push({ dx, dy, weight: 1 });
            }
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, total = 0;

            for (const k of kernel) {
                const sx = x + k.dx, sy = y + k.dy;
                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    // Emphasize bright pixels for bokeh
                    const lum = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                    const w = 1 + (lum / 255) * 2;
                    r += data[idx] * w;
                    g += data[idx + 1] * w;
                    b += data[idx + 2] * w;
                    total += w;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / total;
            output[idx + 1] = g / total;
            output[idx + 2] = b / total;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
