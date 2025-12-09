/**
 * 自動對比 Web Worker
 *
 * 功能：使用百分位數映射自動調整圖片對比度
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 訊息處理 =====
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            handleAutoContrast(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心演算法 =====
function handleAutoContrast(payload) {
    const { imageData, lowPercentile, highPercentile } = payload;
    const startTime = performance.now();

    try {
        sendProgress(0, '開始處理...');

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelCount = width * height;

        // 階段 1：計算直方圖 (0-30%)
        sendProgress(5, '計算直方圖...');
        const histR = new Uint32Array(256);
        const histG = new Uint32Array(256);
        const histB = new Uint32Array(256);

        for (let i = 0; i < data.length; i += 4) {
            histR[data[i]]++;
            histG[data[i + 1]]++;
            histB[data[i + 2]]++;
        }

        sendProgress(30, '直方圖計算完成');

        // 階段 2：計算累積直方圖 (30-40%)
        sendProgress(35, '計算累積分布...');
        const cdfR = new Uint32Array(256);
        const cdfG = new Uint32Array(256);
        const cdfB = new Uint32Array(256);

        cdfR[0] = histR[0];
        cdfG[0] = histG[0];
        cdfB[0] = histB[0];

        for (let i = 1; i < 256; i++) {
            cdfR[i] = cdfR[i - 1] + histR[i];
            cdfG[i] = cdfG[i - 1] + histG[i];
            cdfB[i] = cdfB[i - 1] + histB[i];
        }

        sendProgress(40, '累積分布計算完成');

        // 階段 3：計算裁剪閾值 (40-50%)
        sendProgress(45, '計算裁剪閾值...');
        const lowThreshold = Math.floor(pixelCount * lowPercentile / 100);
        const highThreshold = Math.floor(pixelCount * (100 - highPercentile) / 100);

        function findBounds(cdf) {
            let low = 0, high = 255;
            for (let i = 0; i < 256; i++) {
                if (cdf[i] >= lowThreshold) {
                    low = i;
                    break;
                }
            }
            for (let i = 255; i >= 0; i--) {
                if (cdf[i] <= highThreshold) {
                    high = i;
                    break;
                }
            }
            return { low, high };
        }

        const boundsR = findBounds(cdfR);
        const boundsG = findBounds(cdfG);
        const boundsB = findBounds(cdfB);

        sendProgress(50, '閾值計算完成');

        // 階段 4：建立查找表 (50-60%)
        sendProgress(55, '建立映射表...');

        function createLUT(bounds) {
            const lut = new Uint8ClampedArray(256);
            const range = bounds.high - bounds.low;
            if (range === 0) {
                for (let i = 0; i < 256; i++) lut[i] = i;
            } else {
                for (let i = 0; i < 256; i++) {
                    if (i <= bounds.low) {
                        lut[i] = 0;
                    } else if (i >= bounds.high) {
                        lut[i] = 255;
                    } else {
                        lut[i] = Math.round((i - bounds.low) * 255 / range);
                    }
                }
            }
            return lut;
        }

        const lutR = createLUT(boundsR);
        const lutG = createLUT(boundsG);
        const lutB = createLUT(boundsB);

        sendProgress(60, '映射表建立完成');

        // 階段 5：應用映射 (60-100%)
        sendProgress(65, '應用對比調整...');

        const resultData = new Uint8ClampedArray(data.length);
        const totalPixels = data.length;
        let lastProgress = 65;

        for (let i = 0; i < data.length; i += 4) {
            resultData[i] = lutR[data[i]];
            resultData[i + 1] = lutG[data[i + 1]];
            resultData[i + 2] = lutB[data[i + 2]];
            resultData[i + 3] = data[i + 3]; // 保持 alpha 通道

            // 更新進度
            if (i % 100000 === 0) {
                const progress = 65 + Math.floor((i / totalPixels) * 35);
                if (progress > lastProgress) {
                    sendProgress(progress, `處理像素... ${Math.floor(i / 4)} / ${Math.floor(totalPixels / 4)}`);
                    lastProgress = progress;
                }
            }
        }

        sendProgress(100, '處理完成');

        const duration = performance.now() - startTime;

        // 發送結果
        const resultImageData = new ImageData(resultData, width, height);

        self.postMessage({
            type: 'RESULT',
            payload: {
                imageData: resultImageData,
                stats: {
                    boundsR,
                    boundsG,
                    boundsB
                },
                duration: duration
            }
        }, [resultImageData.data.buffer]);

    } catch (error) {
        sendError(error.message);
    }
}

// ===== 通訊函數 =====
function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
