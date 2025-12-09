self.onmessage = function(e) {
    const { imageData, pointSize, density } = e.data;
    const startTime = performance.now();

    try {
        const { resultImageData, count } = pointillize(imageData, pointSize, density);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: resultImageData,
            duration: endTime - startTime,
            count: count
        });
    } catch (error) {
        console.error(error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

function pointillize(imageData, pointSize, density) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(width * height * 4);

    // Fill background with white
    for (let i = 0; i < result.length; i += 4) {
        result[i] = 255;
        result[i+1] = 255;
        result[i+2] = 255;
        result[i+3] = 255;
    }

    // Calculate number of points based on image size, point size and density
    // A simplified approach: generate points randomly.
    // Number of points ~ (Width * Height) / (PointArea) * Density
    const numPoints = Math.floor((width * height) / (pointSize * pointSize) * density);

    // Since we can't use Canvas API in Worker (unless OffscreenCanvas, but let's stick to pixel manipulation for compatibility/demonstration),
    // we need to draw circles manually.
    // Optimization: Pre-calculate circle mask?
    // Or simply loop over bounding box of circle.

    const r2 = (pointSize / 2) ** 2;
    const r = Math.floor(pointSize / 2);

    for (let i = 0; i < numPoints; i++) {
        // Report progress periodically
        if (i % 5000 === 0) {
             self.postMessage({ type: 'progress', progress: i / numPoints });
        }

        const cx = Math.floor(Math.random() * width);
        const cy = Math.floor(Math.random() * height);

        // Sample color at center
        const idx = (cy * width + cx) * 4;
        const color = [data[idx], data[idx+1], data[idx+2], data[idx+3]];

        // Draw circle at (cx, cy)
        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    if ((x - cx)**2 + (y - cy)**2 <= r2) {
                        const targetIdx = (y * width + x) * 4;
                        result[targetIdx] = color[0];
                        result[targetIdx+1] = color[1];
                        result[targetIdx+2] = color[2];
                        result[targetIdx+3] = 255; // Opaque dots
                    }
                }
            }
        }
    }

    return { resultImageData: new ImageData(result, width, height), count: numPoints };
}
