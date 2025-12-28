self.onmessage = function(e) {
    const { imageData, length, angle } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = -length / 2; i <= length / 2; i++) {
                const sx = Math.round(x + dx * i);
                const sy = Math.round(y + dy * i);
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
