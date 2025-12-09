/**
 * USM 銳化 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'APPLY_USM':
            applyUnsharpMask(payload.imageData, payload.amount, payload.radius, payload.threshold);
            break;
    }
};

/**
 * 執行 Unsharp Mask
 * 1. 創建原始圖像的副本並進行高斯模糊。
 * 2. 比較原圖與模糊圖的差異。
 * 3. 如果差異大於閾值，則將差異放大 (Amount) 並加回原圖。
 */
function applyUnsharpMask(imageData, amount, radius, threshold) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // 1. 生成高斯模糊版本
    // 為了效能，我們可以先對原圖進行高斯模糊
    // 這一步是計算密集的，但可分離高斯模糊是 O(N) 的
    // 這裡我們直接實作一個可分離的高斯模糊

    // 複製一份數據用於模糊
    const blurredData = new Uint8ClampedArray(data);

    self.postMessage({ type: 'PROGRESS', payload: { percent: 10, message: '正在執行高斯模糊...' } });

    gaussianBlur(blurredData, width, height, radius);

    self.postMessage({ type: 'PROGRESS', payload: { percent: 60, message: '正在應用銳化...' } });

    // 2. 銳化混合
    // Sharpened = Original + (Original - Blurred) * Amount
    // Amount 通常是百分比，例如 100% 意味著係數為 1.0

    const amountFactor = amount / 100;
    const outputData = new Uint8ClampedArray(data.length);

    // 閾值檢查：差異必須大於閾值才應用
    // 這是為了防止放大背景噪聲 (通常背景噪聲的局部差異很小)

    for (let i = 0; i < data.length; i += 4) {
        // R
        let diffR = data[i] - blurredData[i];
        if (Math.abs(diffR) >= threshold) {
            outputData[i] = clamp(data[i] + diffR * amountFactor);
        } else {
            outputData[i] = data[i];
        }

        // G
        let diffG = data[i+1] - blurredData[i+1];
        if (Math.abs(diffG) >= threshold) {
            outputData[i+1] = clamp(data[i+1] + diffG * amountFactor);
        } else {
            outputData[i+1] = data[i+1];
        }

        // B
        let diffB = data[i+2] - blurredData[i+2];
        if (Math.abs(diffB) >= threshold) {
            outputData[i+2] = clamp(data[i+2] + diffB * amountFactor);
        } else {
            outputData[i+2] = data[i+2];
        }

        // A
        outputData[i+3] = data[i+3];
    }

    const endTime = performance.now();
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            amount: amount,
            radius: radius,
            threshold: threshold
        }
    }, [imageData.data.buffer]);
}

function clamp(val) {
    return Math.max(0, Math.min(255, val));
}

// 可分離高斯模糊實作
function gaussianBlur(data, width, height, radius) {
    // 1. 生成一維高斯核
    const sigma = radius / 3; // 經驗法則
    const kernelRadius = Math.ceil(radius);
    const kernelSize = 2 * kernelRadius + 1;
    const kernel = new Float32Array(kernelSize);
    let totalWeight = 0;

    for (let i = 0; i < kernelSize; i++) {
        const x = i - kernelRadius;
        const weight = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = weight;
        totalWeight += weight;
    }

    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= totalWeight;
    }

    // 2. 水平方向模糊
    // 使用浮點數緩衝區以保持精度
    const tempBuffer = new Float32Array(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            for (let k = 0; k < kernelSize; k++) {
                const kx = x + k - kernelRadius;
                // 邊界處理：Clamp
                const px = Math.max(0, Math.min(width - 1, kx));
                const pos = (y * width + px) * 4;
                const weight = kernel[k];

                r += data[pos] * weight;
                g += data[pos + 1] * weight;
                b += data[pos + 2] * weight;
                a += data[pos + 3] * weight;
            }

            const pos = (y * width + x) * 4;
            tempBuffer[pos] = r;
            tempBuffer[pos + 1] = g;
            tempBuffer[pos + 2] = b;
            tempBuffer[pos + 3] = a;
        }
    }

    // 3. 垂直方向模糊
    // 直接寫回 data (Uint8ClampedArray 會自動處理 clamp 和取整)

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;

            for (let k = 0; k < kernelSize; k++) {
                const ky = y + k - kernelRadius;
                // 邊界處理：Clamp
                const py = Math.max(0, Math.min(height - 1, ky));
                const pos = (py * width + x) * 4;
                const weight = kernel[k];

                r += tempBuffer[pos] * weight;
                g += tempBuffer[pos + 1] * weight;
                b += tempBuffer[pos + 2] * weight;
                a += tempBuffer[pos + 3] * weight;
            }

            const pos = (y * width + x) * 4;
            data[pos] = r;
            data[pos + 1] = g;
            data[pos + 2] = b;
            data[pos + 3] = a;
        }
    }
}
