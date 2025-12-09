/**
 * 通道混合 - 主執行緒腳本
 *
 * 功能：管理混合矩陣、圖片處理與 Worker 通訊
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;
let isProcessing = false;

// ===== DOM 元素參考 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadSampleBtn: null,
    matrixInputs: {},
    presetBtns: null,
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null,
    errorMessage: null
};

// ===== 預設矩陣 =====

const presets = {
    identity: {
        rr: 1, rg: 0, rb: 0,
        gr: 0, gg: 1, gb: 0,
        br: 0, bg: 0, bb: 1
    },
    grayscale: {
        rr: 0.299, rg: 0.587, rb: 0.114,
        gr: 0.299, gg: 0.587, gb: 0.114,
        br: 0.299, bg: 0.587, bb: 0.114
    },
    sepia: {
        rr: 0.393, rg: 0.769, rb: 0.189,
        gr: 0.349, gg: 0.686, gb: 0.168,
        br: 0.272, bg: 0.534, bb: 0.131
    },
    negative: {
        rr: -1, rg: 0, rb: 0,
        gr: 0, gg: -1, gb: 0,
        br: 0, bg: 0, bb: -1
    },
    'swap-rg': {
        rr: 0, rg: 1, rb: 0,
        gr: 1, gg: 0, gb: 0,
        br: 0, bg: 0, bb: 1
    },
    'swap-rb': {
        rr: 0, rg: 0, rb: 1,
        gr: 0, gg: 1, gb: 0,
        br: 1, bg: 0, bb: 0
    },
    'swap-gb': {
        rr: 1, rg: 0, rb: 0,
        gr: 0, gg: 0, gb: 1,
        br: 0, bg: 1, bb: 0
    },
    'red-only': {
        rr: 1, rg: 0, rb: 0,
        gr: 0, gg: 0, gb: 0,
        br: 0, bg: 0, bb: 0
    },
    'green-only': {
        rr: 0, rg: 0, rb: 0,
        gr: 0, gg: 1, gb: 0,
        br: 0, bg: 0, bb: 0
    },
    'blue-only': {
        rr: 0, rg: 0, rb: 0,
        gr: 0, gg: 0, gb: 0,
        br: 0, bg: 0, bb: 1
    },
    vintage: {
        rr: 0.6, rg: 0.3, rb: 0.1,
        gr: 0.2, gg: 0.7, gb: 0.1,
        br: 0.1, bg: 0.2, bb: 0.5
    },
    cool: {
        rr: 0.8, rg: 0, rb: 0.2,
        gr: 0, gg: 0.9, gb: 0.1,
        br: 0.1, bg: 0.1, bb: 1.2
    },
    warm: {
        rr: 1.2, rg: 0.1, rb: 0,
        gr: 0.1, gg: 1.0, gb: 0,
        br: 0, bg: 0.1, bb: 0.8
    }
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadSampleBtn = document.getElementById('load-sample-btn');

    // 矩陣輸入
    ['rr', 'rg', 'rb', 'gr', 'gg', 'gb', 'br', 'bg', 'bb'].forEach(id => {
        elements.matrixInputs[id] = document.getElementById(id);
    });

    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.applyBtn = document.getElementById('apply-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
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

    // 預設效果
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    // 操作按鈕
    elements.applyBtn.addEventListener('click', applyMixing);
    elements.resetBtn.addEventListener('click', resetMatrix);
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
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadSampleImage() {
    // 創建一個彩色測試圖片
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // 繪製色彩條紋
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const stripeHeight = canvas.height / colors.length;
    colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, i * stripeHeight, canvas.width, stripeHeight);
    });

    // 添加漸變覆蓋
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加色環
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    for (let angle = 0; angle < 360; angle += 1) {
        const hue = angle;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, 100, (angle - 1) * Math.PI / 180, angle * Math.PI / 180);
        ctx.fill();
    }

    const img = new Image();
    img.onload = () => {
        setupCanvases(img);
        elements.applyBtn.disabled = false;
        hideError();
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

// ===== 矩陣操作 =====

function getMatrix() {
    const matrix = {};
    ['rr', 'rg', 'rb', 'gr', 'gg', 'gb', 'br', 'bg', 'bb'].forEach(id => {
        matrix[id] = parseFloat(elements.matrixInputs[id].value) || 0;
    });
    return matrix;
}

function setMatrix(matrix) {
    Object.keys(matrix).forEach(id => {
        if (elements.matrixInputs[id]) {
            elements.matrixInputs[id].value = matrix[id];
        }
    });
}

function applyPreset(presetName) {
    if (presets[presetName]) {
        setMatrix(presets[presetName]);
    }
}

function resetMatrix() {
    setMatrix(presets.identity);
}

// ===== 處理與輸出 =====

function applyMixing() {
    if (!originalImageData || isProcessing) return;

    isProcessing = true;
    updateUIState();
    hideError();

    const matrix = getMatrix();

    worker.postMessage({
        type: 'PROCESS',
        payload: {
            imageData: {
                data: new Uint8ClampedArray(originalImageData.data),
                width: originalImageData.width,
                height: originalImageData.height
            },
            matrix: matrix
        }
    });
}

function displayResult(result) {
    const { imageData, duration, pixelCount } = result;

    // 繪製結果
    const ctx = elements.resultCanvas.getContext('2d');
    const newImageData = ctx.createImageData(imageData.width, imageData.height);
    newImageData.data.set(new Uint8ClampedArray(imageData.data));
    ctx.putImageData(newImageData, 0, 0);

    // 顯示統計
    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">像素數量：</span>
            <span class="stat-value">${pixelCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">圖片尺寸：</span>
            <span class="stat-value">${imageData.width} × ${imageData.height}</span>
        </div>
    `;

    elements.downloadBtn.disabled = false;
    updateProgress(100, '處理完成');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'channel-mixed.png';
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
