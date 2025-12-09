/**
 * 閾值處理 Web Worker
 *
 * 功能：對影像進行閾值處理（二值化）
 * 技術：全域閾值、Otsu 自動閾值、自適應閾值
 *
 * @description
 * 此 Worker 接收影像數據和閾值參數，
 * 根據選擇的方法對每個像素進行閾值比較。
 */

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload);
            break;

        case 'CALCULATE_HISTOGRAM':
            handleCalculateHistogram(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心處理 =====

/**
 * 處理閾值運算
 * @param {Object} payload - 處理參數
 */
function handleProcess(payload) {
    const { imageData, method, threshold, outputMode, adaptiveParams } = payload;
    const startTime = performance.now();

    sendProgress(0, '正在轉換為灰階...');

    // 複製像素數據
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;

    // 先轉換為灰階
    const grayData = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        grayData[i] = Math.round(
            0.299 * data[idx] +
            0.587 * data[idx + 1] +
            0.114 * data[idx + 2]
        );
    }

    sendProgress(20, '正在計算閾值...');

    let actualThreshold = threshold;
    let thresholdMap = null;

    // 根據方法計算閾值
    switch (method) {
        case 'otsu':
            actualThreshold = calculateOtsuThreshold(grayData);
            sendProgress(40, `Otsu 最佳閾值: ${actualThreshold}`);
            break;

        case 'adaptive-mean':
        case 'adaptive-gaussian':
            thresholdMap = calculateAdaptiveThreshold(
                grayData, width, height,
                adaptiveParams.blockSize,
                adaptiveParams.constantC,
                method === 'adaptive-gaussian'
            );
            sendProgress(40, '自適應閾值計算完成');
            break;
    }

    sendProgress(50, '正在套用閾值...');

    const progressInterval = Math.floor(totalPixels / 20);
    let whitePixels = 0;

    // 套用閾值
    for (let i = 0; i < totalPixels; i++) {
        const gray = grayData[i];
        const localThreshold = thresholdMap ? thresholdMap[i] : actualThreshold;
        let outputValue;

        switch (outputMode) {
            case 'binary':
                outputValue = gray > localThreshold ? 255 : 0;
                break;
            case 'binary-inv':
                outputValue = gray > localThreshold ? 0 : 255;
                break;
            case 'truncate':
                outputValue = gray > localThreshold ? localThreshold : gray;
                break;
            case 'to-zero':
                outputValue = gray > localThreshold ? gray : 0;
                break;
            default:
                outputValue = gray > localThreshold ? 255 : 0;
        }

        if (outputValue > 127) whitePixels++;

        const idx = i * 4;
        data[idx] = outputValue;
        data[idx + 1] = outputValue;
        data[idx + 2] = outputValue;

        // 更新進度
        if (i % progressInterval === 0) {
            const progress = 50 + Math.floor((i / totalPixels) * 50);
            sendProgress(progress, `處理中... ${Math.floor((i / totalPixels) * 100)}%`);
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
                width: width,
                height: height
            },
            duration: duration,
            pixelCount: totalPixels,
            actualThreshold: actualThreshold,
            whitePixels: whitePixels,
            blackPixels: totalPixels - whitePixels,
            whitePercentage: (whitePixels / totalPixels * 100).toFixed(1)
        }
    }, [data.buffer]);
}

/**
 * 計算直方圖
 * @param {Object} payload - 影像數據
 */
function handleCalculateHistogram(payload) {
    const { imageData } = payload;
    const data = imageData.data;
    const totalPixels = data.length / 4;

    // 初始化直方圖
    const histogram = new Uint32Array(256);

    // 計算灰階直方圖
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(
            0.299 * data[i] +
            0.587 * data[i + 1] +
            0.114 * data[i + 2]
        );
        histogram[gray]++;
    }

    // 找出最大值（用於正規化）
    let maxCount = 0;
    for (let i = 0; i < 256; i++) {
        if (histogram[i] > maxCount) {
            maxCount = histogram[i];
        }
    }

    // 計算統計資訊
    let sum = 0;
    let minGray = 255;
    let maxGray = 0;

    for (let i = 0; i < 256; i++) {
        if (histogram[i] > 0) {
            sum += i * histogram[i];
            if (i < minGray) minGray = i;
            if (i > maxGray) maxGray = i;
        }
    }

    const mean = sum / totalPixels;

    // 計算標準差
    let variance = 0;
    for (let i = 0; i < 256; i++) {
        variance += histogram[i] * Math.pow(i - mean, 2);
    }
    const stdDev = Math.sqrt(variance / totalPixels);

    self.postMessage({
        type: 'HISTOGRAM_RESULT',
        payload: {
            histogram: Array.from(histogram),
            maxCount: maxCount,
            stats: {
                mean: mean.toFixed(1),
                stdDev: stdDev.toFixed(1),
                minGray: minGray,
                maxGray: maxGray
            }
        }
    });
}

