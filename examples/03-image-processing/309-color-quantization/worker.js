self.onmessage = function(e) {
    const { imageData, numColors } = e.data;
    const { width, height, data } = imageData;

    // Simple uniform quantization
    const levels = Math.ceil(Math.cbrt(numColors));
    const step = 256 / levels;

    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        output[i] = Math.floor(data[i] / step) * step + step / 2;
        output[i + 1] = Math.floor(data[i + 1] / step) * step + step / 2;
        output[i + 2] = Math.floor(data[i + 2] / step) * step + step / 2;
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
