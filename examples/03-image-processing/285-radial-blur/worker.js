<<<<<<< HEAD
self.onmessage = function(e) {
    const { imageData, strength } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const cx = width / 2, cy = height / 2;
    const samples = strength;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            const angle = Math.atan2(y - cy, x - cx);
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            for (let i = 0; i < samples; i++) {
                const a = angle + (i - samples / 2) * 0.01;
                const sx = Math.round(cx + dist * Math.cos(a));
                const sy = Math.round(cy + dist * Math.sin(a));

                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    r += data[idx];
                    g += data[idx + 1];
                    b += data[idx + 2];
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / samples;
            output[idx + 1] = g / samples;
            output[idx + 2] = b / samples;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
=======
/**
 * 徑向模糊 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'APPLY_BLUR':
            applyRadialBlur(payload.imageData, payload.cx, payload.cy, payload.strength, payload.samples);
            break;
    }
};

/**
 * 執行徑向模糊 (旋轉模糊)
 * @param {ImageData} imageData
 * @param {number} cxNormalized 中心 X (0-1)
 * @param {number} cyNormalized 中心 Y (0-1)
 * @param {number} strength 強度 (旋轉角度，度)
 * @param {number} samples 採樣數
 */
function applyRadialBlur(imageData, cxNormalized, cyNormalized, strength, samples) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data; // 原始數據引用 (在 Worker 中已經轉移所有權)

    // 建立一個副本用於讀取，這樣我們可以寫入 srcData (或創建新的 buffer)
    // 這裡我們創建一個新的 Uint8ClampedArray 作為輸出
    const outputData = new Uint8ClampedArray(srcData.length);

    // 將原始數據複製一份用於採樣讀取，因為我們要覆蓋 output
    // 注意：srcData 和 outputData 分開，所以我們從 srcData 讀，寫入 outputData
    // 不需要額外複製 srcData，因為它是只讀的 (在此邏輯中)

    const centerX = Math.floor(cxNormalized * width);
    const centerY = Math.floor(cyNormalized * height);

    // 角度轉弧度
    // 這裡是總模糊範圍，採樣點分佈在 -strength/2 到 +strength/2 之間
    const radStrength = (strength * Math.PI) / 180;

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
            const dx = x - centerX;
            const dy = y - centerY;

            // 計算當前點的半徑和角度
            const radius = Math.sqrt(dx * dx + dy * dy);
            const currentAngle = Math.atan2(dy, dx);

            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            // 採樣
            for (let i = 0; i < samples; i++) {
                // 計算採樣點的角度偏移
                // 從 -strength/2 到 +strength/2 分佈
                const offset = (i / (samples - 1) - 0.5) * radStrength;
                const sampleAngle = currentAngle + offset;

                // 計算採樣點座標
                const sampleX = centerX + Math.cos(sampleAngle) * radius;
                const sampleY = centerY + Math.sin(sampleAngle) * radius;

                // 雙線性插值取樣
                const color = bilinearSample(srcData, width, height, sampleX, sampleY);

                rSum += color[0];
                gSum += color[1];
                bSum += color[2];
                aSum += color[3];
            }

            const outPos = (y * width + x) * 4;
            outputData[outPos] = rSum / samples;
            outputData[outPos + 1] = gSum / samples;
            outputData[outPos + 2] = bSum / samples;
            outputData[outPos + 3] = aSum / samples;
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
            cx: cxNormalized,
            cy: cyNormalized,
            strength: strength,
            samples: samples
        }
    }, [imageData.data.buffer]);
}

/**
 * 雙線性插值採樣
 */
function bilinearSample(data, width, height, x, y) {
    // 邊界檢查
    if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) {
        // 簡單處理邊界：如果在圖片外，返回邊緣像素或黑色/透明
        // 這裡做 Clamp 處理
        x = Math.max(0, Math.min(width - 1.001, x));
        y = Math.max(0, Math.min(height - 1.001, y));
    }

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const dx = x - x0;
    const dy = y - y0;
    const w00 = (1 - dx) * (1 - dy);
    const w10 = dx * (1 - dy);
    const w01 = (1 - dx) * dy;
    const w11 = dx * dy;

    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;

    const r = data[idx00] * w00 + data[idx10] * w10 + data[idx01] * w01 + data[idx11] * w11;
    const g = data[idx00 + 1] * w00 + data[idx10 + 1] * w10 + data[idx01 + 1] * w01 + data[idx11 + 1] * w11;
    const b = data[idx00 + 2] * w00 + data[idx10 + 2] * w10 + data[idx01 + 2] * w01 + data[idx11 + 2] * w11;
    const a = data[idx00 + 3] * w00 + data[idx10 + 3] * w10 + data[idx01 + 3] * w01 + data[idx11 + 3] * w11;

    return [r, g, b, a];
}
>>>>>>> origin/main
