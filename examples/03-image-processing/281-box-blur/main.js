/**
 * 均值模糊 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與模糊參數設定
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理圖片上傳與顯示
 * 3. 管理模糊半徑參數
 * 4. 傳送處理請求給 Worker
 * 5. 接收並顯示處理結果
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 原始圖片數據
let originalImageData = null;

// ===== DOM 元素參考 =====

const elements = {
    // 上傳區域
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,

    // 參數控制
    radiusInput: null,
    radiusValue: null,
    kernelSize: null,
    presetBtns: null,

    // 按鈕
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,

    // 進度顯示
    progressBar: null,
    progressText: null,

    // 預覽區域
    previewSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null
};

// ===== 初始化 =====

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.radiusInput = document.getElementById('radius-input');
    elements.radiusValue = document.getElementById('radius-value');
    elements.kernelSize = document.getElementById('kernel-size');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.applyBtn = document.getElementById('apply-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.previewSection = document.getElementById('preview-section');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.resultStats = document.getElementById('result-stats');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 上傳區域點擊
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // 檔案選擇
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 拖放上傳
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', handleFileDrop);

    // 載入範例圖片
    elements.loadDemoBtn.addEventListener('click', loadDemoImage);

    // 半徑滑桿
    elements.radiusInput.addEventListener('input', updateRadiusDisplay);

    // 快速設定按鈕
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const radius = parseInt(btn.dataset.radius);
            elements.radiusInput.value = radius;
            updateRadiusDisplay();
        });
    });

    // 套用模糊
    elements.applyBtn.addEventListener('click', applyBlur);

    // 還原原圖
    elements.resetBtn.addEventListener('click', resetToOriginal);

    // 下載結果
    elements.downloadBtn.addEventListener('click', downloadResult);
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        alert('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== 檔案處理 =====

/**
 * 處理檔案選擇
 * @param {Event} event - 事件物件
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadImage(file);
    }
}

/**
 * 處理拖放上傳
 * @param {DragEvent} event - 拖放事件
 */
function handleFileDrop(event) {
    event.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

/**
 * 載入圖片
 * @param {File} file - 圖片檔案
 */
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            displayImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * 載入範例圖片
 */
function loadDemoImage() {
    // 建立一個有細節的範例圖片
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#2a2a4e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製格子圖案 (用於觀察模糊效果)
    const gridSize = 20;
    for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
            if ((x / gridSize + y / gridSize) % 2 === 0) {
                ctx.fillStyle = '#4a4a7e';
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
    }

    // 添加一些幾何圖形
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ecdc4';
    ctx.fillRect(200, 60, 80, 80);

    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.moveTo(320, 60);
    ctx.lineTo(380, 140);
    ctx.lineTo(260, 140);
    ctx.closePath();
    ctx.fill();

    // 添加文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Box Blur Test', canvas.width / 2, 220);

    // 添加線條
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 260);
    ctx.lineTo(350, 260);
    ctx.stroke();

    const img = new Image();
    img.onload = function() {
        displayImage(img);
    };
    img.src = canvas.toDataURL();
}

/**
 * 顯示圖片到 Canvas
 * @param {HTMLImageElement} img - 圖片元素
 */
function displayImage(img) {
    const maxWidth = 500;
    const maxHeight = 400;

    let width = img.width;
    let height = img.height;

    // 縮放以適應預覽區域
    if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
    }
    if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
    }

    // 設定 Canvas 尺寸
    elements.originalCanvas.width = width;
    elements.originalCanvas.height = height;
    elements.resultCanvas.width = width;
    elements.resultCanvas.height = height;

    // 繪製原圖
    const ctx = elements.originalCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // 儲存原始數據
    originalImageData = ctx.getImageData(0, 0, width, height);

    // 複製到結果 Canvas
    elements.resultCanvas.getContext('2d').drawImage(elements.originalCanvas, 0, 0);

    // 顯示預覽區域
    elements.previewSection.style.display = 'block';

    // 啟用按鈕
    updateButtonStates();
}

// ===== 參數控制 =====

/**
 * 更新半徑顯示
 */
function updateRadiusDisplay() {
    const radius = parseInt(elements.radiusInput.value);
    elements.radiusValue.textContent = radius;
    elements.kernelSize.textContent = Math.pow(2 * radius + 1, 2);
}

/**
 * 更新按鈕狀態
 */
function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applyBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

// ===== 模糊處理 =====

/**
 * 套用模糊
 */
function applyBlur() {
    if (!originalImageData) return;

    const radius = parseInt(elements.radiusInput.value);

    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    // 複製原始數據
    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    // 發送到 Worker
    worker.postMessage({
        type: 'APPLY_BLUR',
        payload: {
            imageData: imageData,
            radius: radius
        }
    }, [imageData.data.buffer]);
}

/**
 * 還原原圖
 */
function resetToOriginal() {
    if (!originalImageData) return;

    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(originalImageData, 0, 0);

    elements.resultStats.innerHTML = '';
    updateProgress(0, '已還原原圖');
}

/**
 * 下載結果
 */
function downloadResult() {
    const link = document.createElement('a');
    link.download = 'box-blurred-image.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

// ===== Worker 通訊 =====

/**
 * 處理來自 Worker 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload);
            elements.applyBtn.disabled = false;
            break;

        case 'ERROR':
            alert(payload.message);
            elements.applyBtn.disabled = false;
            break;
    }
}

/**
 * 處理 Worker 錯誤
 * @param {ErrorEvent} error - 錯誤事件
 */
function handleWorkerError(error) {
    console.error('Worker 錯誤:', error);
    alert(`Worker 錯誤: ${error.message}`);
    elements.applyBtn.disabled = false;

    // 重新初始化 Worker
    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== UI 更新 =====

/**
 * 更新進度顯示
 * @param {number} percent - 進度百分比
 * @param {string} message - 進度訊息
 */
function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

/**
 * 顯示處理結果
 * @param {Object} result - 結果物件
 */
function displayResult(result) {
    // 繪製結果
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(result.imageData, 0, 0);

    // 顯示統計資訊
    const pixelCount = result.imageData.width * result.imageData.height;
    const operationsPerPixel = result.kernelSize;
    const totalOperations = pixelCount * operationsPerPixel;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">模糊半徑：</span>
            <span class="stat-value">${result.radius} px</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">核心大小：</span>
            <span class="stat-value">${Math.sqrt(result.kernelSize)}×${Math.sqrt(result.kernelSize)} (${result.kernelSize} 像素)</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">圖片尺寸：</span>
            <span class="stat-value">${result.imageData.width}×${result.imageData.height}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">總運算次數：</span>
            <span class="stat-value">${(totalOperations / 1000000).toFixed(2)}M</span>
        </div>
    `;
}
