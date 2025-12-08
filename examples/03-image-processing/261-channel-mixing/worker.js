/**
 * 通道混合 Web Worker
 *
 * 功能：使用 3×3 矩陣對影像進行通道混合
 * 技術：矩陣乘法、逐像素處理
 *
 * @description
 * 此 Worker 接收影像數據和混合矩陣，
 * 對每個像素執行矩陣乘法運算。
 *
 * 輸出 = 矩陣 × 輸入
 * [R']   [rr rg rb]   [R]
 * [G'] = [gr gg gb] × [G]
 * [B']   [br bg bb]   [B]
 */

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心處理 =====

/**
 * 處理影像通道混合
 * @param {Object} payload - 處理參數
 */
function handleProcess(payload) {
    const { imageData, matrix } = payload;
    const startTime = performance.now();

    sendProgress(0, '正在處理通道混合...');

    // 解構矩陣
    const { rr, rg, rb, gr, gg, gb, br, bg, bb } = matrix;

    // 複製像素數據
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = data.length / 4;
    const progressInterval = Math.floor(totalPixels / 20);

    // 逐像素處理
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 矩陣乘法
        data[i] = clamp(rr * r + rg * g + rb * b);     // R'
        data[i + 1] = clamp(gr * r + gg * g + gb * b); // G'
        data[i + 2] = clamp(br * r + bg * g + bb * b); // B'
        // Alpha 保持不變

        // 更新進度
        const pixelIndex = i / 4;
        if (pixelIndex % progressInterval === 0) {
            const progress = Math.floor((pixelIndex / totalPixels) * 100);
            sendProgress(progress, `處理中... ${progress}%`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '處理完成');

    // 回傳結果
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: {
                data: data,
                width: imageData.width,
                height: imageData.height
            },
            duration: duration,
            pixelCount: totalPixels
        }
    }, [data.buffer]);
}

/**
 * 將值限制在 0-255 範圍內
 * @param {number} value - 輸入值
 * @returns {number} 限制後的值
 */
function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
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
