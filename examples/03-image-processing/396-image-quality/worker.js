self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Float32Array(width * height);
    let sumBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
        const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray[i / 4] = g;
        sumBrightness += g;
    }

    const brightness = sumBrightness / (width * height);

    // Calculate contrast (standard deviation)
    let sumSquares = 0;
    for (let i = 0; i < gray.length; i++) {
        sumSquares += Math.pow(gray[i] - brightness, 2);
    }
    const contrast = Math.sqrt(sumSquares / gray.length);

    // Calculate sharpness using Laplacian variance
    const laplacian = new Float32Array(width * height);
    let sumLaplacian = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const lap = -4 * gray[idx] +
                        gray[idx - 1] + gray[idx + 1] +
                        gray[idx - width] + gray[idx + width];
            laplacian[idx] = Math.abs(lap);
            sumLaplacian += laplacian[idx];
        }
    }

    const meanLaplacian = sumLaplacian / ((width - 2) * (height - 2));
    let varLaplacian = 0;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            varLaplacian += Math.pow(laplacian[y * width + x] - meanLaplacian, 2);
        }
    }
    const sharpness = Math.sqrt(varLaplacian / ((width - 2) * (height - 2)));

    // Create visualization (edge map)
    const output = new Uint8ClampedArray(data.length);
    const maxLap = Math.max(...laplacian);

    for (let i = 0; i < gray.length; i++) {
        const normalized = Math.min(255, (laplacian[i] / maxLap) * 255 * 3);
        const idx = i * 4;

        // Color coding: low edges = blue, medium = green, high = red
        if (normalized < 85) {
            output[idx] = 0;
            output[idx + 1] = 0;
            output[idx + 2] = Math.floor(normalized * 3);
        } else if (normalized < 170) {
            output[idx] = 0;
            output[idx + 1] = Math.floor((normalized - 85) * 3);
            output[idx + 2] = 255 - Math.floor((normalized - 85) * 3);
        } else {
            output[idx] = Math.floor((normalized - 170) * 3);
            output[idx + 1] = 255 - Math.floor((normalized - 170) * 3);
            output[idx + 2] = 0;
        }
        output[idx + 3] = 255;
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        sharpness,
        contrast,
        brightness
    });
};
