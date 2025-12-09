/**
 * Laplacian of Gaussian (LoG) Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_LOG':
            applyLoG(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyLoG(payload) {
    const { imageData, sigma, mode, threshold } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;

    // 1. 生成 LoG Kernel
    const { kernel, size } = createLoGKernel(sigma);

    // 2. 轉換為灰階
    const srcData = new Uint8ClampedArray(imageData.data);
    const grayData = new Float32Array(width * height); // Use Float32 for precision

    for (let i = 0; i < width * height; i++) {
        grayData[i] = 0.299 * srcData[i*4] + 0.587 * srcData[i*4+1] + 0.114 * srcData[i*4+2];
    }

    // 3. 卷積運算
    const outputData = new Float32Array(width * height); // Store raw convolution result
    const halfSize = Math.floor(size / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;

            for (let ky = -halfSize; ky <= halfSize; ky++) {
                for (let kx = -halfSize; kx <= halfSize; kx++) {
                    const ny = y + ky;
                    const nx = x + kx;

                    // Mirror boundary
                    let iy = ny;
                    let ix = nx;
                    if (iy < 0) iy = -iy;
                    if (iy >= height) iy = 2 * height - iy - 1; // Not perfect but ok
                    if (ix < 0) ix = -ix;
                    if (ix >= width) ix = 2 * width - ix - 1;

                    if (iy >= 0 && iy < height && ix >= 0 && ix < width) {
                         const val = grayData[iy * width + ix];
                         const kVal = kernel[(ky + halfSize) * size + (kx + halfSize)];
                         sum += val * kVal;
                    }
                }
            }
            outputData[y * width + x] = sum;
        }

        if (y % 20 === 0) {
            self.postMessage({ type: 'PROGRESS', payload: { percent: Math.round(y/height*50), message: '卷積處理中...' } });
        }
    }

    // 4. 處理輸出 (Zero Crossing or Gray)
    const dstData = new Uint8ClampedArray(srcData.length);

    if (mode === 'binary') { // Zero Crossing
        // Find zero crossings
        // We look for sign changes in 3x3 neighborhood.
        // If there is a sign change and the magnitude difference is above threshold, mark as edge.

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const val = outputData[y * width + x];
                let isEdge = false;
                let maxDiff = 0;

                // Check opposite neighbors: (N, S), (W, E), (NW, SE), (NE, SW)
                const pairs = [
                    [outputData[(y-1)*width+x], outputData[(y+1)*width+x]], // N-S
                    [outputData[y*width+(x-1)], outputData[y*width+(x+1)]], // W-E
                    [outputData[(y-1)*width+(x-1)], outputData[(y+1)*width+(x+1)]], // NW-SE
                    [outputData[(y-1)*width+(x+1)], outputData[(y+1)*width+(x-1)]]  // NE-SW
                ];

                for (const pair of pairs) {
                    const p1 = pair[0];
                    const p2 = pair[1];
                    // If signs are different
                    if (p1 * p2 < 0) {
                        const diff = Math.abs(p1 - p2);
                        if (diff > maxDiff) maxDiff = diff;
                    }
                }

                if (maxDiff > threshold) { // Apply threshold
                    isEdge = true;
                }

                const pixelVal = isEdge ? 255 : 0;
                const idx = (y * width + x) * 4;
                dstData[idx] = pixelVal;
                dstData[idx+1] = pixelVal;
                dstData[idx+2] = pixelVal;
                dstData[idx+3] = 255;
            }
            if (y % 20 === 0) {
                 self.postMessage({ type: 'PROGRESS', payload: { percent: 50 + Math.round(y/height*50), message: '零交叉檢測中...' } });
            }
        }
    } else { // Gray
        // Find min/max for normalization or just scaling
        // LoG responses can be positive or negative. We usually map 0 to 128.
        // Or take absolute value. Let's map to 0-255 with 128 as zero.

        // Find reasonable scale
        let maxVal = 0;
        for(let i=0; i<outputData.length; i++) {
            const abs = Math.abs(outputData[i]);
            if(abs > maxVal) maxVal = abs;
        }

        // Avoid division by zero
        if(maxVal === 0) maxVal = 1;

        for (let i = 0; i < width * height; i++) {
             let v = outputData[i];
             // Normalize to -127 to 127 then add 128? Or Absolute?
             // Standard visualization is often adding 128.
             let displayVal = (v / maxVal * 127.5) + 128;

             // Or absolute value for magnitude
             // displayVal = Math.abs(v) / maxVal * 255;

             // Let's use 128 offset for standard LoG look
             displayVal = Math.max(0, Math.min(255, displayVal));

             const idx = i * 4;
             dstData[idx] = displayVal;
             dstData[idx+1] = displayVal;
             dstData[idx+2] = displayVal;
             dstData[idx+3] = 255;
        }
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: new ImageData(dstData, width, height),
            sigma: sigma,
            kernelSize: size,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}

function createLoGKernel(sigma) {
    // Kernel size rule of thumb: ceil(sigma * 6) ensure it's odd
    let size = Math.ceil(sigma * 6);
    if (size % 2 === 0) size++;

    const half = Math.floor(size / 2);
    const kernel = new Float32Array(size * size);
    let sum = 0; // The sum of LoG kernel should be 0. We might need to adjust.

    const sigma2 = sigma * sigma;
    const sigma4 = sigma2 * sigma2;

    for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
            const r2 = x*x + y*y;
            // LoG Formula: -1/(pi*sigma^4) * (1 - r^2/(2*sigma^2)) * e^(-r^2/(2*sigma^2))
            // We can drop constant factor 1/(pi*sigma^4) as we normalize or scale later,
            // but let's keep the shape correct.

            const val = -(1.0 / (Math.PI * sigma4)) * (1.0 - r2 / (2.0 * sigma2)) * Math.exp(-r2 / (2.0 * sigma2));

            kernel[(y + half) * size + (x + half)] = val;
            sum += val;
        }
    }

    // Correct mean to be 0 (subtract mean)
    const mean = sum / (size * size);
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] -= mean;
    }

    return { kernel, size };
}
