self.onmessage = function(e) {
    const { imageData, tileSize, clipLimit } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Convert to grayscale for processing
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    const tileWidth = Math.ceil(width / tileSize);
    const tileHeight = Math.ceil(height / tileSize);
    const numPixelsPerTile = tileWidth * tileHeight;

    // Process each tile
    const result = new Uint8Array(width * height);

    for (let ty = 0; ty < tileSize; ty++) {
        for (let tx = 0; tx < tileSize; tx++) {
            const x0 = tx * tileWidth;
            const y0 = ty * tileHeight;
            const x1 = Math.min(x0 + tileWidth, width);
            const y1 = Math.min(y0 + tileHeight, height);

            // Build histogram for this tile
            const hist = new Uint32Array(256);
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    hist[gray[y * width + x]]++;
                }
            }

            // Clip histogram
            const clipThreshold = Math.floor(clipLimit * numPixelsPerTile / 256);
            let excess = 0;
            for (let i = 0; i < 256; i++) {
                if (hist[i] > clipThreshold) {
                    excess += hist[i] - clipThreshold;
                    hist[i] = clipThreshold;
                }
            }

            // Redistribute excess
            const avgIncrease = Math.floor(excess / 256);
            for (let i = 0; i < 256; i++) {
                hist[i] += avgIncrease;
            }

            // Build CDF
            const cdf = new Float32Array(256);
            cdf[0] = hist[0];
            for (let i = 1; i < 256; i++) {
                cdf[i] = cdf[i - 1] + hist[i];
            }

            const cdfMin = cdf.find(v => v > 0) || 0;
            const tilePixels = (x1 - x0) * (y1 - y0);

            // Apply equalization to this tile
            for (let y = y0; y < y1; y++) {
                for (let x = x0; x < x1; x++) {
                    const idx = y * width + x;
                    const val = gray[idx];
                    result[idx] = Math.round((cdf[val] - cdfMin) / (tilePixels - cdfMin) * 255);
                }
            }
        }
    }

    // Apply result to output maintaining color ratio
    for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        const oldLum = gray[idx];
        const newLum = result[idx];
        const scale = oldLum > 0 ? newLum / oldLum : 1;

        output[i] = Math.min(255, Math.round(data[i] * scale));
        output[i + 1] = Math.min(255, Math.round(data[i + 1] * scale));
        output[i + 2] = Math.min(255, Math.round(data[i + 2] * scale));
        output[i + 3] = data[i + 3];
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
