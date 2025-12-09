/**
 * 高斯模糊 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與高斯參數設定
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理圖片上傳與顯示
 * 3. 管理高斯參數 (半徑與 sigma)
 * 4. 視覺化高斯核心
 * 5. 傳送處理請求給 Worker
 * 6. 接收並顯示處理結果
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
    sigmaInput: null,
    sigmaValue: null,
    kernelSize: null,
    presetBtns: null,

    // 核心預覽
    kernelPreview: null,
    gaussianCurve: null,

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
    drawGaussianCurve();
    updateKernelPreview();
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
    elements.sigmaInput = document.getElementById('sigma-input');
    elements.sigmaValue = document.getElementById('sigma-value');
    elements.kernelSize = document.getElementById('kernel-size');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.kernelPreview = document.getElementById('kernel-preview');
    elements.gaussianCurve = document.getElementById('gaussian-curve');
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
    elements.radiusInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
        drawGaussianCurve();
    });

    // Sigma 滑桿
    elements.sigmaInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
        drawGaussianCurve();
    });

    // 快速設定按鈕
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const radius = parseInt(btn.dataset.radius);
            const sigma = parseFloat(btn.dataset.sigma);
            elements.radiusInput.value = radius;
            elements.sigmaInput.value = sigma;
            updateParameterDisplay();
            updateKernelPreview();
            drawGaussianCurve();
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
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 背景漸層
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製銳利的幾何圖形（用於觀察模糊效果）
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f3460';
    ctx.fillRect(180, 60, 80, 80);

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(320, 60);
    ctx.lineTo(380, 140);
    ctx.lineTo(260, 140);
    ctx.closePath();
    ctx.fill();

    // 細線條
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(50 + i * 30, 180);
        ctx.lineTo(50 + i * 30, 280);
        ctx.stroke();
    }

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Gaussian Blur Test', canvas.width / 2, 250);

    // 小圓點圖案
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 6; x++) {
            ctx.fillStyle = `hsl(${x * 60}, 70%, 60%)`;
            ctx.beginPath();
            ctx.arc(250 + x * 25, 180 + y * 25, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

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

    if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
    }
    if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
    }

    elements.originalCanvas.width = width;
    elements.originalCanvas.height = height;
    elements.resultCanvas.width = width;
    elements.resultCanvas.height = height;

    const ctx = elements.originalCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    originalImageData = ctx.getImageData(0, 0, width, height);

    elements.resultCanvas.getContext('2d').drawImage(elements.originalCanvas, 0, 0);

    elements.previewSection.style.display = 'block';

    updateButtonStates();
}

// ===== 參數控制 =====

/**
 * 更新參數顯示
 */
function updateParameterDisplay() {
    const radius = parseInt(elements.radiusInput.value);
    const sigma = parseFloat(elements.sigmaInput.value);
    const size = 2 * radius + 1;

    elements.radiusValue.textContent = radius;
    elements.sigmaValue.textContent = sigma.toFixed(1);
    elements.kernelSize.textContent = `${size}×${size}`;
}

/**
 * 更新高斯核心預覽
 */
function updateKernelPreview() {
    const radius = parseInt(elements.radiusInput.value);
    const sigma = parseFloat(elements.sigmaInput.value);

    // 請求 Worker 產生核心
    worker.postMessage({
        type: 'GENERATE_KERNEL',
        payload: { radius, sigma }
    });
}

/**
 * 繪製高斯曲線
 */
function drawGaussianCurve() {
    const canvas = elements.gaussianCurve;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const sigma = parseFloat(elements.sigmaInput.value);

    // 清除畫布
    ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
    ctx.fillRect(0, 0, width, height);

    // 繪製高斯曲線
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerX = width / 2;
    const scale = width / (6 * sigma);

    for (let x = 0; x < width; x++) {
        const xVal = (x - centerX) / scale;
        const yVal = Math.exp(-(xVal * xVal) / (2 * sigma * sigma));
        const y = height - (yVal * (height - 10)) - 5;

        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // 標記 σ 位置
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerX - sigma * scale, 0);
    ctx.lineTo(centerX - sigma * scale, height);
    ctx.moveTo(centerX + sigma * scale, 0);
    ctx.lineTo(centerX + sigma * scale, height);
    ctx.stroke();
    ctx.setLineDash([]);
}

/**
 * 顯示核心預覽
 * @param {Object} data - 核心數據
 */
function displayKernelPreview(data) {
    const { kernel, kernelSize } = data;
    const maxDisplay = Math.min(kernelSize, 7); // 最多顯示 7×7
    const step = Math.ceil(kernelSize / maxDisplay);

    let html = '<div class="kernel-grid" style="grid-template-columns: repeat(' + maxDisplay + ', 1fr);">';

    // 找出最大值用於正規化顯示
    let maxVal = 0;
    for (let i = 0; i < kernel.length; i++) {
        if (kernel[i] > maxVal) maxVal = kernel[i];
    }

    for (let y = 0; y < kernelSize; y += step) {
        for (let x = 0; x < kernelSize; x += step) {
            const idx = y * kernelSize + x;
            const value = kernel[idx];
            const intensity = value / maxVal;
            const bgColor = `rgba(16, 185, 129, ${intensity * 0.8})`;

            html += `<span style="background: ${bgColor}">${value.toFixed(3)}</span>`;
        }
    }

    html += '</div>';

    if (kernelSize > maxDisplay) {
        html += `<p class="kernel-note">顯示簡化版本 (實際 ${kernelSize}×${kernelSize})</p>`;
    }

    elements.kernelPreview.innerHTML = html;
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
    const sigma = parseFloat(elements.sigmaInput.value);

    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'APPLY_BLUR',
        payload: {
            imageData: imageData,
            radius: radius,
            sigma: sigma
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
    link.download = 'gaussian-blurred-image.png';
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

        case 'KERNEL':
            displayKernelPreview(payload);
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
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(result.imageData, 0, 0);

    const pixelCount = result.imageData.width * result.imageData.height;
    const kernelPixels = result.kernelSize * result.kernelSize;
    const totalOperations = pixelCount * kernelPixels;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">半徑 / Sigma：</span>
            <span class="stat-value">${result.radius}px / σ=${result.sigma}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">核心大小：</span>
            <span class="stat-value">${result.kernelSize}×${result.kernelSize}</span>
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
