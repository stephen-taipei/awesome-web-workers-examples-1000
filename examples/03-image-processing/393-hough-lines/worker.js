self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Apply Canny-like edge detection (simplified)
    const edges = new Uint8Array(width * height);
    const edgeThreshold = 50;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const gx = -gray[idx - width - 1] - 2 * gray[idx - 1] - gray[idx + width - 1] +
                        gray[idx - width + 1] + 2 * gray[idx + 1] + gray[idx + width + 1];
            const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
                        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[idx] = magnitude > edgeThreshold ? 255 : 0;
        }
    }

    // Hough transform
    const diagonal = Math.sqrt(width * width + height * height);
    const rhoMax = Math.ceil(diagonal);
    const thetaSteps = 180;
    const accumulator = new Uint32Array(rhoMax * 2 * thetaSteps);

    // Precompute sin/cos
    const sinTable = new Float32Array(thetaSteps);
    const cosTable = new Float32Array(thetaSteps);
    for (let t = 0; t < thetaSteps; t++) {
        const theta = (t * Math.PI) / thetaSteps;
        sinTable[t] = Math.sin(theta);
        cosTable[t] = Math.cos(theta);
    }

    // Vote
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (edges[y * width + x] > 0) {
                for (let t = 0; t < thetaSteps; t++) {
                    const rho = Math.round(x * cosTable[t] + y * sinTable[t]);
                    const rhoIdx = rho + rhoMax;
                    if (rhoIdx >= 0 && rhoIdx < rhoMax * 2) {
                        accumulator[rhoIdx * thetaSteps + t]++;
                    }
                }
            }
        }
    }

    // Find peaks
    const lines = [];
    for (let r = 0; r < rhoMax * 2; r++) {
        for (let t = 0; t < thetaSteps; t++) {
            if (accumulator[r * thetaSteps + t] > threshold) {
                // Local maximum check
                let isMax = true;
                for (let dr = -2; dr <= 2 && isMax; dr++) {
                    for (let dt = -2; dt <= 2 && isMax; dt++) {
                        if (dr === 0 && dt === 0) continue;
                        const nr = r + dr, nt = (t + dt + thetaSteps) % thetaSteps;
                        if (nr >= 0 && nr < rhoMax * 2) {
                            if (accumulator[nr * thetaSteps + nt] > accumulator[r * thetaSteps + t]) {
                                isMax = false;
                            }
                        }
                    }
                }

                if (isMax) {
                    const rho = r - rhoMax;
                    const theta = (t * Math.PI) / thetaSteps;
                    lines.push({ rho, theta, votes: accumulator[r * thetaSteps + t] });
                }
            }
        }
    }

    // Sort by votes and take top lines
    lines.sort((a, b) => b.votes - a.votes);
    const topLines = lines.slice(0, 20);

    // Create output image
    const output = new Uint8ClampedArray(data);

    // Draw lines
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255]];

    for (let i = 0; i < topLines.length; i++) {
        const { rho, theta } = topLines[i];
        const color = colors[i % colors.length];

        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Draw line by iterating through x or y depending on angle
        if (Math.abs(sinT) > 0.5) {
            for (let x = 0; x < width; x++) {
                const y = Math.round((rho - x * cosT) / sinT);
                if (y >= 0 && y < height) {
                    const idx = (y * width + x) * 4;
                    output[idx] = color[0];
                    output[idx + 1] = color[1];
                    output[idx + 2] = color[2];
                }
            }
        } else {
            for (let y = 0; y < height; y++) {
                const x = Math.round((rho - y * sinT) / cosT);
                if (x >= 0 && x < width) {
                    const idx = (y * width + x) * 4;
                    output[idx] = color[0];
                    output[idx + 1] = color[1];
                    output[idx + 2] = color[2];
                }
            }
        }
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        lines: topLines.length
    });
};
