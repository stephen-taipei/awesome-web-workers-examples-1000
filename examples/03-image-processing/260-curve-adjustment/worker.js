/**
 * 曲線調整 Web Worker
 *
 * 功能：使用 LUT 查找表對影像進行曲線調整
 * 技術：預計算查找表、逐像素處理
 *
 * @description
 * 此 Worker 接收影像數據和曲線控制點，
 * 計算 LUT 查找表，並套用到影像的每個像素上。
 */

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload);
            break;

        case 'GENERATE_LUT':
            handleGenerateLUT(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心處理 =====

/**
 * 處理影像曲線調整
 * @param {Object} payload - 處理參數
 */
function handleProcess(payload) {
    const { imageData, curves } = payload;
    const startTime = performance.now();

    sendProgress(0, '正在生成 LUT 查找表...');

    // 為每個通道生成 LUT
    const lutR = generateLUT(curves.r || curves.rgb);
    const lutG = generateLUT(curves.g || curves.rgb);
    const lutB = generateLUT(curves.b || curves.rgb);

    sendProgress(20, '正在套用曲線調整...');

    // 複製像素數據
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = data.length / 4;
    const progressInterval = Math.floor(totalPixels / 10);

    // 逐像素處理
    for (let i = 0; i < data.length; i += 4) {
        data[i] = lutR[data[i]];         // R
        data[i + 1] = lutG[data[i + 1]]; // G
        data[i + 2] = lutB[data[i + 2]]; // B
        // Alpha 保持不變

        // 更新進度
        if ((i / 4) % progressInterval === 0) {
            const progress = 20 + Math.floor((i / data.length) * 80);
            sendProgress(progress, `處理中... ${Math.floor((i / data.length) * 100)}%`);
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
 * 處理生成 LUT 預覽請求
 * @param {Object} payload - 曲線參數
 */
function handleGenerateLUT(payload) {
    const { points } = payload;
    const lut = generateLUT(points);

    self.postMessage({
        type: 'LUT_RESULT',
        payload: { lut }
    });
}

// ===== LUT 生成 =====

/**
 * 根據控制點生成 256 值的 LUT
 * 使用 Cubic Spline 插值產生平滑曲線
 * @param {Array} points - 控制點陣列 [{x, y}, ...]
 * @returns {Uint8Array} 256 個輸出值的查找表
 */
function generateLUT(points) {
    const lut = new Uint8Array(256);

    if (!points || points.length === 0) {
        // 預設為線性映射
        for (let i = 0; i < 256; i++) {
            lut[i] = i;
        }
        return lut;
    }

    // 排序控制點
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    // 確保有起點和終點
    if (sortedPoints[0].x > 0) {
        sortedPoints.unshift({ x: 0, y: sortedPoints[0].y });
    }
    if (sortedPoints[sortedPoints.length - 1].x < 255) {
        sortedPoints.push({ x: 255, y: sortedPoints[sortedPoints.length - 1].y });
    }

    // 使用 Catmull-Rom Spline 進行插值
    for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(interpolateCatmullRom(sortedPoints, i));
        lut[i] = Math.max(0, Math.min(255, lut[i]));
    }

    return lut;
}

/**
 * Catmull-Rom Spline 插值
 * @param {Array} points - 控制點陣列
 * @param {number} x - 要插值的 x 值
 * @returns {number} 插值結果 y 值
 */
function interpolateCatmullRom(points, x) {
    // 找到 x 所在的區間
    let i = 0;
    while (i < points.length - 1 && points[i + 1].x < x) {
        i++;
    }

    // 如果超出範圍，返回邊界值
    if (i === 0 && x < points[0].x) {
        return points[0].y;
    }
    if (i >= points.length - 1) {
        return points[points.length - 1].y;
    }

    // 取得四個控制點（包含前後各一個點用於平滑）
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // 計算區間內的 t 值 (0-1)
    const t = (x - p1.x) / (p2.x - p1.x || 1);

    // Catmull-Rom 公式
    const t2 = t * t;
    const t3 = t2 * t;

    const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return y;
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
