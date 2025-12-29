self.onmessage = function(e) {
    const { imageData, seedX, seedY, tolerance } = e.data;
    const { width, height, data } = imageData;

    // Get seed color
    const seedIdx = (seedY * width + seedX) * 4;
    const seedR = data[seedIdx];
    const seedG = data[seedIdx + 1];
    const seedB = data[seedIdx + 2];

    // Region growing using flood fill
    const visited = new Uint8Array(width * height);
    const selected = new Uint8Array(width * height);
    const queue = [[seedX, seedY]];
    let count = 0;

    while (queue.length > 0) {
        const [x, y] = queue.shift();

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (visited[idx]) continue;
        visited[idx] = 1;

        const pixelIdx = idx * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];

        // Check color difference
        const diff = Math.sqrt(
            Math.pow(r - seedR, 2) +
            Math.pow(g - seedG, 2) +
            Math.pow(b - seedB, 2)
        );

        if (diff <= tolerance) {
            selected[idx] = 1;
            count++;

            // Add 4-connected neighbors
            queue.push([x + 1, y]);
            queue.push([x - 1, y]);
            queue.push([x, y + 1]);
            queue.push([x, y - 1]);
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);

    for (let i = 0; i < width * height; i++) {
        const pixelIdx = i * 4;
        if (selected[i]) {
            // Highlight selected region in red tint
            output[pixelIdx] = Math.min(255, data[pixelIdx] + 100);
            output[pixelIdx + 1] = Math.floor(data[pixelIdx + 1] * 0.5);
            output[pixelIdx + 2] = Math.floor(data[pixelIdx + 2] * 0.5);
            output[pixelIdx + 3] = 255;
        } else {
            // Dim non-selected region
            output[pixelIdx] = Math.floor(data[pixelIdx] * 0.3);
            output[pixelIdx + 1] = Math.floor(data[pixelIdx + 1] * 0.3);
            output[pixelIdx + 2] = Math.floor(data[pixelIdx + 2] * 0.3);
            output[pixelIdx + 3] = 255;
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        count
    });
};
