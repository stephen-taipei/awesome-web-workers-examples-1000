/**
 * Sobel Edge Detection Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_SOBEL':
            applySobel(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applySobel(payload) {
    const { imageData, mode, threshold } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const srcData = new Uint8ClampedArray(imageData.data);
    const dstData = new Uint8ClampedArray(srcData.length);

    // 先轉為灰階，方便計算
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = srcData[i * 4];
        const g = srcData[i * 4 + 1];
        const b = srcData[i * 4 + 2];
        grayData[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Sobel Kernels
    // Gx: -1 0 1, -2 0 2, -1 0 1
    // Gy: -1 -2 -1, 0 0 0, 1 2 1

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            // 取樣 3x3 區域
            const i00 = grayData[(y-1)*width + (x-1)];
            const i01 = grayData[(y-1)*width + x];
            const i02 = grayData[(y-1)*width + (x+1)];
            const i10 = grayData[y*width + (x-1)];
            // const i11 = center pixel, not used in Sobel
            const i12 = grayData[y*width + (x+1)];
            const i20 = grayData[(y+1)*width + (x-1)];
            const i21 = grayData[(y+1)*width + x];
            const i22 = grayData[(y+1)*width + (x+1)];

            const gx = -1*i00 + 1*i02 - 2*i10 + 2*i12 - 1*i20 + 1*i22;
            const gy = -1*i00 - 2*i01 - 1*i02 + 1*i20 + 2*i21 + 1*i22;

            let val = 0;
            let dir = 0;

            if (mode === 'direction') {
                // 計算方向，映射到顏色
                // atan2 returns -PI to PI
                const angle = Math.atan2(gy, gx);
                // Normalize to 0-255 or color wheel
                // 這裡簡單映射到 0-255 灰階，或者使用彩色表示方向會更好
                // 為了簡單起見，如果是 'direction' 模式，我們用 HSV 轉 RGB 顯示
                // Hue = angle
                // Saturation = 100%
                // Value = Magnitude (normalized)

                const mag = Math.sqrt(gx*gx + gy*gy);
                const hue = (angle + Math.PI) / (2 * Math.PI) * 360; // 0-360
                const rgb = hsvToRgb(hue, 1, Math.min(mag/255, 1)); // 簡單顯示

                const idx = (y * width + x) * 4;
                dstData[idx] = rgb[0];
                dstData[idx+1] = rgb[1];
                dstData[idx+2] = rgb[2];
                dstData[idx+3] = 255;
                continue;
            } else {
                // Magnitude
                val = Math.sqrt(gx*gx + gy*gy);
            }

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

function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
