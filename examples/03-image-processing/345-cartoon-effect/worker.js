self.onmessage = function(e) {
    const { imageData, levels, edgeThreshold } = e.data;
    const startTime = performance.now();

    // 1. Median Blur to smooth regions (pre-processing)
    const smoothedData = medianFilter(imageData, 2);
    self.postMessage({ type: 'progress', data: 30 });

    // 2. Color Quantization
    const quantizedData = quantizeColors(smoothedData, levels);
    self.postMessage({ type: 'progress', data: 60 });

    // 3. Edge Detection
    const edges = detectEdges(smoothedData, edgeThreshold);
    self.postMessage({ type: 'progress', data: 90 });

    // 4. Combine (Overlay edges on quantized image)
    const resultData = applyEdges(quantizedData, edges);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: resultData,
            time: Math.round(endTime - startTime)
        }
    });
};

function medianFilter(imageData, radius) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const resultBuffer = new Uint8ClampedArray(data.length);
    const side = radius;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rList = [];
            const gList = [];
            const bList = [];

            for (let dy = -side; dy <= side; dy++) {
                for (let dx = -side; dx <= side; dx++) {
                    const ny = Math.min(Math.max(y + dy, 0), height - 1);
                    const nx = Math.min(Math.max(x + dx, 0), width - 1);
                    const idx = (ny * width + nx) * 4;
                    rList.push(data[idx]);
                    gList.push(data[idx+1]);
                    bList.push(data[idx+2]);
                }
            }

            rList.sort((a, b) => a - b);
            gList.sort((a, b) => a - b);
            bList.sort((a, b) => a - b);

            const mid = Math.floor(rList.length / 2);

            const idx = (y * width + x) * 4;
            resultBuffer[idx] = rList[mid];
            resultBuffer[idx+1] = gList[mid];
            resultBuffer[idx+2] = bList[mid];
            resultBuffer[idx+3] = data[idx+3];
        }
    }
    return new ImageData(resultBuffer, width, height);
}

function quantizeColors(imageData, levels) {
    const data = imageData.data;
    const resultBuffer = new Uint8ClampedArray(data.length);
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
        resultBuffer[i] = Math.floor(data[i] / step + 0.5) * step;
        resultBuffer[i+1] = Math.floor(data[i+1] / step + 0.5) * step;
        resultBuffer[i+2] = Math.floor(data[i+2] / step + 0.5) * step;
        resultBuffer[i+3] = data[i+3];
    }

    return new ImageData(resultBuffer, imageData.width, imageData.height);
}

function detectEdges(imageData, threshold) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new Uint8Array(width * height); // 1 = edge, 0 = no edge

    // Simple gradient magnitude check
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Check right and bottom neighbors
            if (x < width - 1 && y < height - 1) {
                const idx = (y * width + x) * 4;
                const rightIdx = (y * width + (x + 1)) * 4;
                const bottomIdx = ((y + 1) * width + x) * 4;

                // Luminance difference
                const lum = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
                const lumRight = 0.299 * data[rightIdx] + 0.587 * data[rightIdx+1] + 0.114 * data[rightIdx+2];
                const lumBottom = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx+1] + 0.114 * data[bottomIdx+2];

                const diffRight = Math.abs(lum - lumRight);
                const diffBottom = Math.abs(lum - lumBottom);

                if (diffRight > threshold || diffBottom > threshold) {
                    edges[y * width + x] = 1;
                }
            }
        }
    }
    return edges;
}

function applyEdges(imageData, edges) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const outputBuffer = new Uint8ClampedArray(data.length);

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        if (edges[i]) {
            // Edge pixel -> Black
            outputBuffer[idx] = 0;
            outputBuffer[idx+1] = 0;
            outputBuffer[idx+2] = 0;
            outputBuffer[idx+3] = 255;
        } else {
            // Normal pixel
            outputBuffer[idx] = data[idx];
            outputBuffer[idx+1] = data[idx+1];
            outputBuffer[idx+2] = data[idx+2];
            outputBuffer[idx+3] = data[idx+3];
        }
    }

    return new ImageData(outputBuffer, width, height);
}
