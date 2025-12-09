/**
 * 高斯模糊 Web Worker
 *
 * 功能：使用高斯核心實現圖片模糊效果
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此 Worker 接收圖片數據、模糊半徑和 sigma 值，
 * 計算高斯核心並進行二維卷積，實現高斯模糊效果。
 *
 * 高斯函數：
 * G(x, y) = (1 / 2πσ²) × e^(-(x² + y²) / 2σ²)
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
            applyGaussianBlur(payload);
            break;

        case 'GENERATE_KERNEL':
            generateAndSendKernel(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 高斯模糊處理 =====

/**
 * 套用高斯模糊
 * @param {Object} payload - 處理參數
 * @param {ImageData} payload.imageData - 圖片數據
 * @param {number} payload.radius - 模糊半徑
 * @param {number} payload.sigma - 高斯分布標準差
 */
function applyGaussianBlur(payload) {
    const { imageData, radius, sigma } = payload;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(srcData.length);

    // 產生高斯核心
    sendProgress(0, '產生高斯核心...');
    const kernel = generateGaussianKernel(radius, sigma);
    const kernelSize = 2 * radius + 1;

    sendProgress(5, `開始處理 (半徑: ${radius}px, σ: ${sigma})...`);

    // 進度更新間隔
    const progressInterval = Math.max(1, Math.floor(height / 20));

    // 遍歷每個像素
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            let weightSum = 0;

            // 遍歷核心
            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

                    // 邊界檢查
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        const kernelIdx = (ky + radius) * kernelSize + (kx + radius);
                        const weight = kernel[kernelIdx];

                        sumR += srcData[idx] * weight;
                        sumG += srcData[idx + 1] * weight;
                        sumB += srcData[idx + 2] * weight;
                        weightSum += weight;
                    }
                }
            }

            // 正規化並寫入結果
            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = Math.round(sumR / weightSum);
            dstData[dstIdx + 1] = Math.round(sumG / weightSum);
            dstData[dstIdx + 2] = Math.round(sumB / weightSum);
            dstData[dstIdx + 3] = srcData[dstIdx + 3]; // Alpha 保持不變
        }

        // 定期回報進度
        if (y % progressInterval === 0) {
            const progress = 5 + Math.floor((y / height) * 90);
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
            sigma: sigma,
            kernelSize: kernelSize,
            duration: duration
        }
    }, [resultData.data.buffer]);
}

/**
 * 產生並發送高斯核心（供預覽用）
 * @param {Object} payload - 參數
 * @param {number} payload.radius - 半徑
 * @param {number} payload.sigma - Sigma
 */
function generateAndSendKernel(payload) {
    const { radius, sigma } = payload;
    const kernel = generateGaussianKernel(radius, sigma);
    const kernelSize = 2 * radius + 1;

    self.postMessage({
        type: 'KERNEL',
        payload: {
            kernel: kernel,
            kernelSize: kernelSize,
            radius: radius,
            sigma: sigma
        }
    });
}

/**
 * 產生高斯核心
 * @param {number} radius - 半徑
 * @param {number} sigma - 標準差
 * @returns {Float64Array} 高斯核心
 */
function generateGaussianKernel(radius, sigma) {
    const size = 2 * radius + 1;
    const kernel = new Float64Array(size * size);
    const sigma2 = 2 * sigma * sigma;
    let sum = 0;

    // 計算高斯值
    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            const exponent = -(x * x + y * y) / sigma2;
            const value = Math.exp(exponent);
            const idx = (y + radius) * size + (x + radius);
            kernel[idx] = value;
            sum += value;
        }
    }

    // 正規化
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= sum;
    }

    return kernel;
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
