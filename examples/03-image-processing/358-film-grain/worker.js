self.onmessage = function(e) {
    const { imageData, intensity, colorNoise } = e.data;
    const startTime = performance.now();

    try {
        const resultImageData = addFilmGrain(imageData, intensity, colorNoise);
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

function addFilmGrain(imageData, intensity, colorNoise) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);

    for (let i = 0; i < data.length; i += 4) {
        // Report progress occasionally
        if (i % (width * 4 * 10) === 0) {
            self.postMessage({ type: 'progress', progress: i / data.length });
        }

        let noiseR, noiseG, noiseB;

        if (colorNoise) {
            noiseR = (Math.random() - 0.5) * intensity;
            noiseG = (Math.random() - 0.5) * intensity;
            noiseB = (Math.random() - 0.5) * intensity;
        } else {
            const noise = (Math.random() - 0.5) * intensity;
            noiseR = noise;
            noiseG = noise;
            noiseB = noise;
        }

        result[i] = data[i] + noiseR;
        result[i+1] = data[i+1] + noiseG;
        result[i+2] = data[i+2] + noiseB;
        result[i+3] = data[i+3];
    }

    return new ImageData(result, width, height);
}
