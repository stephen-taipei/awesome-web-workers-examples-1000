self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    const total = width * height;

    // Build histogram
    const hist = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        hist[gray]++;
    }

    // Build CDF
    const cdf = new Array(256);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + hist[i];
    }

    // Find min non-zero CDF
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
        if (cdf[i] > 0) { cdfMin = cdf[i]; break; }
    }

    // Build lookup table
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
        lut[i] = Math.round((cdf[i] - cdfMin) / (total - cdfMin) * 255);
    }

    // Apply
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        const scale = lut[gray] / (gray || 1);
        output[i] = Math.min(255, data[i] * scale);
        output[i + 1] = Math.min(255, data[i + 1] * scale);
        output[i + 2] = Math.min(255, data[i + 2] * scale);
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
