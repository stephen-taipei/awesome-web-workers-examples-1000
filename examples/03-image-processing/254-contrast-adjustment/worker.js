// Contrast Adjustment - Web Worker
// Processes image data using linear contrast mapping

self.onmessage = function(e) {
    const { imageData, width, height, contrast } = e.data;
    const startTime = performance.now();

    // Create a copy of the image data
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = width * height;

    // Calculate contrast factor using the standard formula
    // factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    // Calculate histogram for analysis
    const histogramBefore = new Array(256).fill(0);
    const histogramAfter = new Array(256).fill(0);

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance for histogram (before)
        const lumBefore = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogramBefore[lumBefore]++;

        // Apply contrast adjustment to each RGB channel
        // Formula: newValue = factor * (oldValue - 128) + 128
        data[i] = factor * (data[i] - 128) + 128;         // Red
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
        // data[i + 3] unchanged (Alpha)

        // Calculate luminance for histogram (after)
        const lumAfter = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogramAfter[Math.min(255, Math.max(0, lumAfter))]++;

        // Report progress every 10%
        if (i % (data.length / 10 | 0) < 4) {
            const progress = Math.round((i / data.length) * 100);
            self.postMessage({
                type: 'progress',
                progress: progress
            });
        }
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Send back the result
    self.postMessage({
        type: 'result',
        imageData: {
            data: data,
            width: width,
            height: height
        },
        stats: {
            width: width,
            height: height,
            totalPixels: totalPixels,
            processingTime: processingTime,
            contrast: contrast,
            factor: factor,
            histogramBefore: histogramBefore,
            histogramAfter: histogramAfter
        }
    });
};
