// 主執行緒邏輯

const worker = new Worker('worker.js');

const loadSlider = document.getElementById('load-slider');
const loadValue = document.getElementById('load-value');
const serviceStatus = document.getElementById('service-status');
const sourceImage = document.getElementById('source-image');
const resultCanvas = document.getElementById('result-canvas');
const processBtn = document.getElementById('process-btn');
const processInfo = document.getElementById('process-info');
const ctx = resultCanvas.getContext('2d');

let currentLoad = 0;
const DEGRADATION_THRESHOLD = 80;

// 更新負載顯示與狀態
loadSlider.addEventListener('input', (e) => {
    currentLoad = parseInt(e.target.value, 10);
    loadValue.textContent = currentLoad;

    if (currentLoad >= DEGRADATION_THRESHOLD) {
        serviceStatus.textContent = '降級模式';
        serviceStatus.className = 'status-badge degraded';
    } else {
        serviceStatus.textContent = '正常模式';
        serviceStatus.className = 'status-badge normal';
    }
});

// 處理結果回調
worker.onmessage = function(e) {
    const { imageData, mode, duration } = e.data;

    // 將處理後的 ImageData 繪製到 Canvas
    ctx.putImageData(imageData, 0, 0);

    processInfo.textContent = `模式: ${mode} | 耗時: ${duration}ms`;
    processBtn.disabled = false;
};

// 點擊處理按鈕
processBtn.addEventListener('click', () => {
    processBtn.disabled = true;
    processInfo.textContent = '處理中...';

    // 獲取圖片數據
    // 注意：實際應用中應處理跨域問題，這裡假設圖片允許 CORS 或同源
    // 為了演示方便，我們繪製 sourceImage 到 canvas 再提取數據
    ctx.drawImage(sourceImage, 0, 0, 400, 300);
    const imageData = ctx.getImageData(0, 0, 400, 300);

    // 判斷是否需要降級
    // 將當前負載與圖片數據一起發送給 Worker，或者只發送降級標誌
    const isDegraded = currentLoad >= DEGRADATION_THRESHOLD;

    worker.postMessage({
        imageData: imageData,
        isDegraded: isDegraded
    });
});
