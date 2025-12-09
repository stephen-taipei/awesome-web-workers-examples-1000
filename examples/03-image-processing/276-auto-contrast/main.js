/**
 * 自動對比 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與結果顯示
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 全域變數 =====
let worker = null;
let isProcessing = false;
let originalImageData = null;

// ===== DOM 元素參考 =====
const elements = {
    uploadArea: null,
    fileInput: null,
    lowPercentile: null,
    highPercentile: null,
    workerBtn: null,
    mainThreadBtn: null,
    resetBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    originalCanvas: null,
    resultCanvas: null,
    downloadBtn: null,
    errorMessage: null,
    comparisonSection: null,
    workerTime: null,
    mainThreadTime: null,
    speedup: null
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateUIState(false);
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.lowPercentile = document.getElementById('low-percentile');
    elements.highPercentile = document.getElementById('high-percentile');
    elements.workerBtn = document.getElementById('worker-btn');
    elements.mainThreadBtn = document.getElementById('main-thread-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.workerTime = document.getElementById('worker-time');
    elements.mainThreadTime = document.getElementById('main-thread-time');
    elements.speedup = document.getElementById('speedup');
}

function setupEventListeners() {
    // 上傳區域點擊
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // 拖放處理
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    // 檔案選擇
    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    // 處理按鈕
    elements.workerBtn.addEventListener('click', startWorkerProcessing);
    elements.mainThreadBtn.addEventListener('click', startMainThreadProcessing);
    elements.resetBtn.addEventListener('click', resetImage);
    elements.downloadBtn.addEventListener('click', downloadResult);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.workerBtn.disabled = true;
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== 圖片處理 =====
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // 設定 canvas 大小
            elements.originalCanvas.width = img.width;
            elements.originalCanvas.height = img.height;
            elements.resultCanvas.width = img.width;
            elements.resultCanvas.height = img.height;

            // 繪製原始圖片
            const ctx = elements.originalCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 儲存原始圖片資料
            originalImageData = ctx.getImageData(0, 0, img.width, img.height);

            // 啟用按鈕
            elements.workerBtn.disabled = false;
            elements.mainThreadBtn.disabled = false;
            elements.resetBtn.disabled = false;

            // 更新上傳區域顯示
            elements.uploadArea.innerHTML = `
                <div class="upload-preview">
                    <img src="${e.target.result}" alt="Preview">
                    <p>${img.width} x ${img.height} px</p>
                </div>
            `;

            hideError();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ===== Worker 通訊 =====
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload.imageData, payload.stats, payload.duration, 'worker');
            isProcessing = false;
            updateUIState(false);
            break;

        case 'ERROR':
            showError(payload.message);
            isProcessing = false;
            updateUIState(false);
            break;
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    isProcessing = false;
    updateUIState(false);

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 處理控制 =====
function startWorkerProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const lowPercentile = parseFloat(elements.lowPercentile.value);
    const highPercentile = parseFloat(elements.highPercentile.value);

    if (isNaN(lowPercentile) || isNaN(highPercentile)) {
        showError('請輸入有效的百分比值');
        return;
    }

    isProcessing = true;
    updateUIState(true);
    hideError();

    // 複製 ImageData 以便傳輸
    const imageDataCopy = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'START',
        payload: {
            imageData: imageDataCopy,
            lowPercentile: lowPercentile,
            highPercentile: highPercentile
        }
    }, [imageDataCopy.data.buffer]);
}

function startMainThreadProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const lowPercentile = parseFloat(elements.lowPercentile.value);
    const highPercentile = parseFloat(elements.highPercentile.value);

    if (isNaN(lowPercentile) || isNaN(highPercentile)) {
        showError('請輸入有效的百分比值');
        return;
    }

    isProcessing = true;
    updateUIState(true);
    hideError();
    updateProgress(0, '主執行緒處理中...');

    setTimeout(() => {
        const startTime = performance.now();

        const result = autoContrastMainThread(
            originalImageData,
            lowPercentile,
            highPercentile
        );

        const duration = performance.now() - startTime;

        displayResult(result.imageData, result.stats, duration, 'main');
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function resetImage() {
    if (originalImageData) {
        const ctx = elements.resultCanvas.getContext('2d');
        ctx.putImageData(originalImageData, 0, 0);
    }
    updateProgress(0, '已重置');
}

// ===== 主執行緒演算法 =====
function autoContrastMainThread(imageData, lowPercentile, highPercentile) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;

    // 計算直方圖
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);

    for (let i = 0; i < data.length; i += 4) {
        histR[data[i]]++;
        histG[data[i + 1]]++;
        histB[data[i + 2]]++;
    }

    // 計算累積直方圖
    const cdfR = new Uint32Array(256);
    const cdfG = new Uint32Array(256);
    const cdfB = new Uint32Array(256);

    cdfR[0] = histR[0];
    cdfG[0] = histG[0];
    cdfB[0] = histB[0];

    for (let i = 1; i < 256; i++) {
        cdfR[i] = cdfR[i - 1] + histR[i];
        cdfG[i] = cdfG[i - 1] + histG[i];
        cdfB[i] = cdfB[i - 1] + histB[i];
    }

    // 計算裁剪閾值
    const lowThreshold = Math.floor(pixelCount * lowPercentile / 100);
    const highThreshold = Math.floor(pixelCount * (100 - highPercentile) / 100);

    function findBounds(cdf) {
        let low = 0, high = 255;
        for (let i = 0; i < 256; i++) {
            if (cdf[i] >= lowThreshold) {
                low = i;
                break;
            }
        }
        for (let i = 255; i >= 0; i--) {
            if (cdf[i] <= highThreshold) {
                high = i;
                break;
            }
        }
        return { low, high };
    }

    const boundsR = findBounds(cdfR);
    const boundsG = findBounds(cdfG);
    const boundsB = findBounds(cdfB);

    // 建立映射表
    function createLUT(bounds) {
        const lut = new Uint8ClampedArray(256);
        const range = bounds.high - bounds.low;
        if (range === 0) {
            for (let i = 0; i < 256; i++) lut[i] = i;
        } else {
            for (let i = 0; i < 256; i++) {
                if (i <= bounds.low) {
                    lut[i] = 0;
                } else if (i >= bounds.high) {
                    lut[i] = 255;
                } else {
                    lut[i] = Math.round((i - bounds.low) * 255 / range);
                }
            }
        }
        return lut;
    }

    const lutR = createLUT(boundsR);
    const lutG = createLUT(boundsG);
    const lutB = createLUT(boundsB);

    // 應用映射
    for (let i = 0; i < data.length; i += 4) {
        data[i] = lutR[data[i]];
        data[i + 1] = lutG[data[i + 1]];
        data[i + 2] = lutB[data[i + 2]];
    }

    return {
        imageData: new ImageData(data, width, height),
        stats: {
            boundsR,
            boundsG,
            boundsB
        }
    };
}

// ===== UI 更新 =====
function updateUIState(processing) {
    elements.workerBtn.disabled = processing || !originalImageData;
    elements.mainThreadBtn.disabled = processing || !originalImageData;
    elements.resetBtn.disabled = processing || !originalImageData;
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function displayResult(imageData, stats, duration, source) {
    updateProgress(100, '處理完成');

    // 繪製結果
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    // 顯示統計資訊
    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理耗時：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">R 通道範圍：</span>
            <span class="stat-value">${stats.boundsR.low} - ${stats.boundsR.high}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">G 通道範圍：</span>
            <span class="stat-value">${stats.boundsG.low} - ${stats.boundsG.high}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">B 通道範圍：</span>
            <span class="stat-value">${stats.boundsB.low} - ${stats.boundsB.high}</span>
        </div>
    `;

    elements.resultSection.classList.remove('hidden');
    updatePerformanceComparison(duration, source);
}

function updatePerformanceComparison(duration, source) {
    if (source === 'worker') {
        elements.workerTime.textContent = `${duration.toFixed(2)} ms`;
    } else {
        elements.mainThreadTime.textContent = `${duration.toFixed(2)} ms`;
    }

    const workerTime = parseFloat(elements.workerTime.textContent);
    const mainTime = parseFloat(elements.mainThreadTime.textContent);

    if (!isNaN(workerTime) && !isNaN(mainTime) && workerTime > 0) {
        const ratio = mainTime / workerTime;
        elements.speedup.textContent = ratio > 1
            ? `Worker 快 ${ratio.toFixed(2)}x，且不阻塞 UI`
            : `效能相近，但 Worker 不阻塞 UI`;
    }

    elements.comparisonSection.classList.remove('hidden');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'auto-contrast-result.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
