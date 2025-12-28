self.onmessage = function(e) {
    const { imageData, offset } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Red channel shifted left
            const rx = Math.max(0, x - offset);
            const ridx = (y * width + rx) * 4;
            output[idx] = data[ridx];

            // Green channel stays
            output[idx + 1] = data[idx + 1];

            // Blue channel shifted right
            const bx = Math.min(width - 1, x + offset);
            const bidx = (y * width + bx) * 4;
            output[idx + 2] = data[bidx + 2];

            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
