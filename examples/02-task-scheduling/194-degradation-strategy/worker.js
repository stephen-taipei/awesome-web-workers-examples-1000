// 圖像處理 Worker

// 高品質處理：高斯模糊 + 邊緣檢測 (模擬耗時操作)
function highQualityProcess(imageData) {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // 簡單的高斯模糊模擬 (3x3 kernel)
    // 為了讓效果更明顯且耗時，我們可以重複幾次或使用更大 kernel
    // 這裡做一個簡單的灰階化 + 亮度反轉 + 模擬耗時循環

    const start = performance.now();
    // 模擬複雜計算
    while(performance.now() - start < 500) {
        // Busy wait to simulate heavy CPU load
    }

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 邊緣檢測效果 (簡化版)
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        output[i] = v;     // R
        output[i + 1] = v; // G
        output[i + 2] = v; // B
        output[i + 3] = 255; // Alpha
    }

    return new ImageData(output, width, height);
}

// 降級處理：快速灰階 (極簡運算)
function lowQualityProcess(imageData) {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // 快速遍歷，只做最簡單的灰階
    for (let i = 0; i < data.length; i += 4) {
        // 簡單平均法，比加權平均稍快
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        output[i] = avg;
        output[i+1] = avg;
        output[i+2] = avg;
        output[i+3] = 255;
    }

    return new ImageData(output, width, height);
}

self.onmessage = function(e) {
    const { imageData, isDegraded } = e.data;
    const startTime = performance.now();

    let resultImageData;
    let mode;

    if (isDegraded) {
        resultImageData = lowQualityProcess(imageData);
        mode = '降級 (Low Quality)';
    } else {
        resultImageData = highQualityProcess(imageData);
        mode = '正常 (High Quality)';
    }

    const endTime = performance.now();

    self.postMessage({
        imageData: resultImageData,
        mode: mode,
        duration: (endTime - startTime).toFixed(2)
    });
};
