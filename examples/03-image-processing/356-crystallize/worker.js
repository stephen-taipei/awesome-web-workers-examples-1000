/**
 * 晶格化效果 - Worker
 * 使用 Voronoi 圖實現晶格化效果
 */

self.onmessage = function(e) {
    const { imageData, cellSize, seedCount } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // 生成隨機種子點
    const seeds = [];
    for (let i = 0; i < seedCount; i++) {
        seeds.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 0, g: 0, b: 0,
            count: 0
        });
    }

    // 為每個像素找到最近的種子點，並累積顏色
    const pixelToSeed = new Int32Array(width * height);
    const totalPixels = width * height;
    let lastProgress = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = y * width + x;
            const dataIdx = pixelIdx * 4;

            // 找最近的種子點
            let minDist = Infinity;
            let closestSeed = 0;

            for (let i = 0; i < seeds.length; i++) {
                const dx = x - seeds[i].x;
                const dy = y - seeds[i].y;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    closestSeed = i;
                }
            }

            pixelToSeed[pixelIdx] = closestSeed;

            // 累積顏色值
            seeds[closestSeed].r += data[dataIdx];
            seeds[closestSeed].g += data[dataIdx + 1];
            seeds[closestSeed].b += data[dataIdx + 2];
            seeds[closestSeed].count++;
        }

        // 報告進度
        const progress = (y + 1) / height * 0.5;
        if (progress - lastProgress > 0.05) {
            self.postMessage({ type: 'progress', progress: progress });
            lastProgress = progress;
        }
    }

    // 計算每個區域的平均顏色
    for (let i = 0; i < seeds.length; i++) {
        if (seeds[i].count > 0) {
            seeds[i].r = Math.round(seeds[i].r / seeds[i].count);
            seeds[i].g = Math.round(seeds[i].g / seeds[i].count);
            seeds[i].b = Math.round(seeds[i].b / seeds[i].count);
        }
    }

    // 填充輸出圖片
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelIdx = y * width + x;
            const dataIdx = pixelIdx * 4;
            const seed = seeds[pixelToSeed[pixelIdx]];

            output[dataIdx] = seed.r;
            output[dataIdx + 1] = seed.g;
            output[dataIdx + 2] = seed.b;
            output[dataIdx + 3] = 255;
        }

        // 報告進度
        const progress = 0.5 + (y + 1) / height * 0.5;
        if (progress - lastProgress > 0.05) {
            self.postMessage({ type: 'progress', progress: progress });
            lastProgress = progress;
        }
    }

    self.postMessage({
        type: 'result',
        imageData: new ImageData(output, width, height)
    });
};
