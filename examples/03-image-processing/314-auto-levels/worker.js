self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Find min/max for each channel
    const mins = [255, 255, 255], maxs = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            mins[c] = Math.min(mins[c], data[i + c]);
            maxs[c] = Math.max(maxs[c], data[i + c]);
        }
    }

    // Stretch levels
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const range = maxs[c] - mins[c];
            if (range > 0) {
                output[i + c] = ((data[i + c] - mins[c]) / range) * 255;
            } else {
                output[i + c] = data[i + c];
            }
        }
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
