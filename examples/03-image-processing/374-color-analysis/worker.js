self.onmessage = function(e) {
    const { imageData, k } = e.data;
    const { width, height, data } = imageData;

    // Sample pixels for k-means (use every 4th pixel for speed)
    const samples = [];
    for (let i = 0; i < data.length; i += 16) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Initialize centroids randomly
    let centroids = [];
    for (let i = 0; i < k; i++) {
        const idx = Math.floor(Math.random() * samples.length);
        centroids.push([...samples[idx]]);
    }

    // K-means iterations
    const maxIter = 20;
    let assignments = new Array(samples.length);

    for (let iter = 0; iter < maxIter; iter++) {
        // Assign samples to nearest centroid
        for (let i = 0; i < samples.length; i++) {
            let minDist = Infinity;
            let minIdx = 0;
            for (let j = 0; j < k; j++) {
                const dist = colorDistance(samples[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    minIdx = j;
                }
            }
            assignments[i] = minIdx;
        }

        // Update centroids
        const sums = Array(k).fill(null).map(() => [0, 0, 0]);
        const counts = Array(k).fill(0);

        for (let i = 0; i < samples.length; i++) {
            const c = assignments[i];
            sums[c][0] += samples[i][0];
            sums[c][1] += samples[i][1];
            sums[c][2] += samples[i][2];
            counts[c]++;
        }

        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
                centroids[j] = [
                    Math.round(sums[j][0] / counts[j]),
                    Math.round(sums[j][1] / counts[j]),
                    Math.round(sums[j][2] / counts[j])
                ];
            }
        }
    }

    // Calculate color percentages
    const colorCounts = Array(k).fill(0);
    const pixelAssignments = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
        const pixel = [data[i], data[i + 1], data[i + 2]];
        let minDist = Infinity;
        let minIdx = 0;
        for (let j = 0; j < k; j++) {
            const dist = colorDistance(pixel, centroids[j]);
            if (dist < minDist) {
                minDist = dist;
                minIdx = j;
            }
        }
        pixelAssignments[i / 4] = minIdx;
        colorCounts[minIdx]++;
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const c = centroids[pixelAssignments[i / 4]];
        output[i] = c[0];
        output[i + 1] = c[1];
        output[i + 2] = c[2];
        output[i + 3] = 255;
    }

    // Build color info
    const totalPixels = width * height;
    const colors = centroids.map((c, i) => ({
        r: c[0],
        g: c[1],
        b: c[2],
        percent: Math.round(colorCounts[i] / totalPixels * 100)
    })).sort((a, b) => b.percent - a.percent);

    self.postMessage({
        imageData: new ImageData(output, width, height),
        colors
    });
};

function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
}
