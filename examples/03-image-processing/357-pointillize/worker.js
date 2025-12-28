/**
 * 斑點化效果 - Worker
 * 使用隨機採樣創建點彩效果
 */

self.onmessage = function(e) {
    const { imageData, dotSize, density } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // 填充背景為白色
    for (let i = 0; i < output.length; i += 4) {
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
        output[i + 3] = 255;
    }

    // 計算需要繪製的點數
    const area = width * height;
    const dotArea = Math.PI * dotSize * dotSize;
    const numDots = Math.floor(area * density / dotArea);

    let lastProgress = 0;

    // 繪製隨機斑點
    for (let i = 0; i < numDots; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const srcIdx = (y * width + x) * 4;

        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];

        // 繪製圓形斑點
        for (let dy = -dotSize; dy <= dotSize; dy++) {
            for (let dx = -dotSize; dx <= dotSize; dx++) {
                if (dx * dx + dy * dy <= dotSize * dotSize) {
                    const px = x + dx;
                    const py = y + dy;
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        output[idx] = r;
                        output[idx + 1] = g;
                        output[idx + 2] = b;
                        output[idx + 3] = 255;
                    }
                }
            }
        }

        // 報告進度
        const progress = (i + 1) / numDots;
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
