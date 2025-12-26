self.onmessage = function(e) {
    const { imageData, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const noise = (Math.random() - 0.5) * intensity;

            output[idx] = Math.max(0, Math.min(255, data[idx] + noise));
            output[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
            output[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
