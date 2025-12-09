/**
 * 縮放模糊 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'APPLY_BLUR':
            applyZoomBlur(payload.imageData, payload.cx, payload.cy, payload.strength, payload.samples);
            break;
    }
};

/**
 * 執行縮放模糊 (放射狀縮放)
 * @param {ImageData} imageData
 * @param {number} cxNormalized 中心 X (0-1)
 * @param {number} cyNormalized 中心 Y (0-1)
 * @param {number} strength 強度 (0.0 - 1.0)
 * @param {number} samples 採樣數
 */
function applyZoomBlur(imageData, cxNormalized, cyNormalized, strength, samples) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const srcData = imageData.data;
    const outputData = new Uint8ClampedArray(srcData.length);

    const centerX = Math.floor(cxNormalized * width);
    const centerY = Math.floor(cyNormalized * height);

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
            // 計算相對於中心的向量
            const dx = x - centerX;
            const dy = y - centerY;

            let rSum = 0, gSum = 0, bSum = 0, aSum = 0;

            // 隨機抖動以減少帶狀偽影 (Banding artifacts)
            // 但為了結果的可重現性，這裡使用均勻採樣，或者可以加入預計算的噪聲
            // 簡單起見，我們使用均勻分佈的採樣

            for (let i = 0; i < samples; i++) {
                // 計算縮放因子
                // t 從 0 到 strength 變化，或者從 1.0 到 1.0 - strength
                // 這裡我們模擬向外模糊，還是向內？
                // 通常 Zoom Blur 是當前像素位置混合了 "縮放後" 該位置的像素
                // 實際上是沿著連線向中心採樣

                // 採樣點分佈在 [CurrentPos, CurrentPos * (1 - strength)] 之間
                // t 是一個比例因子 0.0 ~ 1.0
                const t = (i / (samples - 1)) * strength;

                // 計算採樣點
                // 當 t=0, scale=1, 採樣原點
                // 當 t=strength, scale=1-strength, 採樣靠近中心的點
                const scale = 1.0 - t;

                const sampleX = centerX + dx * scale;
                const sampleY = centerY + dy * scale;

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
 * 雙線性插值採樣 (可共用，但為了獨立性這裡複製一份)
 */
function bilinearSample(data, width, height, x, y) {
    if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) {
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
