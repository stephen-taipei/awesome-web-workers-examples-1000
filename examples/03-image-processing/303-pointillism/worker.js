self.onmessage = function(e) {
    const { imageData, dotSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Fill with white background
    output.fill(255);

    // Sample points and draw dots
    for (let y = 0; y < height; y += dotSize) {
        for (let x = 0; x < width; x += dotSize) {
            // Get average color in region
            let r = 0, g = 0, b = 0, count = 0;
            for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
                for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            // Draw circular dot
            const cx = x + dotSize / 2;
            const cy = y + dotSize / 2;
            const radius = dotSize / 2 - 0.5;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy <= radius * radius) {
                        const px = Math.round(cx + dx);
                        const py = Math.round(cy + dy);
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const idx = (py * width + px) * 4;
                            output[idx] = r;
                            output[idx + 1] = g;
                            output[idx + 2] = b;
                            output[idx + 3] = 255;
                        }
                    }
                }
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
