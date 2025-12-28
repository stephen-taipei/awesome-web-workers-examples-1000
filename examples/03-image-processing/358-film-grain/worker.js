self.onmessage = function(e) {
    const { imageData, intensity } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity * 2;
        output[i] = Math.min(255, Math.max(0, data[i] + noise));
        output[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        output[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
