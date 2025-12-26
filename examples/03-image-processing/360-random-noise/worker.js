self.onmessage = function(e) {
    const { width, height, type } = e.data;
    const startTime = performance.now();

    try {
        const resultImageData = generateRandomNoise(width, height, type);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: resultImageData,
            duration: endTime - startTime
        });
    } catch (error) {
        console.error(error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

function generateRandomNoise(width, height, type) {
    const result = new Uint8ClampedArray(width * height * 4);
    const len = result.length;

    // Optimization: Generate noise in chunks to report progress
    const chunkSize = 100000;

    for (let i = 0; i < len; i += 4) {
        if (i % chunkSize === 0) {
             self.postMessage({ type: 'progress', progress: i / len });
        }

        if (type === 'monochrome') {
            const val = Math.random() * 255;
            result[i] = val;
            result[i+1] = val;
            result[i+2] = val;
            result[i+3] = 255;
        } else {
            result[i] = Math.random() * 255;
            result[i+1] = Math.random() * 255;
            result[i+2] = Math.random() * 255;
            result[i+3] = 255;
        }
    }

    return new ImageData(result, width, height);
}
