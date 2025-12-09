self.onmessage = function(e) {
    const { images } = e.data;
    if (!images.length) return;

    const w = images[0].width;
    const h = images[0].height;

    // 1. Calculate Sharpness Map for each image
    // Laplacian filter:
    //  0  1  0
    //  1 -4  1
    //  0  1  0

    const sharpnessMaps = [];

    for (let k = 0; k < images.length; k++) {
        const data = images[k].data;
        const map = new Float32Array(w * h);

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;

                // Use Green channel for sharpness estimation (approximation of luma)
                const c = data[idx+1];
                const u = data[idx - w*4 + 1];
                const d = data[idx + w*4 + 1];
                const l = data[idx - 4 + 1];
                const r = data[idx + 4 + 1];

                // Laplacian
                const lap = Math.abs(u + d + l + r - 4*c);
                map[y * w + x] = lap;
            }
        }
        sharpnessMaps.push(map);

        self.postMessage({ type: 'progress', value: Math.round((k + 1) / images.length * 50) });
    }

    // 2. Select pixels
    // To reduce noise, we should probably smooth the sharpness map (windowed sum).

    // Smooth the maps
    const windowSize = 5;
    const offset = Math.floor(windowSize / 2);

    // In-place smoothing or new buffer? New buffer is cleaner.
    const smoothedMaps = sharpnessMaps.map(map => {
        const smooth = new Float32Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0;
                let count = 0;

                for (let wy = -offset; wy <= offset; wy++) {
                    for (let wx = -offset; wx <= offset; wx++) {
                        const ny = y + wy;
                        const nx = x + wx;
                        if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                            sum += map[ny * w + nx];
                            count++;
                        }
                    }
                }
                smooth[y * w + x] = sum / count;
            }
        }
        return smooth;
    });

    self.postMessage({ type: 'progress', value: 75 });

    // 3. Composite
    const result = new Uint8ClampedArray(w * h * 4);

    for (let i = 0; i < w * h; i++) {
        let maxSharpness = -1;
        let bestIdx = 0;

        for (let k = 0; k < images.length; k++) {
            if (smoothedMaps[k][i] > maxSharpness) {
                maxSharpness = smoothedMaps[k][i];
                bestIdx = k;
            }
        }

        // Copy pixel from best image
        const pIdx = i * 4;
        result[pIdx] = images[bestIdx].data[pIdx];
        result[pIdx+1] = images[bestIdx].data[pIdx+1];
        result[pIdx+2] = images[bestIdx].data[pIdx+2];
        result[pIdx+3] = 255;
    }

    self.postMessage({
        type: 'done',
        imageData: new ImageData(result, w, h)
    });
};
