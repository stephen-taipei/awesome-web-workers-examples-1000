/**
 * 色彩校正 Web Worker
 *
 * 功能：使用色彩矩陣進行圖片色偏校正
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 標準白點色溫參考值 =====
const WHITE_POINTS = {
    d65: { r: 0.9505, g: 1.0000, b: 1.0890 },
    d50: { r: 0.9642, g: 1.0000, b: 0.8251 },
    tungsten: { r: 1.0985, g: 1.0000, b: 0.3558 }
};

// ===== 訊息處理 =====
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            handleColorCorrection(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心演算法 =====
function handleColorCorrection(payload) {
    const { imageData, whitePoint, intensity } = payload;
    const startTime = performance.now();

    try {
        sendProgress(0, '開始處理...');

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelCount = width * height;

        // 階段 1：分析圖片白點 (0-40%)
        sendProgress(5, '分析圖片色彩...');

        let sourceWhitePoint;

        if (whitePoint === 'auto') {
            // 自動偵測：找出最亮的像素區域
            let brightR = 0, brightG = 0, brightB = 0;
            let brightCount = 0;

            for (let i = 0; i < data.length; i += 4) {
                const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

                if (brightness > 240) {
                    brightR += data[i];
                    brightG += data[i + 1];
                    brightB += data[i + 2];
                    brightCount++;
                }

                // 更新進度
                if (i % 200000 === 0) {
                    const progress = Math.floor((i / data.length) * 35);
                    sendProgress(progress, `分析像素... ${Math.floor(i / 4)} / ${pixelCount}`);
                }
            }

            if (brightCount > 0) {
                sourceWhitePoint = {
                    r: brightR / brightCount / 255,
                    g: brightG / brightCount / 255,
                    b: brightB / brightCount / 255
                };
            } else {
                // 如果沒有足夠亮的像素，使用平均值
                let sumR = 0, sumG = 0, sumB = 0;
                for (let i = 0; i < data.length; i += 4) {
                    sumR += data[i];
                    sumG += data[i + 1];
                    sumB += data[i + 2];
                }
                sourceWhitePoint = {
                    r: sumR / pixelCount / 255,
                    g: sumG / pixelCount / 255,
                    b: sumB / pixelCount / 255
                };
            }
        } else {
            sourceWhitePoint = WHITE_POINTS[whitePoint];
        }

        sendProgress(40, '白點分析完成');

        // 階段 2：計算校正矩陣 (40-50%)
        sendProgress(45, '計算校正矩陣...');

        const targetWhitePoint = { r: 1, g: 1, b: 1 };

        // 計算色彩校正矩陣 (對角矩陣)
        let matrix = {
            r: targetWhitePoint.r / sourceWhitePoint.r,
            g: targetWhitePoint.g / sourceWhitePoint.g,
            b: targetWhitePoint.b / sourceWhitePoint.b
        };

        // 應用強度
        matrix = {
            r: 1 + (matrix.r - 1) * intensity,
            g: 1 + (matrix.g - 1) * intensity,
            b: 1 + (matrix.b - 1) * intensity
        };

        sendProgress(50, '校正矩陣計算完成');

        // 階段 3：應用色彩校正 (50-100%)
        sendProgress(55, '應用色彩校正...');

        const resultData = new Uint8ClampedArray(data.length);
        let lastProgress = 55;

        for (let i = 0; i < data.length; i += 4) {
            // 應用色彩矩陣
            resultData[i] = Math.min(255, Math.max(0, Math.round(data[i] * matrix.r)));
            resultData[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * matrix.g)));
            resultData[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * matrix.b)));
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
                    whitePoint: whitePoint,
                    sourceWhitePoint: {
                        r: (sourceWhitePoint.r * 255).toFixed(0),
                        g: (sourceWhitePoint.g * 255).toFixed(0),
                        b: (sourceWhitePoint.b * 255).toFixed(0)
                    },
                    correctionMatrix: {
                        r: matrix.r.toFixed(3),
                        g: matrix.g.toFixed(3),
                        b: matrix.b.toFixed(3)
                    },
                    intensity: intensity
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
