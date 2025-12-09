self.onmessage = function(e) {
    const { imageData, scale, sharpen } = e.data;
    const startTime = performance.now();

    // 1. Bicubic Interpolation
    const upscaledData = bicubicUpscale(imageData, scale);

    self.postMessage({ type: 'progress', data: 50 });

    // 2. Unsharp Masking (Sharpening)
    const sharpenedData = unsharpMask(upscaledData, sharpen);

    self.postMessage({ type: 'progress', data: 100 });

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        data: {
            imageData: sharpenedData,
            time: Math.round(endTime - startTime)
        }
    });
};

function bicubicUpscale(source, scale) {
    const sw = source.width;
    const sh = source.height;
    const dw = sw * scale;
    const dh = sh * scale;
    const sData = source.data;
    const dBuffer = new Uint8ClampedArray(dw * dh * 4);

    for (let dy = 0; dy < dh; dy++) {
        for (let dx = 0; dx < dw; dx++) {
            // Map destination coordinate to source coordinate
            const sx = dx / scale;
            const sy = dy / scale;

            const px = Math.floor(sx);
            const py = Math.floor(sy);

            const fx = sx - px;
            const fy = sy - py;

            let r = 0, g = 0, b = 0, a = 0;

            // Bicubic interpolation requires 4x4 neighborhood
            for (let m = -1; m <= 2; m++) {
                for (let n = -1; n <= 2; n++) {
                    const sampleY = Math.min(Math.max(py + m, 0), sh - 1);
                    const sampleX = Math.min(Math.max(px + n, 0), sw - 1);
                    const sampleIdx = (sampleY * sw + sampleX) * 4;

                    // Weight calculation
                    const wx = cubic(n - fx);
                    const wy = cubic(m - fy);
                    const weight = wx * wy;

                    r += sData[sampleIdx] * weight;
                    g += sData[sampleIdx + 1] * weight;
                    b += sData[sampleIdx + 2] * weight;
                    a += sData[sampleIdx + 3] * weight;
                }
            }

            const destIdx = (dy * dw + dx) * 4;
            dBuffer[destIdx] = Math.min(Math.max(r, 0), 255);
            dBuffer[destIdx + 1] = Math.min(Math.max(g, 0), 255);
            dBuffer[destIdx + 2] = Math.min(Math.max(b, 0), 255);
            dBuffer[destIdx + 3] = Math.min(Math.max(a, 0), 255);
        }

        if (dy % 20 === 0) {
            self.postMessage({ type: 'progress', data: (dy / dh) * 50 });
        }
    }

    return new ImageData(dBuffer, dw, dh);
}

function cubic(x) {
    const a = -0.5;
    x = Math.abs(x);
    if (x <= 1) {
        return (a + 2) * x * x * x - (a + 3) * x * x + 1;
    } else if (x < 2) {
        return a * x * x * x - 5 * a * x * x + 8 * a * x - 4 * a;
    }
    return 0;
}

function unsharpMask(imageData, amount) {
    if (amount <= 0) return imageData;

    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const outputBuffer = new Uint8ClampedArray(data.length);

    // Simple 3x3 Gaussian Blur Kernel approximation for unsharp mask
    // Or we can just use the difference between pixel and local average

    const side = 1; // 3x3 kernel

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let rTotal = 0, gTotal = 0, bTotal = 0;
            let count = 0;

            // Calculate local average (blurred version)
            for (let dy = -side; dy <= side; dy++) {
                for (let dx = -side; dx <= side; dx++) {
                    const ny = Math.min(Math.max(y + dy, 0), h - 1);
                    const nx = Math.min(Math.max(x + dx, 0), w - 1);
                    const idx = (ny * w + nx) * 4;

                    rTotal += data[idx];
                    gTotal += data[idx + 1];
                    bTotal += data[idx + 2];
                    count++;
                }
            }

            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            const rAvg = rTotal / count;
            const gAvg = gTotal / count;
            const bAvg = bTotal / count;

            // Apply unsharp mask formula: Original + (Original - Blurred) * Amount
            outputBuffer[idx] = Math.min(Math.max(r + (r - rAvg) * amount * 2, 0), 255);
            outputBuffer[idx + 1] = Math.min(Math.max(g + (g - gAvg) * amount * 2, 0), 255);
            outputBuffer[idx + 2] = Math.min(Math.max(b + (b - bAvg) * amount * 2, 0), 255);
            outputBuffer[idx + 3] = a;
        }

        if (y % 50 === 0) {
            self.postMessage({ type: 'progress', data: 50 + (y / h) * 50 });
        }
    }

    return new ImageData(outputBuffer, w, h);
}
