/**
 * 白平衡校正 Web Worker
 *
 * 功能：使用灰度世界演算法等方法自動校正圖片白平衡
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 訊息處理 =====
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            handleWhiteBalance(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心演算法 =====
function handleWhiteBalance(payload) {
    const { imageData, algorithm } = payload;
    const startTime = performance.now();

    try {
        sendProgress(0, '開始處理...');

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelCount = width * height;

        // 階段 1：計算像素統計資料 (0-40%)
        sendProgress(5, '分析圖片色彩...');

        let sumR = 0, sumG = 0, sumB = 0;
        let maxR = 0, maxG = 0, maxB = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            sumR += r;
            sumG += g;
            sumB += b;

            if (r > maxR) maxR = r;
            if (g > maxG) maxG = g;
            if (b > maxB) maxB = b;

            // 更新進度
            if (i % 200000 === 0) {
                const progress = Math.floor((i / data.length) * 40);
                sendProgress(progress, `分析像素... ${Math.floor(i / 4)} / ${pixelCount}`);
            }
        }

        const avgR = sumR / pixelCount;
        const avgG = sumG / pixelCount;
        const avgB = sumB / pixelCount;
        const avgGray = (avgR + avgG + avgB) / 3;

        sendProgress(40, '色彩分析完成');

        // 階段 2：計算校正增益 (40-50%)
        sendProgress(45, '計算校正參數...');

        let gains = { r: 1, g: 1, b: 1 };

        switch (algorithm) {
            case 'gray-world':
                // 灰度世界假設：場景平均反射為中性灰
                gains = {
                    r: avgGray / avgR,
                    g: avgGray / avgG,
                    b: avgGray / avgB
                };
                break;

            case 'white-patch':
                // 白塊法：假設最亮的區域應該是白色
                const maxVal = Math.max(maxR, maxG, maxB);
                gains = {
                    r: maxVal / maxR,
                    g: maxVal / maxG,
                    b: maxVal / maxB
                };
                break;

            case 'combined':
                // 混合模式：結合兩種方法
                const grayWorldGains = {
                    r: avgGray / avgR,
                    g: avgGray / avgG,
                    b: avgGray / avgB
                };
                const maxValue = Math.max(maxR, maxG, maxB);
                const whitePatchGains = {
                    r: maxValue / maxR,
                    g: maxValue / maxG,
                    b: maxValue / maxB
                };
                gains = {
                    r: (grayWorldGains.r + whitePatchGains.r) / 2,
                    g: (grayWorldGains.g + whitePatchGains.g) / 2,
                    b: (grayWorldGains.b + whitePatchGains.b) / 2
                };
                break;

            default:
                gains = { r: avgGray / avgR, g: avgGray / avgG, b: avgGray / avgB };
        }

        sendProgress(50, '校正參數計算完成');

        // 階段 3：應用校正 (50-100%)
        sendProgress(55, '應用白平衡校正...');

        const resultData = new Uint8ClampedArray(data.length);
        let lastProgress = 55;

        for (let i = 0; i < data.length; i += 4) {
            // 應用增益並裁剪到有效範圍
            resultData[i] = Math.min(255, Math.round(data[i] * gains.r));
            resultData[i + 1] = Math.min(255, Math.round(data[i + 1] * gains.g));
            resultData[i + 2] = Math.min(255, Math.round(data[i + 2] * gains.b));
            resultData[i + 3] = data[i + 3]; // 保持 alpha 通道

            // 更新進度
            if (i % 100000 === 0) {
                const progress = 55 + Math.floor((i / data.length) * 45);
                if (progress > lastProgress) {
                    sendProgress(progress, `處理像素... ${Math.floor(i / 4)} / ${pixelCount}`);
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
                    algorithm: algorithm,
                    avgBefore: {
                        r: avgR.toFixed(2),
                        g: avgG.toFixed(2),
                        b: avgB.toFixed(2)
                    },
                    gains: {
                        r: gains.r.toFixed(3),
                        g: gains.g.toFixed(3),
                        b: gains.b.toFixed(3)
                    }
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
