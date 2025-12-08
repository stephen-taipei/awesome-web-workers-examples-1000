/**
 * 161. 進度追蹤 - 主執行緒
 */

const startBtn = document.getElementById('start-btn');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const processedCount = document.getElementById('processed-count');
const totalCount = document.getElementById('total-count');

// 設定任務總量
const TOTAL_ITEMS = 1000000;
totalCount.textContent = TOTAL_ITEMS.toLocaleString();

startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    updateProgress(0);
    statusText.textContent = '初始化 Worker...';

    // 建立 Worker
    const worker = new Worker('worker.js');

    // 監聽 Worker 訊息
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        switch (type) {
            case 'progress':
                // 更新進度條與文字
                updateProgress(data.percent);
                processedCount.textContent = data.current.toLocaleString();
                statusText.textContent = '處理中...';
                break;

            case 'done':
                // 完成
                updateProgress(100);
                statusText.textContent = `完成！耗時: ${data.duration}ms`;
                startBtn.disabled = false;
                worker.terminate();
                break;
        }
    };

    // 啟動任務
    worker.postMessage({
        command: 'start',
        total: TOTAL_ITEMS
    });
});

function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${Math.round(percent)}%`;
}
