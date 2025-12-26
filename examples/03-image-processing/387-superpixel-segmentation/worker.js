// SLIC Superpixel Worker
// Simple Linear Iterative Clustering

self.onmessage = function(e) {
    const { imageData, numSuperpixels, compactness } = e.data;
    const { width, height, data } = imageData;
    const numPixels = width * height;

    try {
        const startTime = performance.now();

        self.postMessage({ type: 'progress', progress: 5, message: '轉換色彩空間 (Lab)...' });

        // 1. Convert to Lab color space
        const labData = new Float32Array(numPixels * 3);
        for (let i = 0; i < numPixels; i++) {
            const r = data[i*4];
            const g = data[i*4+1];
            const b = data[i*4+2];
            const lab = rgbToLab(r, g, b);
            labData[i*3] = lab[0];
            labData[i*3+1] = lab[1];
            labData[i*3+2] = lab[2];
        }

        // 2. Initialize Cluster Centers
        // Grid sampling
        const step = Math.sqrt(numPixels / numSuperpixels);
        const S = Math.round(step);

        const clusters = [];
        for (let y = Math.floor(S/2); y < height; y += S) {
            for (let x = Math.floor(S/2); x < width; x += S) {
                const idx = y * width + x;
                clusters.push({
                    l: labData[idx*3],
                    a: labData[idx*3+1],
                    b: labData[idx*3+2],
                    x: x,
                    y: y
                });
            }
        }

        // Perturb centers to lowest gradient position (optional but recommended)
        // Omitted for simplicity/speed or add later if needed

        const labels = new Int32Array(numPixels).fill(-1);
        const distances = new Float32Array(numPixels).fill(Infinity);

        const m = compactness; // Compactness factor

        const iterations = 10;

        for (let iter = 0; iter < iterations; iter++) {
            self.postMessage({ type: 'progress', progress: 10 + (iter/iterations)*70, message: `迭代 ${iter+1}/${iterations}...` });

            // Assignment Step
            for (let k = 0; k < clusters.length; k++) {
                const c = clusters[k];
                const startX = Math.max(0, Math.floor(c.x - S));
                const endX = Math.min(width, Math.floor(c.x + S + 1)); // 2S x 2S region
                const startY = Math.max(0, Math.floor(c.y - S));
                const endY = Math.min(height, Math.floor(c.y + S + 1));

                for (let y = startY; y < endY; y++) {
                    for (let x = startX; x < endX; x++) {
                        const i = y * width + x;
                        const l = labData[i*3];
                        const a = labData[i*3+1];
                        const b = labData[i*3+2];

                        const dLab = (l - c.l)**2 + (a - c.a)**2 + (b - c.b)**2;
                        const dXy = (x - c.x)**2 + (y - c.y)**2;
                        const D = dLab + (m/S)**2 * dXy; // D = d_lab + (m/S)^2 * d_xy

                        if (D < distances[i]) {
                            distances[i] = D;
                            labels[i] = k;
                        }
                    }
                }
            }

            // Update Centers Step
            const newClusters = new Array(clusters.length).fill(0).map(() => ({ l:0, a:0, b:0, x:0, y:0, count:0 }));

            let changed = false;

            for (let i = 0; i < numPixels; i++) {
                const k = labels[i];
                if (k === -1) continue; // Should not happen after first iter

                const nc = newClusters[k];
                nc.l += labData[i*3];
                nc.a += labData[i*3+1];
                nc.b += labData[i*3+2];
                nc.x += (i % width);
                nc.y += Math.floor(i / width);
                nc.count++;
            }

            for (let k = 0; k < clusters.length; k++) {
                const nc = newClusters[k];
                if (nc.count > 0) {
                    const inv = 1 / nc.count;
                    const newL = nc.l * inv;
                    const newA = nc.a * inv;
                    const newB = nc.b * inv;
                    const newX = nc.x * inv;
                    const newY = nc.y * inv;

                    // Check convergence
                    if (Math.abs(newL - clusters[k].l) > 0.1 || Math.abs(newX - clusters[k].x) > 0.1) {
                         changed = true;
                    }

                    clusters[k].l = newL;
                    clusters[k].a = newA;
                    clusters[k].b = newB;
                    clusters[k].x = newX;
                    clusters[k].y = newY;
                }
            }

            // Reset distances for next iter
            if (iter < iterations - 1) {
                 distances.fill(Infinity);
            }
        }

        // Enforce Connectivity (Optional, merge small disjoint components)
        // ... omitted for simplicity

        self.postMessage({ type: 'progress', progress: 100, message: '完成...' });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { labels: labels, width, height },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function rgbToLab(r, g, b) {
    // RGB to XYZ
    let r1 = r / 255, g1 = g / 255, b1 = b / 255;
    r1 = (r1 > 0.04045) ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
    g1 = (g1 > 0.04045) ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
    b1 = (b1 > 0.04045) ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

    let x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
    let y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
    let z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

    // XYZ to Lab
    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}
