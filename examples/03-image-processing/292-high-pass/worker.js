/**
 * 高反差保留 Web Worker
 *
 * 算法：
 * 1. 對原圖進行高斯模糊（使用分開的 Box Blur 近似）
 * 2. HighPass = Original - Blurred + 128
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_HIGH_PASS':
            applyHighPass(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyHighPass(payload) {
    const { imageData, radius } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;

    // 1. 複製原始數據，因為我們要計算 Original - Blurred
    // 使用 Uint8Array 以避免 ClampedArray 的自動截斷，方便計算
    // 但最後結果需要是 Uint8ClampedArray
    const srcData = new Uint8ClampedArray(imageData.data);

    // 2. 計算模糊圖像 (使用簡單的 Box Blur 近似高斯模糊，執行 3 次以獲得更好的品質)
    // 為了效能，這裡先做一次 Box Blur 即可，或者使用 Separable Convolution
    // 這裡實作一個簡單的 Box Blur
    const blurredData = boxBlur(srcData, width, height, Math.round(radius));

    // 3. 計算 High Pass
    // HighPass = Original - Blurred + 128
    const dstData = new Uint8ClampedArray(srcData.length);

    for (let i = 0; i < srcData.length; i += 4) {
        // R
        dstData[i] = srcData[i] - blurredData[i] + 128;
        // G
        dstData[i+1] = srcData[i+1] - blurredData[i+1] + 128;
        // B
        dstData[i+2] = srcData[i+2] - blurredData[i+2] + 128;
        // A
        dstData[i+3] = srcData[i+3];
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: new ImageData(dstData, width, height),
            radius: radius,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}

/**
 * 簡單的 Box Blur 實作
 * @param {Uint8ClampedArray} src - 來源數據
 * @param {number} w - 寬度
 * @param {number} h - 高度
 * @param {number} r - 半徑
 * @returns {Uint8Array} - 模糊後的數據
 */
function boxBlur(src, w, h, r) {
    if (r < 1) return new Uint8Array(src); // 半徑小於 1 直接回傳原圖

    const len = src.length;
    const dst = new Uint8Array(len);

    // 為了效能簡化，這裡使用一個簡單的水平+垂直兩次遍歷的 box blur
    // 這比二維卷積快很多 (O(1) per pixel with sliding window, but O(R) naive)
    // 這裡實作 naive 的分離式

    const temp = new Uint8Array(len);

    // 水平方向
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r_sum = 0, g_sum = 0, b_sum = 0, count = 0;

            for (let i = -r; i <= r; i++) {
                const nx = x + i;
                if (nx >= 0 && nx < w) {
                    const idx = (y * w + nx) * 4;
                    r_sum += src[idx];
                    g_sum += src[idx+1];
                    b_sum += src[idx+2];
                    count++;
                }
            }

            const idx = (y * w + x) * 4;
            temp[idx] = r_sum / count;
            temp[idx+1] = g_sum / count;
            temp[idx+2] = b_sum / count;
            temp[idx+3] = src[idx+3];
        }
    }

    // 垂直方向
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            let r_sum = 0, g_sum = 0, b_sum = 0, count = 0;

            for (let i = -r; i <= r; i++) {
                const ny = y + i;
                if (ny >= 0 && ny < h) {
                    const idx = (ny * w + x) * 4;
                    r_sum += temp[idx];
                    g_sum += temp[idx+1];
                    b_sum += temp[idx+2];
                    count++;
                }
            }

            const idx = (y * w + x) * 4;
            dst[idx] = r_sum / count;
            dst[idx+1] = g_sum / count;
            dst[idx+2] = b_sum / count;
            dst[idx+3] = temp[idx+3];
        }
    }

    return dst;
}
