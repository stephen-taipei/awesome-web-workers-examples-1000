self.onmessage = function(e) {
    const { imageData, spacing, opacity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        const isScanline = y % spacing === 0;

        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            if (isScanline) {
                output[idx] = data[idx] * (1 - opacity);
                output[idx + 1] = data[idx + 1] * (1 - opacity);
                output[idx + 2] = data[idx + 2] * (1 - opacity);
            }
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
