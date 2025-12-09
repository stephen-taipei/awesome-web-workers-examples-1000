self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;

    // 1. Binarize
    // Foreground = Infinity, Background = 0 initially
    // Standard Distance Transform computes distance to nearest zero pixel.
    // So we treat object pixels as Infinity and background as 0.

    // For visualization, we often want distance inside the object.
    // So we assume object > threshold.

    const INF = 1e9;
    const dist = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // If it's object (foreground), we want to calculate distance to background.
        // So foreground is initialized to INF, background to 0.
        if (luminance > threshold) {
            dist[i] = INF;
        } else {
            dist[i] = 0;
        }
    }

    // 2. Compute Distance Transform (Meijster's algorithm or simple 2-pass Manhattan/Euclidean approx)
    // Here we use a 2-pass algorithm for Euclidean Squared Distance Transform (ESDT), then sqrt.
    // Or simpler: 8SSEDT (8-signed sequential Euclidean distance transform) or similar.
    // Actually, exact EDT can be done in O(N) using Meijster or Felzenszwalb.
    // Let's implement a simpler approximate or exact separable algorithm.
    // "Squared Euclidean Distance Transform" is separable.

    // Let's use the simple 2-pass Chamfer distance (Manhattan or Chessboard) for speed?
    // User requested "Distance transform", usually implies Euclidean or approximation.
    // Let's implement exact Euclidean distance transform (EDT) using separable 1D parabolic envelope algorithm (Meijster et al.)
    // It's fast O(N) and accurate.

    // Transpose is hard in 1D array, let's just do:
    // Pass 1: Horizontal
    // Pass 2: Vertical

    // Intermediate buffer for squared distances.
    // Note: dist array above is initialized to 0 for background, INF for foreground.
    // Actually for Meijster, we need binary grid.
    // Let grid[x][y] = 0 if background, INF if foreground.

    // Optimization: we reuse `dist` as grid.

    // Pass 1: Horizontal scan
    // For each row, compute horizontal distance transform
    // f(x) = dist to nearest background in this row.
    // Since we only have 0 or INF, f(x) is just distance to nearest 0.

    for (let y = 0; y < height; y++) {
        // Forward
        let d = INF;
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (dist[idx] === 0) d = 0;
            else d += 1;
            dist[idx] = d * d; // We store squared distance for now?
            // Wait, Meijster algo for 2D EDT:
            // 1. For each column x, compute g(x, y) = min_y' ((y-y')^2 + source(x, y'))
            // Actually it's simpler:
            // Phase 1: For each column x, calculate G(x,y) = distance to nearest background pixel in that column.
            // Phase 2: For each row y, calculate DT(x,y) = min_i ( (x-i)^2 + G(i,y)^2 )

            // Let's restart logic correctly.
            // G[x][y] = min(|y - y'|) such that (x, y') is background.
        }
    }

    // Let's implement properly:
    // Step 1: Column-wise transform
    // G[i] = min distance (squared or absolute) to feature in column.
    // If we want Euclidean, G[i] should be simply |y - y'|. Then in step 2 we square it.

    // Reset dist to be correct G.
    // Re-read binary to initialize correctly.
    const g = new Float32Array(width * height);

    for (let x = 0; x < width; x++) {
        // Init column
        // We need to find nearest background pixel in this column for each pixel.

        // Forward scan
        let lastBg = -INF;
        for (let y = 0; y < height; y++) {
            const idx = y * width + x;
            const luminance = 0.299 * imageData.data[idx * 4] + 0.587 * imageData.data[idx * 4 + 1] + 0.114 * imageData.data[idx * 4 + 2];
            const isBg = luminance <= threshold;

            if (isBg) {
                lastBg = y;
                g[idx] = 0;
            } else {
                g[idx] = (y - lastBg); // Distance
            }
        }

        // Backward scan
        lastBg = INF;
        for (let y = height - 1; y >= 0; y--) {
            const idx = y * width + x;
            const currentDist = g[idx];

            // Re-check if this pixel is background? No need, g[idx] is 0 if bg.
            // Actually we need to know if we hit a bg pixel to update lastBg.
            if (currentDist === 0) {
                 lastBg = y;
            } else {
                 const newDist = (lastBg - y);
                 if (newDist < currentDist) {
                     g[idx] = newDist;
                 }
            }
            // Square it for Step 2
            g[idx] = g[idx] * g[idx];
        }
    }

    self.postMessage({ type: 'progress', progress: 50 });

    // Step 2: Row-wise transform using Parabolic Envelope
    // DT[x,y] = min_i ( (x-i)^2 + G[i][y] )
    // We process each row.
    const dt = new Float32Array(width * height);

    // Helper arrays for parabolic envelope
    // v[] stores x-locations of parabolas
    // z[] stores intersection points boundaries
    const v = new Int32Array(width);
    const z = new Float32Array(width + 1);

    for (let y = 0; y < height; y++) {
        let k = 0;
        v[0] = 0;
        z[0] = -INF;
        z[1] = INF;

        // Current row G values
        const rowOffset = y * width;

        for (let q = 1; q < width; q++) {
            // Function f(q) = G[q][y]
            // We want to add parabola centered at q with height f(q)
            // Intersection s
            let s;
            while (true) {
                const r = v[k];
                const f_q = g[rowOffset + q];
                const f_r = g[rowOffset + r];

                // Intersection of (x-q)^2 + f(q) and (x-r)^2 + f(r)
                // x^2 - 2xq + q^2 + f(q) = x^2 - 2xr + r^2 + f(r)
                // 2x(r - q) = r^2 + f(r) - q^2 - f(q)
                // x = ( (q^2 + f(q)) - (r^2 + f(r)) ) / (2*(q-r))

                s = ((q * q + f_q) - (r * r + f_r)) / (2 * (q - r));

                if (s > z[k]) {
                    break;
                }
                k--;
                if (k < 0) break; // Should not happen if loop logic is correct
            }
            k++;
            v[k] = q;
            z[k] = s;
            z[k+1] = INF;
        }

        k = 0;
        for (let q = 0; q < width; q++) {
            while (z[k+1] < q) {
                k++;
            }
            const r = v[k];
            const f_r = g[rowOffset + r];
            const distSq = (q - r) * (q - r) + f_r;
            dt[rowOffset + q] = Math.sqrt(distSq);
        }
    }

    // Normalize for display
    let maxDist = 0;
    for (let i = 0; i < dt.length; i++) {
        if (dt[i] > maxDist) maxDist = dt[i];
    }

    // Create visualization image
    const resultData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < dt.length; i++) {
        const d = dt[i];
        // Map distance to brightness
        // Simple linear map: 0 -> 0, maxDist -> 255
        // Or maybe cycling/heatmap? Let's do grayscale.
        const val = Math.min(255, (d / (maxDist || 1)) * 255);

        // Invert? Usually distance 0 is black (at edge), far is white (center).
        // Let's keep that.

        resultData[i * 4] = val;
        resultData[i * 4 + 1] = val;
        resultData[i * 4 + 2] = val;
        resultData[i * 4 + 3] = 255;
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        imageData: new ImageData(resultData, width, height),
        duration: Math.round(endTime - startTime),
        maxDistance: maxDist
    });
};
