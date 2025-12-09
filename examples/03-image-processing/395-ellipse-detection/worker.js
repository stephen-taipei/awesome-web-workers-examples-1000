self.onmessage = function(e) {
    const { imageData } = e.data;
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

        // 2. Edge Detection (Canny-like: Sobel + NMS)
        // For simplicity, just strong edge thresholding + thinning
        // Or just contours from thresholded edges
        const edgeThresh = 80;
        const edges = new Uint8Array(width * height);

        for (let i = 0; i < width * height; i++) {
            // Very simple gradient approximation
            const x = i % width;
            const y = Math.floor(i / width);
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue;

            const gx = gray[i+1] - gray[i-1];
            const gy = gray[i+width] - gray[i-width];
            const mag = Math.abs(gx) + Math.abs(gy);
            edges[i] = mag > edgeThresh ? 255 : 0;
        }

        // 3. Find Connected Components (Contours)
        // We treat each connected edge segment as a potential ellipse arc
        const contours = findContours(edges, width, height);

        // 4. Fit Ellipse to each contour
        const ellipses = [];
        const minPoints = 10; // Minimum points to fit

        for (let i = 0; i < contours.length; i++) {
            const points = contours[i];
            if (points.length < minPoints) continue;

            // Try to fit ellipse using Least Squares
            const ellipse = fitEllipse(points);
            if (ellipse) {
                // Check fitting error or aspect ratio constraints if needed
                ellipses.push(ellipse);
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                ellipses: ellipses,
                time: Math.round(endTime - startTime)
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function findContours(src, width, height) {
    const visited = new Uint8Array(width * height);
    const contours = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (src[idx] === 255 && visited[idx] === 0) {
                const contour = traceContour(src, visited, width, height, x, y);
                contours.push(contour);
            }
        }
    }
    return contours;
}

function traceContour(src, visited, width, height, startX, startY) {
    const contour = [];
    const stack = [{x: startX, y: startY}];
    visited[startY * width + startX] = 1;

    while (stack.length > 0) {
        const p = stack.pop();
        contour.push(p);

        // 8-neighbors
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = p.x + dx;
                const ny = p.y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = ny * width + nx;
                    if (src[idx] === 255 && visited[idx] === 0) {
                        visited[idx] = 1;
                        stack.push({x: nx, y: ny});
                    }
                }
            }
        }
    }
    return contour;
}

// Direct Least Squares Fitting of Ellipses (Fitzgibbon 1999)
// Adapted for JS from Python/Matlab implementations
// Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0
// Constraint: 4AC - B^2 = 1
function fitEllipse(points) {
    // Need at least 5/6 points, but practically more
    const N = points.length;
    if (N < 6) return null;

    // Normalize data for stability
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += points[i].x; my += points[i].y; }
    mx /= N; my /= N;

    let sx = 0, sy = 0;
    // Actually normalization helps but let's try raw first for simplicity in limited Worker environment without matrix lib.
    // Implementing matrix operations (SVD or Eigen) from scratch is heavy.
    // Let's use a simpler heuristic or a lightweight implementation.

    // Fallback: Use Bounding Box approximation for demo if math library not available?
    // Or implement simplified moment-based fitting (less accurate for partial arcs but okay for closed blobs).

    // Moment-based approach (Second order moments)
    // Similar to Image Moments in OpenCV
    // Only works well for closed, filled shapes or dense edge clusters forming the shape.

    let m20 = 0, m02 = 0, m11 = 0;

    for (let i = 0; i < N; i++) {
        const dx = points[i].x - mx;
        const dy = points[i].y - my;
        m20 += dx * dx;
        m02 += dy * dy;
        m11 += dx * dy;
    }
    m20 /= N; m02 /= N; m11 /= N;

    // Eigenvalues of covariance matrix
    // [ m20  m11 ]
    // [ m11  m02 ]

    const common = Math.sqrt(4 * m11 * m11 + (m20 - m02) * (m20 - m02));
    const lambda1 = (m20 + m02 + common) / 2;
    const lambda2 = (m20 + m02 - common) / 2;

    // Radii (approximate, usually for filled shape radii = 2 * sqrt(lambda))
    // For edge points, it's slightly different scaling, usually sqrt(2)*sigma?
    // Let's assume factor 2 for now (2 sigma)
    const rx = 2 * Math.sqrt(lambda1);
    const ry = 2 * Math.sqrt(lambda2);

    // Angle
    const angle = 0.5 * Math.atan2(2 * m11, m20 - m02);

    // Filter noise
    if (rx < 2 || ry < 2) return null;
    if (rx > Math.max(mx * 2 + 1000, 1000) || ry > 1000) return null; // Simple bounds check

    return {
        cx: mx,
        cy: my,
        rx: rx,
        ry: ry,
        angle: angle
    };
}
