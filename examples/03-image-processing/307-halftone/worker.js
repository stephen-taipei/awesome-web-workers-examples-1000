self.onmessage = function(e) {
    const { imageData, dotSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Fill with white
    output.fill(255);

    for (let ty = 0; ty < height; ty += dotSize) {
        for (let tx = 0; tx < width; tx += dotSize) {
            // Get average brightness
            let sum = 0, count = 0;
            for (let y = ty; y < ty + dotSize && y < height; y++) {
                for (let x = tx; x < tx + dotSize && x < width; x++) {
                    const idx = (y * width + x) * 4;
                    sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    count++;
                }
            }

            const brightness = sum / count / 255;
            const radius = (1 - brightness) * dotSize / 2;
            const cx = tx + dotSize / 2;
            const cy = ty + dotSize / 2;

            // Draw dot
            for (let y = ty; y < ty + dotSize && y < height; y++) {
                for (let x = tx; x < tx + dotSize && x < width; x++) {
                    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    if (dist <= radius) {
                        const idx = (y * width + x) * 4;
                        output[idx] = 0;
                        output[idx + 1] = 0;
                        output[idx + 2] = 0;
                    }
                }
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
