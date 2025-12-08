/**
 * 閾值處理 - 主執行緒腳本
 *
 * 功能：管理閾值設定、直方圖顯示與 Worker 通訊
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;
let isProcessing = false;
let currentMethod = 'global';
let histogramData = null;

// ===== DOM 元素參考 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadSampleBtn: null,
    methodBtns: null,
    threshold: null,
    thresholdIndicator: null,
    blockSize: null,
    constantC: null,
    globalControls: null,
    adaptiveControls: null,
    otsuInfo: null,
    otsuResult: null,
    outputModes: null,
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,
    progressBar: null,
    progressText: null,
    histogramCanvas: null,
    histogramInfo: null,
    resultSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateThresholdIndicator();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadSampleBtn = document.getElementById('load-sample-btn');
    elements.methodBtns = document.querySelectorAll('.method-btn');
    elements.threshold = document.getElementById('threshold');
    elements.thresholdIndicator = document.getElementById('threshold-indicator');
    elements.blockSize = document.getElementById('block-size');
    elements.constantC = document.getElementById('constant-c');
    elements.globalControls = document.getElementById('global-controls');
    elements.adaptiveControls = document.getElementById('adaptive-controls');
    elements.otsuInfo = document.getElementById('otsu-info');
    elements.otsuResult = document.getElementById('otsu-threshold-result');
    elements.outputModes = document.querySelectorAll('input[name="output-mode"]');
    elements.applyBtn = document.getElementById('apply-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.histogramCanvas = document.getElementById('histogram-canvas');
    elements.histogramInfo = document.getElementById('histogram-info');
    elements.resultSection = document.getElementById('result-section');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.resultStats = document.getElementById('result-stats');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    // 圖片上傳
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.loadSampleBtn.addEventListener('click', loadSampleImage);

    // 方法選擇
    elements.methodBtns.forEach(btn => {
        btn.addEventListener('click', () => selectMethod(btn.dataset.method));
    });

    // 滑桿更新
    elements.threshold.addEventListener('input', () => {
        document.getElementById('threshold-value').textContent = elements.threshold.value;
        updateThresholdIndicator();
        drawHistogramWithThreshold();
    });
    elements.blockSize.addEventListener('input', () => {
        document.getElementById('block-size-value').textContent = elements.blockSize.value;
    });
    elements.constantC.addEventListener('input', () => {
        document.getElementById('constant-c-value').textContent = elements.constantC.value;
    });

    // 操作按鈕
    elements.applyBtn.addEventListener('click', applyThreshold);
    elements.resetBtn.addEventListener('click', resetSettings);
    elements.downloadBtn.addEventListener('click', downloadResult);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload);
            isProcessing = false;
            updateUIState();
            break;

        case 'HISTOGRAM_RESULT':
            histogramData = payload;
            drawHistogram(payload);
            break;

        case 'ERROR':
            showError(payload.message);
            isProcessing = false;
            updateUIState();
            break;
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    isProcessing = false;
    updateUIState();
}

// ===== 圖片處理 =====

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            setupCanvases(img);
            elements.applyBtn.disabled = false;
            hideError();
            calculateHistogram();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadSampleImage() {
    // 創建一個有漸層的測試圖片
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // 繪製漸層背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加一些文字和圖形
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Threshold', 50, 100);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Test', 400, 100);

    // 繪製各種灰階圓形
    for (let i = 0; i < 10; i++) {
        const gray = Math.floor(i * 255 / 9);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.beginPath();
        ctx.arc(64 + i * 60, 250, 25, 0, Math.PI * 2);
        ctx.fill();
    }

    // 添加棋盤格圖案
    const tileSize = 40;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 16; col++) {
            const isLight = (row + col) % 2 === 0;
            ctx.fillStyle = isLight ? '#cccccc' : '#333333';
            ctx.fillRect(col * tileSize, 350 + row * tileSize, tileSize, tileSize);
        }
    }

    const img = new Image();
    img.onload = () => {
        setupCanvases(img);
        elements.applyBtn.disabled = false;
        hideError();
        calculateHistogram();
    };
    img.src = canvas.toDataURL();
}

function setupCanvases(img) {
    // 限制最大尺寸
    const maxSize = 800;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }

    // 設置原始畫布
    elements.originalCanvas.width = width;
    elements.originalCanvas.height = height;
    const origCtx = elements.originalCanvas.getContext('2d');
    origCtx.drawImage(img, 0, 0, width, height);
    originalImageData = origCtx.getImageData(0, 0, width, height);

    // 設置結果畫布
    elements.resultCanvas.width = width;
    elements.resultCanvas.height = height;

    elements.resultSection.classList.remove('hidden');
}

// ===== 直方圖 =====

function calculateHistogram() {
    if (!originalImageData) return;

    worker.postMessage({
        type: 'CALCULATE_HISTOGRAM',
        payload: {
            imageData: {
                data: new Uint8ClampedArray(originalImageData.data),
                width: originalImageData.width,
                height: originalImageData.height
            }
        }
    });
}

function drawHistogram(data) {
    const canvas = elements.histogramCanvas;
    const ctx = canvas.getContext('2d');
    const { histogram, maxCount, stats } = data;

    // 清除畫布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製直方圖
    const barWidth = canvas.width / 256;
    const maxHeight = canvas.height - 20;

    ctx.fillStyle = '#4a9eff';
    for (let i = 0; i < 256; i++) {
        const barHeight = (histogram[i] / maxCount) * maxHeight;
        ctx.fillRect(
            i * barWidth,
            canvas.height - barHeight - 10,
            barWidth,
            barHeight
        );
    }

    // 繪製閾值線
    if (currentMethod === 'global') {
        const threshold = parseInt(elements.threshold.value);
        const x = threshold * barWidth;
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 顯示統計資訊
    elements.histogramInfo.innerHTML = `
        平均值: ${stats.mean} | 標準差: ${stats.stdDev} | 範圍: ${stats.minGray} - ${stats.maxGray}
    `;
}

function drawHistogramWithThreshold() {
    if (histogramData) {
        drawHistogram(histogramData);
    }
}

// ===== 方法選擇 =====

function selectMethod(method) {
    currentMethod = method;

    // 更新按鈕狀態
    elements.methodBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });

    // 顯示/隱藏對應的控制區域
    elements.globalControls.classList.toggle('hidden', method !== 'global');
    elements.adaptiveControls.classList.toggle('hidden',
        method !== 'adaptive-mean' && method !== 'adaptive-gaussian');
    elements.otsuInfo.classList.toggle('hidden', method !== 'otsu');

    // 重繪直方圖
    drawHistogramWithThreshold();
}

function updateThresholdIndicator() {
    const value = parseInt(elements.threshold.value);
    elements.thresholdIndicator.style.left = `${(value / 255) * 100}%`;
}

// ===== 處理與輸出 =====

function applyThreshold() {
    if (!originalImageData || isProcessing) return;

    isProcessing = true;
    updateUIState();
    hideError();

    const outputMode = document.querySelector('input[name="output-mode"]:checked').value;

    worker.postMessage({
        type: 'PROCESS',
        payload: {
            imageData: {
                data: new Uint8ClampedArray(originalImageData.data),
                width: originalImageData.width,
                height: originalImageData.height
            },
            method: currentMethod,
            threshold: parseInt(elements.threshold.value),
            outputMode: outputMode,
            adaptiveParams: {
                blockSize: parseInt(elements.blockSize.value),
                constantC: parseInt(elements.constantC.value)
            }
        }
    });
}

function displayResult(result) {
    const { imageData, duration, pixelCount, actualThreshold, whitePixels, blackPixels, whitePercentage } = result;

    // 繪製結果
    const ctx = elements.resultCanvas.getContext('2d');
    const newImageData = ctx.createImageData(imageData.width, imageData.height);
    newImageData.data.set(new Uint8ClampedArray(imageData.data));
    ctx.putImageData(newImageData, 0, 0);

    // 如果使用 Otsu，顯示計算出的閾值
    if (currentMethod === 'otsu') {
        elements.otsuResult.textContent = `計算出的最佳閾值: ${actualThreshold}`;
    }

    // 顯示統計
    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">使用閾值：</span>
            <span class="stat-value">${actualThreshold}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">白色像素：</span>
            <span class="stat-value">${whitePixels.toLocaleString()} (${whitePercentage}%)</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">黑色像素：</span>
            <span class="stat-value">${blackPixels.toLocaleString()}</span>
        </div>
    `;

    elements.downloadBtn.disabled = false;
    updateProgress(100, '處理完成');
}

function resetSettings() {
    elements.threshold.value = 128;
    elements.blockSize.value = 11;
    elements.constantC.value = 2;
    document.getElementById('threshold-value').textContent = '128';
    document.getElementById('block-size-value').textContent = '11';
    document.getElementById('constant-c-value').textContent = '2';
    document.querySelector('input[name="output-mode"][value="binary"]').checked = true;
    selectMethod('global');
    updateThresholdIndicator();
    drawHistogramWithThreshold();
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'threshold-result.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

// ===== UI 輔助函數 =====

function updateUIState() {
    elements.applyBtn.disabled = isProcessing || !originalImageData;
    elements.resetBtn.disabled = isProcessing;
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
