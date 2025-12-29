self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Edge detection
    const edges = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = gray[idx + 1] - gray[idx - 1];
            const gy = gray[idx + width] - gray[idx - width];
            edges[idx] = Math.sqrt(gx * gx + gy * gy) > threshold ? 255 : 0;
        }
    }

    // Find connected contours
    const labels = new Int32Array(width * height);
    const contours = [];
    let nextLabel = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (edges[idx] > 0 && labels[idx] === 0) {
                const points = [];
                floodFillContour(edges, labels, width, height, x, y, nextLabel, points);
                if (points.length >= 20) {
                    contours.push(points);
                }
                nextLabel++;
            }
        }
    }

    // Fit ellipses to contours
    const ellipses = [];

    for (const points of contours) {
        const ellipse = fitEllipse(points);
        if (ellipse && ellipse.a > 5 && ellipse.b > 5 && ellipse.a < 100 && ellipse.b < 100) {
            // Verify ellipse fit by checking how many points are close
            let inliers = 0;
            for (const p of points) {
                const dist = ellipseDistance(p.x, p.y, ellipse);
                if (dist < 5) inliers++;
            }

            if (inliers > points.length * 0.5) {
                ellipses.push(ellipse);
            }
        }
    }

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw ellipses
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255]];

    for (let i = 0; i < ellipses.length; i++) {
        const e = ellipses[i];
        const color = colors[i % colors.length];

        // Draw ellipse
        for (let angle = 0; angle < 360; angle++) {
            const rad = angle * Math.PI / 180;
            const px = e.cx + e.a * Math.cos(rad) * Math.cos(e.angle) - e.b * Math.sin(rad) * Math.sin(e.angle);
            const py = e.cy + e.a * Math.cos(rad) * Math.sin(e.angle) + e.b * Math.sin(rad) * Math.cos(e.angle);

            const x = Math.round(px), y = Math.round(py);
            if (x >= 0 && x < width && y >= 0 && y < height) {
                const idx = (y * width + x) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }

        // Draw center
        for (let d = -2; d <= 2; d++) {
            const cx = Math.round(e.cx), cy = Math.round(e.cy);
            if (cx + d >= 0 && cx + d < width && cy >= 0 && cy < height) {
                const idx = (cy * width + cx + d) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        ellipses: ellipses.length
    });
};

function floodFillContour(edges, labels, width, height, startX, startY, label, points) {
    const queue = [[startX, startY]];

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (edges[idx] === 0 || labels[idx] !== 0) continue;

        labels[idx] = label;
        points.push({ x, y });

        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
}

function fitEllipse(points) {
    if (points.length < 5) return null;

    // Calculate centroid
    let cx = 0, cy = 0;
    for (const p of points) {
        cx += p.x;
        cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    // Calculate covariance matrix
    let cxx = 0, cyy = 0, cxy = 0;
    for (const p of points) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        cxx += dx * dx;
        cyy += dy * dy;
        cxy += dx * dy;
    }
    cxx /= points.length;
    cyy /= points.length;
    cxy /= points.length;

    // Eigenvalue decomposition
    const trace = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const discriminant = trace * trace / 4 - det;

    if (discriminant < 0) return null;

    const sqrtD = Math.sqrt(discriminant);
    const lambda1 = trace / 2 + sqrtD;
    const lambda2 = trace / 2 - sqrtD;

    const a = Math.sqrt(lambda1) * 2;
    const b = Math.sqrt(lambda2) * 2;

    // Calculate angle
    let angle = 0;
    if (cxy !== 0) {
        angle = Math.atan2(lambda1 - cxx, cxy);
    } else if (cxx > cyy) {
        angle = 0;
    } else {
        angle = Math.PI / 2;
    }

    return { cx, cy, a, b, angle };
}

function ellipseDistance(x, y, e) {
    const dx = x - e.cx;
    const dy = y - e.cy;
    const rx = dx * Math.cos(-e.angle) - dy * Math.sin(-e.angle);
    const ry = dx * Math.sin(-e.angle) + dy * Math.cos(-e.angle);

    const normalized = Math.sqrt(rx * rx / (e.a * e.a) + ry * ry / (e.b * e.b));
    return Math.abs(normalized - 1) * Math.sqrt(e.a * e.b);
}
