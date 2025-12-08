/**
 * 白平衡校正 - 主執行緒腳本
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
    algorithmInputs: null,
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
    elements.algorithmInputs = document.querySelectorAll('input[name="algorithm"]');
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
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

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

    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

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

function getSelectedAlgorithm() {
    for (const input of elements.algorithmInputs) {
        if (input.checked) {
            return input.value;
        }
    }
    return 'gray-world';
}

// ===== 圖片處理 =====
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            elements.originalCanvas.width = img.width;
            elements.originalCanvas.height = img.height;
            elements.resultCanvas.width = img.width;
            elements.resultCanvas.height = img.height;

            const ctx = elements.originalCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            originalImageData = ctx.getImageData(0, 0, img.width, img.height);

            elements.workerBtn.disabled = false;
            elements.mainThreadBtn.disabled = false;
            elements.resetBtn.disabled = false;

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

    const algorithm = getSelectedAlgorithm();

    isProcessing = true;
    updateUIState(true);
    hideError();

    const imageDataCopy = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'START',
        payload: {
            imageData: imageDataCopy,
            algorithm: algorithm
        }
    }, [imageDataCopy.data.buffer]);
}

function startMainThreadProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const algorithm = getSelectedAlgorithm();

    isProcessing = true;
    updateUIState(true);
    hideError();
    updateProgress(0, '主執行緒處理中...');

    setTimeout(() => {
        const startTime = performance.now();

        const result = whiteBalanceMainThread(originalImageData, algorithm);

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
function whiteBalanceMainThread(imageData, algorithm) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;

    let gains = { r: 1, g: 1, b: 1 };
    let avgR = 0, avgG = 0, avgB = 0;
    let maxR = 0, maxG = 0, maxB = 0;

    // 計算統計資料
    for (let i = 0; i < data.length; i += 4) {
        avgR += data[i];
        avgG += data[i + 1];
        avgB += data[i + 2];

        if (data[i] > maxR) maxR = data[i];
        if (data[i + 1] > maxG) maxG = data[i + 1];
        if (data[i + 2] > maxB) maxB = data[i + 2];
    }

    avgR /= pixelCount;
    avgG /= pixelCount;
    avgB /= pixelCount;

    const avgGray = (avgR + avgG + avgB) / 3;

    // 根據演算法計算增益
    switch (algorithm) {
        case 'gray-world':
            gains = {
                r: avgGray / avgR,
                g: avgGray / avgG,
                b: avgGray / avgB
            };
            break;

        case 'white-patch':
            const maxVal = Math.max(maxR, maxG, maxB);
            gains = {
                r: maxVal / maxR,
                g: maxVal / maxG,
                b: maxVal / maxB
            };
            break;

        case 'combined':
            const grayWorldGains = {
                r: avgGray / avgR,
                g: avgGray / avgG,
                b: avgGray / avgB
            };
            const maxValue = Math.max(maxR, maxG, maxB);
            const whitePatchGains = {
                r: maxValue / maxR,
                g: maxValue / maxG,
                b: maxValue / maxB
            };
            gains = {
                r: (grayWorldGains.r + whitePatchGains.r) / 2,
                g: (grayWorldGains.g + whitePatchGains.g) / 2,
                b: (grayWorldGains.b + whitePatchGains.b) / 2
            };
            break;
    }

    // 應用增益
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.round(data[i] * gains.r));
        data[i + 1] = Math.min(255, Math.round(data[i + 1] * gains.g));
        data[i + 2] = Math.min(255, Math.round(data[i + 2] * gains.b));
    }

    return {
        imageData: new ImageData(data, width, height),
        stats: {
            algorithm: algorithm,
            avgBefore: { r: avgR.toFixed(2), g: avgG.toFixed(2), b: avgB.toFixed(2) },
            gains: { r: gains.r.toFixed(3), g: gains.g.toFixed(3), b: gains.b.toFixed(3) }
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

    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    const algorithmNames = {
        'gray-world': '灰度世界',
        'white-patch': '白塊法',
        'combined': '混合模式'
    };

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理耗時：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">演算法：</span>
            <span class="stat-value">${algorithmNames[stats.algorithm]}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">原始 RGB 平均：</span>
            <span class="stat-value">${stats.avgBefore.r}, ${stats.avgBefore.g}, ${stats.avgBefore.b}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">RGB 增益：</span>
            <span class="stat-value">${stats.gains.r}, ${stats.gains.g}, ${stats.gains.b}</span>
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
    link.download = 'white-balance-result.png';
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
