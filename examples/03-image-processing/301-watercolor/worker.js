self.onmessage = function(e) {
    const { imageData, brushSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Median filter for watercolor effect
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixels = [];

            for (let dy = -brushSize; dy <= brushSize; dy++) {
                for (let dx = -brushSize; dx <= brushSize; dx++) {
                    const sx = Math.min(width - 1, Math.max(0, x + dx));
                    const sy = Math.min(height - 1, Math.max(0, y + dy));
                    const idx = (sy * width + sx) * 4;
                    pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }

            // Sort by luminance and take median
            pixels.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
            const mid = pixels[Math.floor(pixels.length / 2)];

            const idx = (y * width + x) * 4;
            output[idx] = mid[0];
            output[idx + 1] = mid[1];
            output[idx + 2] = mid[2];
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
