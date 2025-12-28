self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;
    const gray = new Float32Array(width * height);

    // Convert to grayscale
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Floyd-Steinberg dithering
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldVal = gray[idx];
            const newVal = oldVal < 128 ? 0 : 255;
            gray[idx] = newVal;
            const error = oldVal - newVal;

            if (x + 1 < width) gray[idx + 1] += error * 7 / 16;
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += error * 3 / 16;
                gray[idx + width] += error * 5 / 16;
                if (x + 1 < width) gray[idx + width + 1] += error * 1 / 16;
            }
        }
    }

    // Output
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < gray.length; i++) {
        const val = gray[i] < 128 ? 0 : 255;
        output[i * 4] = val;
        output[i * 4 + 1] = val;
        output[i * 4 + 2] = val;
        output[i * 4 + 3] = 255;
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
