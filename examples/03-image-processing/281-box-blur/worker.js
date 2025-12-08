/**
 * 均值模糊 Web Worker
 *
 * 功能：使用盒式濾波器實現圖片模糊效果
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此 Worker 接收圖片數據和模糊半徑，計算每個像素鄰域的平均值，
 * 實現均值模糊效果。
 *
 * 均值模糊公式：
 * 對於每個像素 P(x, y)，其模糊後的值為：
 * P'(x, y) = Σ P(x+i, y+j) / n
 * 其中 i, j ∈ [-radius, radius]，n = (2*radius+1)²
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 * 訊息格式：{ type: string, payload: any }
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'APPLY_BLUR':
            applyBoxBlur(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 均值模糊處理 =====

/**
 * 套用均值模糊
 * @param {Object} payload - 處理參數
 * @param {ImageData} payload.imageData - 圖片數據
 * @param {number} payload.radius - 模糊半徑
 */
function applyBoxBlur(payload) {
    const { imageData, radius } = payload;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(srcData.length);

    // 核心大小
    const kernelSize = 2 * radius + 1;
    const kernelArea = kernelSize * kernelSize;

    sendProgress(0, `開始處理 (半徑: ${radius}px, 核心: ${kernelSize}×${kernelSize})...`);

    // 進度更新間隔
    const progressInterval = Math.max(1, Math.floor(height / 20));

    // 遍歷每個像素
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            let count = 0;

            // 遍歷鄰域
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

                    // 邊界檢查 (使用邊緣延伸策略)
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        sumR += srcData[idx];
                        sumG += srcData[idx + 1];
                        sumB += srcData[idx + 2];
                        count++;
                    }
                }
            }

            // 計算平均值並寫入結果
            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = Math.round(sumR / count);
            dstData[dstIdx + 1] = Math.round(sumG / count);
            dstData[dstIdx + 2] = Math.round(sumB / count);
            dstData[dstIdx + 3] = srcData[dstIdx + 3]; // Alpha 保持不變
        }

        // 定期回報進度
        if (y % progressInterval === 0) {
            const progress = Math.floor((y / height) * 100);
            sendProgress(progress, `處理中... (${y}/${height} 行)`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '處理完成');

    // 建立新的 ImageData
    const resultData = new ImageData(dstData, width, height);

    // 發送結果
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: resultData,
            radius: radius,
            kernelSize: kernelSize,
            duration: duration
        }
    }, [resultData.data.buffer]);
}

// ===== 通訊函數 =====

/**
 * 發送進度更新
 * @param {number} percent - 進度百分比 (0-100)
 * @param {string} message - 進度訊息
 */
function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: {
            percent: percent,
            message: message
        }
    });
}

/**
 * 發送錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message: message
        }
    });
}
