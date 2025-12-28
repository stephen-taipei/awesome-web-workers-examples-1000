self.onmessage = function(e) {
    const { imageData, colorCount } = e.data;
    const { width, height, data } = imageData;

    // Collect all pixels
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Median cut algorithm
    const palette = medianCut(pixels, colorCount);

    // Apply quantization
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const pixel = [data[i], data[i + 1], data[i + 2]];
        const nearest = findNearest(pixel, palette);
        output[i] = nearest[0];
        output[i + 1] = nearest[1];
        output[i + 2] = nearest[2];
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};

function medianCut(pixels, numColors) {
    if (pixels.length === 0) return [[0, 0, 0]];

    let buckets = [pixels];

    while (buckets.length < numColors) {
        // Find bucket with largest range
        let maxRange = -1;
        let maxIdx = 0;
        let maxChannel = 0;

        for (let i = 0; i < buckets.length; i++) {
            const bucket = buckets[i];
            if (bucket.length < 2) continue;

            for (let ch = 0; ch < 3; ch++) {
                const values = bucket.map(p => p[ch]);
                const range = Math.max(...values) - Math.min(...values);
                if (range > maxRange) {
                    maxRange = range;
                    maxIdx = i;
                    maxChannel = ch;
                }
            }
        }

        if (maxRange <= 0) break;

        // Split the bucket
        const bucket = buckets[maxIdx];
        bucket.sort((a, b) => a[maxChannel] - b[maxChannel]);
        const mid = Math.floor(bucket.length / 2);

        buckets.splice(maxIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
    }

    // Calculate average color for each bucket
    return buckets.map(bucket => {
        if (bucket.length === 0) return [0, 0, 0];
        const sum = [0, 0, 0];
        for (const p of bucket) {
            sum[0] += p[0];
            sum[1] += p[1];
            sum[2] += p[2];
        }
        return [
            Math.round(sum[0] / bucket.length),
            Math.round(sum[1] / bucket.length),
            Math.round(sum[2] / bucket.length)
        ];
    });
}

function findNearest(pixel, palette) {
    let minDist = Infinity;
    let nearest = palette[0];

    for (const color of palette) {
        const dist = Math.pow(pixel[0] - color[0], 2) +
                     Math.pow(pixel[1] - color[1], 2) +
                     Math.pow(pixel[2] - color[2], 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = color;
        }
    }

    return nearest;
}