/**
 * 計算 Otsu 最佳閾值
 * @param {Uint8Array} grayData - 灰階數據
 * @returns {number} 最佳閾值
 */
function calculateOtsuThreshold(grayData) {
    const histogram = new Uint32Array(256);
    const totalPixels = grayData.length;

    // 計算直方圖
    for (let i = 0; i < totalPixels; i++) {
        histogram[grayData[i]]++;
    }

    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
        wB += histogram[t]; // 背景權重
        if (wB === 0) continue;

        wF = totalPixels - wB; // 前景權重
        if (wF === 0) break;

        sumB += t * histogram[t];

        const mB = sumB / wB; // 背景平均值
        const mF = (sum - sumB) / wF; // 前景平均值

        // 類間變異數
        const variance = wB * wF * Math.pow(mB - mF, 2);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }

    return threshold;
}

/**
 * 計算自適應閾值
 * @param {Uint8Array} grayData - 灰階數據
 * @param {number} width - 影像寬度
 * @param {number} height - 影像高度
 * @param {number} blockSize - 區塊大小
 * @param {number} constantC - 常數 C
 * @param {boolean} useGaussian - 是否使用高斯加權
 * @returns {Uint8Array} 每個像素的閾值
 */
function calculateAdaptiveThreshold(grayData, width, height, blockSize, constantC, useGaussian) {
    const thresholdMap = new Uint8Array(width * height);
    const halfBlock = Math.floor(blockSize / 2);

    // 預計算高斯權重（如果需要）
    let weights = null;
    let weightSum = 0;

    if (useGaussian) {
        weights = new Float32Array(blockSize * blockSize);
        const sigma = blockSize / 6;
        const sigmaSquare2 = 2 * sigma * sigma;

        for (let dy = -halfBlock; dy <= halfBlock; dy++) {
            for (let dx = -halfBlock; dx <= halfBlock; dx++) {
                const idx = (dy + halfBlock) * blockSize + (dx + halfBlock);
                weights[idx] = Math.exp(-(dx * dx + dy * dy) / sigmaSquare2);
                weightSum += weights[idx];
            }
        }
    }

    // 使用積分圖加速均值計算
    const integral = new Float64Array((width + 1) * (height + 1));

    // 計算積分圖
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += grayData[y * width + x];
            integral[(y + 1) * (width + 1) + (x + 1)] =
                integral[y * (width + 1) + (x + 1)] + rowSum;
        }
    }

    // 計算每個像素的閾值
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - halfBlock);
            const y1 = Math.max(0, y - halfBlock);
            const x2 = Math.min(width - 1, x + halfBlock);
            const y2 = Math.min(height - 1, y + halfBlock);

            let localMean;

            if (useGaussian) {
                // 高斯加權平均
                let weightedSum = 0;
                let localWeightSum = 0;

                for (let dy = -halfBlock; dy <= halfBlock; dy++) {
                    for (let dx = -halfBlock; dx <= halfBlock; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const widx = (dy + halfBlock) * blockSize + (dx + halfBlock);
                            const weight = weights[widx];
                            weightedSum += grayData[ny * width + nx] * weight;
                            localWeightSum += weight;
                        }
                    }
                }

                localMean = weightedSum / localWeightSum;
            } else {
                // 使用積分圖計算均值
                const sum =
                    integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
                    integral[(y2 + 1) * (width + 1) + x1] -
                    integral[y1 * (width + 1) + (x2 + 1)] +
                    integral[y1 * (width + 1) + x1];

                const count = (x2 - x1 + 1) * (y2 - y1 + 1);
                localMean = sum / count;
            }

            thresholdMap[y * width + x] = Math.max(0, Math.min(255, localMean - constantC));
        }
    }

    return thresholdMap;
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
