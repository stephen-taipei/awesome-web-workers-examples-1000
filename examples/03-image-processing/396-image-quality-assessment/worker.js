self.onmessage = function(e) {
    const { imageData } = e.data;
    const { width, height, data } = imageData;

    const startTime = performance.now();

    // 1. 灰階轉換 (用於後續計算)
    // 為了節省記憶體，我們不創建完整的灰階數組，而是邊遍歷邊計算

    let sumGray = 0;
    let sumGraySq = 0;

    // Laplacian 卷積核 (3x3)
    //  0  1  0
    //  1 -4  1
    //  0  1  0
    // 或者
    // -1 -1 -1
    // -1  8 -1
    // -1 -1 -1
    // 這裡使用標準 3x3 Laplacian:
    //  0 -1  0
    // -1  4 -1
    //  0 -1  0
    // 注意：為了銳利度檢測，我們計算 Variance of Laplacian

    let laplacianVar = 0;
    let laplacianMean = 0;
    let laplacianSum = 0;
    let laplacianSumSq = 0;

    // 像素總數
    const pixelCount = width * height;

    // 為了計算 Laplacian，我們需要訪問鄰居，所以先轉成灰階矩陣比較方便
    // 這樣雖然多佔一點記憶體 (width*height bytes)，但代碼清晰且快
    const grayData = new Uint8Array(pixelCount);

    for (let i = 0; i < pixelCount; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // 亮度公式
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        grayData[i] = gray;

        sumGray += gray;
        sumGraySq += gray * gray;

        // 進度報告 (每 10% 報告一次)
        if (i % Math.floor(pixelCount / 10) === 0) {
            self.postMessage({ type: 'progress', data: (i / pixelCount) * 40 }); // 佔 40% 進度
        }
    }

    // 計算平均亮度和 RMS 對比度
    const meanBrightness = sumGray / pixelCount;
    // RMS Contrast = sqrt(sum((I - mean)^2) / N) = sqrt(mean(I^2) - mean(I)^2)
    // 標準差公式
    const contrast = Math.sqrt((sumGraySq / pixelCount) - (meanBrightness * meanBrightness));

    // 2. 計算 Laplacian Variance (銳利度/模糊檢測)
    // 邊界不處理 (padding=0)
    let countLap = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            // 鄰居索引
            const top = idx - width;
            const bottom = idx + width;
            const left = idx - 1;
            const right = idx + 1;

            // Laplacian: 4 * center - top - bottom - left - right
            const lap = 4 * grayData[idx] - grayData[top] - grayData[bottom] - grayData[left] - grayData[right];

            laplacianSum += lap;
            laplacianSumSq += lap * lap;
            countLap++;
        }

        // 進度報告
        if (y % Math.floor(height / 10) === 0) {
            self.postMessage({ type: 'progress', data: 40 + (y / height) * 60 }); // 佔剩餘 60% 進度
        }
    }

    const laplacianMeanVal = laplacianSum / countLap;
    const laplacianVariance = (laplacianSumSq / countLap) - (laplacianMeanVal * laplacianMeanVal);

    // 3. 計算綜合評分
    // 這是一個啟發式評分，不是標準 BRISQUE
    // 一般來說：
    // 對比度太低 -> 品質差
    // 銳利度 (Laplacian Var) 低 -> 模糊 -> 品質差
    // 亮度過高或過低 -> 品質差

    // 正規化分數 (0-100)

    // 銳利度評分: Variance of Laplacian 一般在 0 到 幾千 之間。
    // 對於清晰圖片，可能 > 500。對於模糊圖片，可能 < 100。
    // 我們使用 log 縮放
    const sharpnessScore = Math.min(100, (Math.log(laplacianVariance + 1) / Math.log(1000)) * 100);

    // 對比度評分: RMS Contrast (0-127左右，標準差)
    // 一般來說 > 40 算不錯
    const contrastScore = Math.min(100, (contrast / 60) * 100);

    // 亮度評分: 理想在 128 左右，太暗或太亮扣分
    // 距離 128 越遠扣分越多
    const brightnessDist = Math.abs(meanBrightness - 128);
    const brightnessScore = Math.max(0, 100 - (brightnessDist / 128) * 100);

    // 加權總分
    // 銳利度通常是主觀清晰度的最重要指標
    let totalScore = 0.5 * sharpnessScore + 0.3 * contrastScore + 0.2 * brightnessScore;

    // 修正極端情況
    if (meanBrightness < 10 || meanBrightness > 245) totalScore *= 0.5; // 太暗或太亮

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            sharpness: laplacianVariance,
            contrast: contrast,
            brightness: meanBrightness,
            score: totalScore,
            time: Math.round(endTime - startTime)
        }
    });
};
