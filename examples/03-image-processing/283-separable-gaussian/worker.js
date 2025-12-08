/**
 * 可分離高斯模糊 Web Worker
 *
 * 功能：使用可分離濾波器優化高斯模糊
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此 Worker 將二維高斯卷積分解為兩次一維卷積：
 * 1. 水平方向卷積
 * 2. 垂直方向卷積
 *
 * 優化效果：
 * - 標準 2D：O(n × m × r²)
 * - 可分離：O(n × m × 2r) = O(n × m × r)
 * - 加速比：約 r/2 倍
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'APPLY_SEPARABLE_BLUR':
            applySeparableGaussianBlur(payload);
            break;

        case 'APPLY_REGULAR_BLUR':
            applyRegularGaussianBlur(payload);
            break;

        case 'GENERATE_KERNEL':
            generateAndSendKernel(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 可分離高斯模糊 =====

/**
 * 套用可分離高斯模糊
 * @param {Object} payload - 處理參數
 */
function applySeparableGaussianBlur(payload) {
    const { imageData, radius, sigma } = payload;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;

    // 產生一維高斯核心
    sendProgress(0, '產生一維高斯核心...');
    const kernel = generate1DGaussianKernel(radius, sigma);

    // 中間緩衝區（水平卷積結果）
    const tempData = new Float64Array(width * height * 4);

    // 第一階段：水平方向卷積
    sendProgress(5, '執行水平方向卷積...');
    horizontalConvolution(srcData, tempData, width, height, kernel, radius);

    // 第二階段：垂直方向卷積
    sendProgress(50, '執行垂直方向卷積...');
    const dstData = new Uint8ClampedArray(srcData.length);
    verticalConvolution(tempData, dstData, width, height, kernel, radius);

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
            kernelSize: 2 * radius + 1,
            duration: duration,
            method: 'separable'
        }
    }, [resultData.data.buffer]);
}

/**
 * 水平方向卷積
 */
function horizontalConvolution(src, dst, width, height, kernel, radius) {
    const progressInterval = Math.max(1, Math.floor(height / 10));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
            let weightSum = 0;

            for (let k = -radius; k <= radius; k++) {
                const nx = x + k;

                if (nx >= 0 && nx < width) {
                    const srcIdx = (y * width + nx) * 4;
                    const weight = kernel[k + radius];

                    sumR += src[srcIdx] * weight;
                    sumG += src[srcIdx + 1] * weight;
                    sumB += src[srcIdx + 2] * weight;
                    sumA += src[srcIdx + 3] * weight;
                    weightSum += weight;
                }
            }

            const dstIdx = (y * width + x) * 4;
            dst[dstIdx] = sumR / weightSum;
            dst[dstIdx + 1] = sumG / weightSum;
            dst[dstIdx + 2] = sumB / weightSum;
            dst[dstIdx + 3] = sumA / weightSum;
        }

        if (y % progressInterval === 0) {
            const progress = 5 + Math.floor((y / height) * 45);
            sendProgress(progress, `水平卷積... (${y}/${height} 行)`);
        }
    }
}

/**
 * 垂直方向卷積
 */
function verticalConvolution(src, dst, width, height, kernel, radius) {
    const progressInterval = Math.max(1, Math.floor(height / 10));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
            let weightSum = 0;

            for (let k = -radius; k <= radius; k++) {
                const ny = y + k;

                if (ny >= 0 && ny < height) {
                    const srcIdx = (ny * width + x) * 4;
                    const weight = kernel[k + radius];

                    sumR += src[srcIdx] * weight;
                    sumG += src[srcIdx + 1] * weight;
                    sumB += src[srcIdx + 2] * weight;
                    sumA += src[srcIdx + 3] * weight;
                    weightSum += weight;
                }
            }

            const dstIdx = (y * width + x) * 4;
            dst[dstIdx] = Math.round(sumR / weightSum);
            dst[dstIdx + 1] = Math.round(sumG / weightSum);
            dst[dstIdx + 2] = Math.round(sumB / weightSum);
            dst[dstIdx + 3] = Math.round(sumA / weightSum);
        }

        if (y % progressInterval === 0) {
            const progress = 50 + Math.floor((y / height) * 45);
            sendProgress(progress, `垂直卷積... (${y}/${height} 行)`);
        }
    }
}

// ===== 標準高斯模糊 (用於比較) =====

/**
 * 套用標準 2D 高斯模糊
 */
function applyRegularGaussianBlur(payload) {
    const { imageData, radius, sigma } = payload;
    const startTime = performance.now();

    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;
    const dstData = new Uint8ClampedArray(srcData.length);

    // 產生 2D 高斯核心
    sendProgress(0, '產生 2D 高斯核心...');
    const kernel = generate2DGaussianKernel(radius, sigma);
    const kernelSize = 2 * radius + 1;

    sendProgress(5, '執行 2D 卷積...');
    const progressInterval = Math.max(1, Math.floor(height / 20));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sumR = 0, sumG = 0, sumB = 0;
            let weightSum = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    const ny = y + ky;

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

            const dstIdx = (y * width + x) * 4;
            dstData[dstIdx] = Math.round(sumR / weightSum);
            dstData[dstIdx + 1] = Math.round(sumG / weightSum);
            dstData[dstIdx + 2] = Math.round(sumB / weightSum);
            dstData[dstIdx + 3] = srcData[dstIdx + 3];
        }

        if (y % progressInterval === 0) {
            const progress = 5 + Math.floor((y / height) * 90);
            sendProgress(progress, `2D 卷積... (${y}/${height} 行)`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '處理完成');

    const resultData = new ImageData(dstData, width, height);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: resultData,
            radius: radius,
            sigma: sigma,
            kernelSize: kernelSize,
            duration: duration,
            method: 'regular'
        }
    }, [resultData.data.buffer]);
}

// ===== 核心產生函數 =====

/**
 * 產生一維高斯核心
 */
function generate1DGaussianKernel(radius, sigma) {
    const size = 2 * radius + 1;
    const kernel = new Float64Array(size);
    const sigma2 = 2 * sigma * sigma;
    let sum = 0;

    for (let x = -radius; x <= radius; x++) {
        const value = Math.exp(-(x * x) / sigma2);
        kernel[x + radius] = value;
        sum += value;
    }

    // 正規化
    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

/**
 * 產生二維高斯核心
 */
function generate2DGaussianKernel(radius, sigma) {
    const size = 2 * radius + 1;
    const kernel = new Float64Array(size * size);
    const sigma2 = 2 * sigma * sigma;
    let sum = 0;

    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            const value = Math.exp(-(x * x + y * y) / sigma2);
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

/**
 * 產生並發送核心（供預覽用）
 */
function generateAndSendKernel(payload) {
    const { radius, sigma } = payload;
    const kernel = generate1DGaussianKernel(radius, sigma);

    self.postMessage({
        type: 'KERNEL',
        payload: {
            kernel: Array.from(kernel),
            kernelSize: 2 * radius + 1,
            radius: radius,
            sigma: sigma
        }
    });
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
