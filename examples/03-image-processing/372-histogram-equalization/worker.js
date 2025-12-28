self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const hist = new Uint32Array(256);
    const cdf = new Float32Array(256);

    // Calculate histogram for luminance
    for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        hist[lum]++;
    }

    // Calculate CDF
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

    const cdfMin = cdf.find(v => v > 0);
    const numPixels = width * height;

    // Equalize
    for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        const newLum = Math.round((cdf[lum] - cdfMin) / (numPixels - cdfMin) * 255);
        const scale = lum > 0 ? newLum / lum : 1;

        output[i] = Math.min(255, data[i] * scale);
        output[i + 1] = Math.min(255, data[i + 1] * scale);
        output[i + 2] = Math.min(255, data[i + 2] * scale);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
