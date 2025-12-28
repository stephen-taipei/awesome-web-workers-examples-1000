self.onmessage = function(e) {
    const { imageData, distance, angle } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const rad = angle * Math.PI / 180;
    const offsetX = Math.round(Math.cos(rad) * distance);
    const offsetY = Math.round(Math.sin(rad) * distance);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Red channel shifted in one direction
            const rX = Math.max(0, Math.min(width - 1, x - offsetX));
            const rY = Math.max(0, Math.min(height - 1, y - offsetY));
            const rIdx = (rY * width + rX) * 4;

            // Green channel stays in place
            const gIdx = idx;

            // Blue channel shifted in opposite direction
            const bX = Math.max(0, Math.min(width - 1, x + offsetX));
            const bY = Math.max(0, Math.min(height - 1, y + offsetY));
            const bIdx = (bY * width + bX) * 4;

            output[idx] = data[rIdx];
            output[idx + 1] = data[gIdx + 1];
            output[idx + 2] = data[bIdx + 2];
            output[idx + 3] = 255;
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
