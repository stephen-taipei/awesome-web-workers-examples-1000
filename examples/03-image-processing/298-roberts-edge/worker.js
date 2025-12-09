/**
 * Roberts Edge Detection Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_ROBERTS':
            applyRoberts(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyRoberts(payload) {
    const { imageData, mode, threshold } = payload;
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

    // Roberts Cross Kernels
    // Gx:
    //  1  0
    //  0 -1
    // Gy:
    //  0  1
    // -1  0

    // Only iterate up to width-1 and height-1 because kernel is 2x2
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const p00 = grayData[y*width + x];
            const p01 = grayData[y*width + (x+1)];
            const p10 = grayData[(y+1)*width + x];
            const p11 = grayData[(y+1)*width + (x+1)];

            const gx = p00 - p11;
            const gy = p01 - p10;

            let val = Math.sqrt(gx*gx + gy*gy);

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
            mode: mode,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}
