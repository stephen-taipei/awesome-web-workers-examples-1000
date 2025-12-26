self.onmessage = function(e) {
    const { imageData, pixelSize } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let ty = 0; ty < height; ty += pixelSize) {
        for (let tx = 0; tx < width; tx += pixelSize) {
            // Sample center pixel
            const cx = Math.min(tx + Math.floor(pixelSize / 2), width - 1);
            const cy = Math.min(ty + Math.floor(pixelSize / 2), height - 1);
            const cIdx = (cy * width + cx) * 4;

            const r = data[cIdx];
            const g = data[cIdx + 1];
            const b = data[cIdx + 2];

            // Fill block with sampled color
            for (let y = ty; y < ty + pixelSize && y < height; y++) {
                for (let x = tx; x < tx + pixelSize && x < width; x++) {
                    const idx = (y * width + x) * 4;
                    output[idx] = r;
                    output[idx + 1] = g;
                    output[idx + 2] = b;
                    output[idx + 3] = 255;
                }
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
