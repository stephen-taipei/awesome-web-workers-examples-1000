// Grayscale Conversion - Worker Thread

self.onmessage = function(e) {
    const { type, imageData, weights, method } = e.data;

    if (type === 'convert') {
        const result = convertToGrayscale(imageData, weights, method);
        self.postMessage({
            type: 'result',
            data: result
        });
    } else if (type === 'compare') {
        const results = compareAllMethods(imageData);
        self.postMessage({
            type: 'comparison',
            data: { results }
        });
    }
};

function convertToGrayscale(imageData, weights, method) {
    const startTime = performance.now();
    const data = new Uint8ClampedArray(imageData.data);
    const length = data.length;
    const pixels = length / 4;

    // Statistics
    let sum = 0;
    let sumSquared = 0;
    let min = 255;
    let max = 0;
    const histogram = new Array(256).fill(0);

    // Process pixels
    const progressInterval = Math.floor(pixels / 20);

    for (let i = 0; i < length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let gray;

        if (method === 'lightness') {
            // Lightness method: (max + min) / 2
            const maxVal = Math.max(r, g, b);
            const minVal = Math.min(r, g, b);
            gray = Math.round((maxVal + minVal) / 2);
        } else {
            // Weighted average
            gray = Math.round(weights.r * r + weights.g * g + weights.b * b);
        }

        // Clamp to valid range
        gray = Math.max(0, Math.min(255, gray));

        // Set grayscale value
        data[i] = gray;     // R
        data[i + 1] = gray; // G
        data[i + 2] = gray; // B
        // Alpha stays the same

        // Update statistics
        sum += gray;
        sumSquared += gray * gray;
        min = Math.min(min, gray);
        max = Math.max(max, gray);
        histogram[gray]++;

        // Report progress
        const pixelIndex = i / 4;
        if (pixelIndex % progressInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.round((pixelIndex / pixels) * 100) }
            });
        }
    }

    const executionTime = performance.now() - startTime;

    // Calculate statistics
    const avgBrightness = sum / pixels;
    const variance = (sumSquared / pixels) - (avgBrightness * avgBrightness);
    const contrast = Math.sqrt(variance);

    return {
        processedData: data.buffer,
        stats: {
            avgBrightness,
            contrast,
            min,
            max,
            histogram
        },
        executionTime,
        method
    };
}

function compareAllMethods(imageData) {
    const methods = [
        { name: 'luminosity', weights: { r: 0.2126, g: 0.7152, b: 0.0722 } },
        { name: 'average', weights: { r: 1/3, g: 1/3, b: 1/3 } },
        { name: 'lightness', weights: { r: 0.5, g: 0.5, b: 0.5 } },
        { name: 'custom', weights: { r: 0.3, g: 0.59, b: 0.11 } } // Classic NTSC weights
    ];

    const results = [];

    methods.forEach((method, index) => {
        // Create a copy of image data for each method
        const dataCopy = {
            data: new Uint8ClampedArray(imageData.data),
            width: imageData.width,
            height: imageData.height
        };

        const result = convertToGrayscale(dataCopy, method.weights, method.name);
        results.push({
            method: method.name,
            ...result
        });

        self.postMessage({
            type: 'progress',
            data: { percent: Math.round(((index + 1) / methods.length) * 100) }
        });
    });

    return results;
}
