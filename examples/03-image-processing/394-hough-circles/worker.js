self.onmessage = function(e) {
    const { imageData, minRadius, maxRadius } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Edge detection
    const edges = new Uint8Array(width * height);
    const gradX = new Float32Array(width * height);
    const gradY = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = gray[idx + 1] - gray[idx - 1];
            const gy = gray[idx + width] - gray[idx - width];
            const mag = Math.sqrt(gx * gx + gy * gy);

            gradX[idx] = gx;
            gradY[idx] = gy;
            edges[idx] = mag > 30 ? 255 : 0;
        }
    }

    // Hough circle detection (simplified)
    const circles = [];
    const radiusRange = maxRadius - minRadius + 1;

    // For each radius
    for (let r = minRadius; r <= maxRadius; r += 2) {
        const accumulator = new Uint16Array(width * height);

        // Vote for each edge point
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (edges[y * width + x] === 0) continue;

                // Use gradient direction
                const idx = y * width + x;
                const gx = gradX[idx];
                const gy = gradY[idx];
                const mag = Math.sqrt(gx * gx + gy * gy);

                if (mag > 0) {
                    const dx = gx / mag;
                    const dy = gy / mag;

                    // Vote in both directions along gradient
                    for (const sign of [1, -1]) {
                        const cx = Math.round(x + sign * dx * r);
                        const cy = Math.round(y + sign * dy * r);

                        if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
                            accumulator[cy * width + cx]++;
                        }
                    }
                }
            }
        }

        // Find peaks
        const threshold = Math.floor(2 * Math.PI * r * 0.3);

        for (let y = r; y < height - r; y++) {
            for (let x = r; x < width - r; x++) {
                const idx = y * width + x;
                if (accumulator[idx] > threshold) {
                    // Local maximum check
                    let isMax = true;
                    for (let dy = -3; dy <= 3 && isMax; dy++) {
                        for (let dx = -3; dx <= 3 && isMax; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx, ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                if (accumulator[ny * width + nx] > accumulator[idx]) {
                                    isMax = false;
                                }
                            }
                        }
                    }

                    if (isMax) {
                        // Check if not too close to existing circles
                        let tooClose = false;
                        for (const c of circles) {
                            const dist = Math.sqrt(Math.pow(c.x - x, 2) + Math.pow(c.y - y, 2));
                            if (dist < Math.min(c.r, r)) {
                                tooClose = true;
                                break;
                            }
                        }

                        if (!tooClose) {
                            circles.push({ x, y, r, votes: accumulator[idx] });
                        }
                    }
                }
            }
        }
    }

    // Sort by votes and take top circles
    circles.sort((a, b) => b.votes - a.votes);
    const topCircles = circles.slice(0, 10);

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw circles
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255]];

    for (let i = 0; i < topCircles.length; i++) {
        const { x: cx, y: cy, r } = topCircles[i];
        const color = colors[i % colors.length];

        // Draw circle
        for (let angle = 0; angle < 360; angle++) {
            const rad = angle * Math.PI / 180;
            const px = Math.round(cx + r * Math.cos(rad));
            const py = Math.round(cy + r * Math.sin(rad));

            if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }

        // Draw center
        for (let d = -2; d <= 2; d++) {
            if (cx + d >= 0 && cx + d < width) {
                const idx = (cy * width + cx + d) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
            if (cy + d >= 0 && cy + d < height) {
                const idx = ((cy + d) * width + cx) * 4;
                output[idx] = color[0];
                output[idx + 1] = color[1];
                output[idx + 2] = color[2];
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        circles: topCircles.length
    });
};
