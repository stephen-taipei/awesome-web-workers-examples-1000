/**
 * Laplacian Edge Detection Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_LAPLACIAN':
            applyLaplacian(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyLaplacian(payload) {
    const { imageData, kernelType, mode, threshold } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const srcData = new Uint8ClampedArray(imageData.data);
    const dstData = new Uint8ClampedArray(srcData.length);

    // 灰階
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = srcData[i * 4];
        const g = srcData[i * 4 + 1];
        const b = srcData[i * 4 + 2];
        grayData[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Laplacian Kernels
    // Basic (4-neighbor):
    //  0  1  0
    //  1 -4  1
    //  0  1  0

    // Diagonal (8-neighbor):
    //  1  1  1
    //  1 -8  1
    //  1  1  1

    const isBasic = kernelType === 'basic';

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let lap = 0;

            // Center
            const c = grayData[y*width + x];

            // Neighbors
            const n = grayData[(y-1)*width + x];
            const s = grayData[(y+1)*width + x];
            const w = grayData[y*width + (x-1)];
            const e = grayData[y*width + (x+1)];

            if (isBasic) {
                lap = n + s + w + e - 4*c;
            } else {
                const nw = grayData[(y-1)*width + (x-1)];
                const ne = grayData[(y-1)*width + (x+1)];
                const sw = grayData[(y+1)*width + (x-1)];
                const se = grayData[(y+1)*width + (x+1)];
                lap = nw + n + ne + w + e + sw + s + se - 8*c;
            }

            // lap value can be negative or > 255.
            // We usually take absolute value or clamp, or add 128 offset.
            // Here we take absolute value to show edges.
            // Or for edge enhancement we subtract from original image.
            // But this is "Edge Detection", so we show edges.

            let val = Math.abs(lap);

            // Scale if needed? Usually not for display.
            // Clamp to 0-255
            val = Math.min(255, Math.max(0, val));

            if (mode === 'binary') {
                val = val >= threshold ? 255 : 0;
            }

            const idx = (y * width + x) * 4;
            dstData[idx] = val;
            dstData[idx+1] = val;
            dstData[idx+2] = val;
            dstData[idx+3] = 255;
        }

        if (y % 50 === 0) {
            self.postMessage({ type: 'PROGRESS', payload: { percent: Math.round(y/height*100), message: '處理中...' } });
        }
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: new ImageData(dstData, width, height),
            kernelType: kernelType,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}
