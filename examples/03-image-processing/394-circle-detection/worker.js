self.onmessage = function(e) {
    const { imageData, minRadius, maxRadius } = e.data;
    const startTime = performance.now();

    try {
        const { width, height, data } = imageData;

        // 1. Grayscale
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        // 2. Edge Detection (Sobel) + Gradient Direction
        const edgeThresh = 100;
        const edges = []; // Store {x, y, theta}

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const p00 = gray[(y-1)*width + (x-1)];
                const p01 = gray[(y-1)*width + x];
                const p02 = gray[(y-1)*width + (x+1)];
                const p10 = gray[y*width + (x-1)];
                const p12 = gray[y*width + (x+1)];
                const p20 = gray[(y+1)*width + (x-1)];
                const p21 = gray[(y+1)*width + x];
                const p22 = gray[(y+1)*width + (x+1)];

                const gx = (p02 + 2*p12 + p22) - (p00 + 2*p10 + p20);
                const gy = (p20 + 2*p21 + p22) - (p00 + 2*p01 + p02);

                const mag = Math.sqrt(gx*gx + gy*gy);

                if (mag > edgeThresh) {
                    const theta = Math.atan2(gy, gx);
                    edges.push({x, y, theta});
                }
            }
        }

        // 3. Hough Circle Transform (Accumulator for centers)
        // We accumulate possible centers (a, b)
        // a = x - r * cos(theta)
        // b = y - r * sin(theta)
        // Since radius is unknown, we range over minRadius to maxRadius

        const accWidth = width;
        const accHeight = height;
        const accumulator = new Uint32Array(accWidth * accHeight);

        // Phase 1: Detect Centers
        // Instead of full 3D accumulator (a, b, r), we can use 2D (a, b) first if we assume
        // gradients point to center.
        // For each edge point, we vote along the gradient line for range [minR, maxR]

        for (let i = 0; i < edges.length; i++) {
            const { x, y, theta } = edges[i];
            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);

            // Vote for centers in both directions (gradient points perpendicular to edge, so center is along gradient)
            // Usually gradient points from dark to light.
            // Try both + and - direction just in case

            for (let r = minRadius; r <= maxRadius; r += 2) {
                // Direction 1
                const a1 = Math.round(x - r * cosT);
                const b1 = Math.round(y - r * sinT);
                if (a1 >= 0 && a1 < width && b1 >= 0 && b1 < height) {
                    accumulator[b1 * width + a1]++;
                }

                // Direction 2
                const a2 = Math.round(x + r * cosT);
                const b2 = Math.round(y + r * sinT);
                if (a2 >= 0 && a2 < width && b2 >= 0 && b2 < height) {
                    accumulator[b2 * width + a2]++;
                }
            }
        }

        // Phase 2: Find peaks in Center Accumulator
        const centers = [];
        const centerThresh = 15; // Minimum votes for a center

        // Simple non-max suppression
        const k = 10; // neighborhood size
        for (let y = k; y < height - k; y++) {
            for (let x = k; x < width - k; x++) {
                const votes = accumulator[y * width + x];
                if (votes > centerThresh) {
                    if (isLocalMaxima(accumulator, width, height, x, y, votes, k)) {
                        centers.push({ x, y, votes });
                    }
                }
            }
        }

        // Phase 3: Determine Radius for each center
        // For each candidate center, histogram radii from edge points
        const circles = [];

        for (let i = 0; i < centers.length; i++) {
            const center = centers[i];
            const radiusAcc = new Uint32Array(maxRadius + 1);

            // Check all edges again? Too slow.
            // Optimization: Just output the center with an estimated radius or check best radius
            // Let's do a quick scan of edges nearby? No, scan edges and check distance to center.

            // If many edges, this is slow.
            // Better: When voting for center, keep track of radius? 3D accumulator is memory heavy.

            // Re-scan edges to find best radius for this center
            for (let j = 0; j < edges.length; j++) {
                const dx = edges[j].x - center.x;
                const dy = edges[j].y - center.y;
                const dist2 = dx*dx + dy*dy;
                if (dist2 >= minRadius*minRadius && dist2 <= maxRadius*maxRadius) {
                    const r = Math.round(Math.sqrt(dist2));
                    if (r <= maxRadius) radiusAcc[r]++;
                }
            }

            // Find best radius
            let bestR = 0;
            let maxVotes = 0;
            for (let r = minRadius; r <= maxRadius; r++) {
                if (radiusAcc[r] > maxVotes) {
                    maxVotes = radiusAcc[r];
                    bestR = r;
                }
            }

            // Verify if circle is strong enough
            // Circumference approx 2 * pi * r
            // If votes > 0.4 * circumference?
            if (maxVotes > 0.3 * (2 * Math.PI * bestR)) {
                circles.push({ x: center.x, y: center.y, r: bestR, score: maxVotes });
            }
        }

        // Final filter overlapping circles
        const uniqueCircles = filterCircles(circles);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                circles: uniqueCircles,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function isLocalMaxima(acc, w, h, x, y, val, k) {
    for (let dy = -k; dy <= k; dy++) {
        for (let dx = -k; dx <= k; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (acc[(y + dy) * w + (x + dx)] > val) return false;
        }
    }
    return true;
}

function filterCircles(circles) {
    circles.sort((a, b) => b.score - a.score);
    const result = [];

    for (let i = 0; i < circles.length; i++) {
        let overlap = false;
        for (let j = 0; j < result.length; j++) {
            const dx = circles[i].x - result[j].x;
            const dy = circles[i].y - result[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < result[j].r * 0.8) { // Overlap condition
                overlap = true;
                break;
            }
        }
        if (!overlap) {
            result.push(circles[i]);
            if (result.length >= 20) break; // Limit
        }
    }
    return result;
}
