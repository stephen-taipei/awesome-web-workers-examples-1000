// Brightness Adjustment - Web Worker
// Processes image data by adjusting RGB values with addition/subtraction

self.onmessage = function(e) {
    const { imageData, width, height, brightness } = e.data;
    const startTime = performance.now();

    // Create a copy of the image data
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = width * height;

    // Calculate histogram for brightness analysis
    const histogramBefore = new Array(256).fill(0);
    const histogramAfter = new Array(256).fill(0);

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance for histogram (before)
        const lumBefore = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogramBefore[lumBefore]++;

        // Adjust brightness for each RGB channel
        // Uint8ClampedArray automatically clamps values to 0-255
        data[i] = data[i] + brightness;         // Red
        data[i + 1] = data[i + 1] + brightness; // Green
        data[i + 2] = data[i + 2] + brightness; // Blue
        // data[i + 3] unchanged (Alpha)

        // Calculate luminance for histogram (after)
        const lumAfter = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogramAfter[lumAfter]++;

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
            brightness: brightness,
            histogramBefore: histogramBefore,
            histogramAfter: histogramAfter
        }
    });
};
