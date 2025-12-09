// Invert Color Filter - Web Worker
// Processes image data by inverting RGB values: 255 - value

self.onmessage = function(e) {
    const { imageData, width, height } = e.data;
    const startTime = performance.now();

    // Create a copy of the image data
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = width * height;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        // Invert RGB values (255 - value)
        data[i] = 255 - data[i];         // Red
        data[i + 1] = 255 - data[i + 1]; // Green
        data[i + 2] = 255 - data[i + 2]; // Blue
        // data[i + 3] unchanged (Alpha)

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
            throughput: (totalPixels / processingTime * 1000).toFixed(0)
        }
    });
};
