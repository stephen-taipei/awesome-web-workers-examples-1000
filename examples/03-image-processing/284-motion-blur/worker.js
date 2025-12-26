<<<<<<< HEAD
self.onmessage = function(e) {
    const { imageData, distance, angle } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const rad = angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = -distance; i <= distance; i++) {
                const sx = Math.round(x + dx * i);
                const sy = Math.round(y + dy * i);

                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                    count++;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / count;
            output[idx + 1] = g / count;
            output[idx + 2] = b / count;
            output[idx + 3] = data[idx + 3];
        }

        if (y % 50 === 0) {
            self.postMessage({ type: 'progress', value: Math.round(y / height * 100) });
        }
    }

    self.postMessage({ type: 'result', imageData: new ImageData(output, width, height) });
};
=======
/**
 * 運動模糊 Worker
 * 負責生成運動模糊核心並執行卷積運算
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'GENERATE_KERNEL':
            generateAndSendKernel(payload.angle, payload.distance);
            break;

        case 'APPLY_BLUR':
            applyMotionBlur(payload.imageData, payload.angle, payload.distance);
            break;
    }
};

/**
 * 生成運動模糊核心並發送回主執行緒 (用於預覽)
 */
function generateAndSendKernel(angle, distance) {
    const { kernel, size } = createMotionBlurKernel(angle, distance);
    self.postMessage({
        type: 'KERNEL',
        payload: {
            kernel: kernel,
            kernelSize: size
        }
    });
}

/**
 * 建立運動模糊核心
 * @param {number} angle - 角度 (度)
 * @param {number} distance - 距離 (像素)
 */
function createMotionBlurKernel(angle, distance) {
    // 確保距離至少為 1
    distance = Math.max(1, distance);

    // 核心大小需足夠涵蓋模糊距離
    // 通常 kernel size 設為 distance (奇數)
    let size = Math.ceil(distance);
    if (size % 2 === 0) size++;

    const kernel = new Float32Array(size * size);
    const center = Math.floor(size / 2);

    // 將角度轉換為弧度
    // 注意：Canvas 座標系 y 軸向下，數學座標系 y 軸向上
    // 這裡我們模擬數學角度，0度向右，90度向下 (順時針)
    const radians = (angle * Math.PI) / 180;

    const cosVal = Math.cos(radians);
    const sinVal = Math.sin(radians);

    // 繪製直線到 kernel
    // 使用 Bresenham 演算法或簡單的步進
    // 為了更好的品質，我們使用反鋸齒線段繪製的概念 (Wu's algorithm simplified)
    // 或者簡單地遍歷 kernel 每個點，計算到線段的距離

    // 定義線段起點和終點 (相對於中心)
    // 我們希望模糊是以中心點為對稱中心，或者從中心延伸？
    // 標準運動模糊通常是對稱的

    const halfDist = (distance - 1) / 2;
    // 線段定義為從 (-halfDist) 到 (+halfDist) 沿著角度方向

    let totalWeight = 0;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;

            // 將點投影到線段的方向上
            // 旋轉座標系，使線段沿著 X 軸
            // x' = x * cos + y * sin
            // y' = -x * sin + y * cos

            // 距離線段的垂直距離
            const distPerp = Math.abs(-dx * sinVal + dy * cosVal);

            // 沿線段的投影長度
            const distPara = dx * cosVal + dy * sinVal;

            // 判斷是否在線段範圍內
            if (Math.abs(distPara) <= halfDist + 0.5 && distPerp < 1.0) {
                 // 簡單的抗鋸齒權重
                 const weight = 1.0 - distPerp;
                 const idx = y * size + x;
                 kernel[idx] = weight;
                 totalWeight += weight;
            }
        }
    }

    // 如果 totalWeight 為 0 (例如 distance 很小)，設中心點為 1
    if (totalWeight === 0) {
        kernel[center * size + center] = 1;
        totalWeight = 1;
    }

    // 正規化
    for (let i = 0; i < kernel.length; i++) {
        kernel[i] /= totalWeight;
    }

    return { kernel, size };
}

/**
 * 執行運動模糊
 */
function applyMotionBlur(imageData, angle, distance) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // 生成核心
    const { kernel, size: kernelSize } = createMotionBlurKernel(angle, distance);
    const halfSize = Math.floor(kernelSize / 2);

    // 建立輸出緩衝區
    const outputData = new Uint8ClampedArray(data.length);

    // 為了優化，我們不處理邊緣 (或簡單複製)
    // 這裡使用簡單的卷積實作

    // 報告進度間隔
    const progressInterval = Math.ceil(height / 20);

    for (let y = 0; y < height; y++) {
        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    percent: Math.round((y / height) * 100),
                    message: `處理中... 第 ${y} / ${height} 行`
                }
            });
        }

        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            // 卷積運算
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const py = y + ky - halfSize;
                    const px = x + kx - halfSize;

                    // 邊界檢查 (複製邊緣像素)
                    const clampedY = Math.max(0, Math.min(height - 1, py));
                    const clampedX = Math.max(0, Math.min(width - 1, px));

                    const pos = (clampedY * width + clampedX) * 4;
                    const weight = kernel[ky * kernelSize + kx];

                    if (weight > 0) {
                        r += data[pos] * weight;
                        g += data[pos + 1] * weight;
                        b += data[pos + 2] * weight;
                        // Alpha 通道通常保持不變或也進行模糊，這裡我們模糊它
                        a += data[pos + 3] * weight;
                    }
                }
            }

            const outPos = (y * width + x) * 4;
            outputData[outPos] = r;
            outputData[outPos + 1] = g;
            outputData[outPos + 2] = b;
            outputData[outPos + 3] = a; // 或者保持原樣 data[outPos + 3]
        }
    }

    const endTime = performance.now();

    // 將結果寫回 ImageData
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            angle: angle,
            distance: distance,
            kernelSize: kernelSize
        }
    }, [imageData.data.buffer]);
}
>>>>>>> origin/main
