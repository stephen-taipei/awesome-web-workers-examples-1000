self.onmessage = function(e) {
    const { imageData, focus, blurRadius } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const focusY = height * focus;
    const bandHeight = height * 0.15;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dist = Math.abs(y - focusY);
            const blurAmount = Math.min(1, Math.max(0, (dist - bandHeight) / bandHeight));
            const radius = Math.floor(blurRadius * blurAmount);

            if (radius <= 0) {
                const idx = (y * width + x) * 4;
                output[idx] = data[idx];
                output[idx + 1] = data[idx + 1];
                output[idx + 2] = data[idx + 2];
                output[idx + 3] = data[idx + 3];
            } else {
                let r = 0, g = 0, b = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const sx = x + dx, sy = y + dy;
                        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                            const idx = (sy * width + sx) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            count++;
                        }
                    }
                }
                const idx = (y * width + x) * 4;
                output[idx] = r / count;
                output[idx + 1] = g / count;
                output[idx + 2] = b / count;
                output[idx + 3] = data[idx + 3];
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
