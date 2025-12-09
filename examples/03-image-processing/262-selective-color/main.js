/**
 * 選擇性調色 - 主執行緒腳本
 *
 * 功能：管理顏色選取、參數調整與 Worker 通訊
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;
let isProcessing = false;
let isPickingColor = false;

// ===== DOM 元素參考 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadSampleBtn: null,
    targetColor: null,
    colorPreview: null,
    pickColorBtn: null,
    colorPresets: null,
    hueTolerance: null,
    satTolerance: null,
    lumTolerance: null,
    hueShift: null,
    satAdjust: null,
    lumAdjust: null,
    invertSelection: null,
    showMask: null,
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

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateColorPreview();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadSampleBtn = document.getElementById('load-sample-btn');
    elements.targetColor = document.getElementById('target-color');
    elements.colorPreview = document.getElementById('color-preview');
    elements.pickColorBtn = document.getElementById('pick-color-btn');
    elements.colorPresets = document.querySelectorAll('.color-preset');
    elements.hueTolerance = document.getElementById('hue-tolerance');
    elements.satTolerance = document.getElementById('sat-tolerance');
    elements.lumTolerance = document.getElementById('lum-tolerance');
    elements.hueShift = document.getElementById('hue-shift');
    elements.satAdjust = document.getElementById('sat-adjust');
    elements.lumAdjust = document.getElementById('lum-adjust');
    elements.invertSelection = document.getElementById('invert-selection');
    elements.showMask = document.getElementById('show-mask');
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

    // 顏色選擇
    elements.targetColor.addEventListener('input', updateColorPreview);
    elements.pickColorBtn.addEventListener('click', toggleColorPicker);
    elements.colorPresets.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.targetColor.value = btn.dataset.color;
            updateColorPreview();
        });
    });

    // 滑桿更新
    elements.hueTolerance.addEventListener('input', updateSliderDisplay);
    elements.satTolerance.addEventListener('input', updateSliderDisplay);
    elements.lumTolerance.addEventListener('input', updateSliderDisplay);
    elements.hueShift.addEventListener('input', updateSliderDisplay);
    elements.satAdjust.addEventListener('input', updateSliderDisplay);
    elements.lumAdjust.addEventListener('input', updateSliderDisplay);

    // 操作按鈕
    elements.applyBtn.addEventListener('click', applyAdjustment);
    elements.resetBtn.addEventListener('click', resetParameters);
    elements.downloadBtn.addEventListener('click', downloadResult);

    // 從圖片選取顏色
    elements.originalCanvas.addEventListener('click', handleCanvasClick);
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
    // 創建一個有多種顏色的測試圖片
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // 繪製背景漸層
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#2c3e50');
    bgGradient.addColorStop(1, '#3498db');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製各種顏色的形狀
    const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#9b59b6'];
    colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        const x = 80 + (i % 3) * 200;
        const y = 120 + Math.floor(i / 3) * 200;
        ctx.arc(x, y, 70, 0, Math.PI * 2);
        ctx.fill();
    });

    // 添加一些花朵圖案
    ctx.fillStyle = '#ff6b6b';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const angle = (i * 72) * Math.PI / 180;
        ctx.arc(
            520 + Math.cos(angle) * 30,
            360 + Math.sin(angle) * 30,
            20, 0, Math.PI * 2
        );
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

// ===== 顏色選取 =====

function updateColorPreview() {
    const color = elements.targetColor.value;
    elements.colorPreview.style.backgroundColor = color;
}

function toggleColorPicker() {
    isPickingColor = !isPickingColor;
    elements.pickColorBtn.classList.toggle('active', isPickingColor);
    elements.originalCanvas.style.cursor = isPickingColor ? 'crosshair' : 'default';

    if (isPickingColor) {
        elements.pickColorBtn.textContent = '點擊圖片選取';
    } else {
        elements.pickColorBtn.textContent = '從圖片選取';
    }
}

function handleCanvasClick(e) {
    if (!isPickingColor || !originalImageData) return;

    const rect = elements.originalCanvas.getBoundingClientRect();
    const scaleX = elements.originalCanvas.width / rect.width;
    const scaleY = elements.originalCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const index = (y * originalImageData.width + x) * 4;
    const r = originalImageData.data[index];
    const g = originalImageData.data[index + 1];
    const b = originalImageData.data[index + 2];

    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    elements.targetColor.value = hex;
    updateColorPreview();

    toggleColorPicker();
}

function updateSliderDisplay() {
    document.getElementById('hue-tolerance-value').textContent = elements.hueTolerance.value;
    document.getElementById('sat-tolerance-value').textContent = elements.satTolerance.value;
    document.getElementById('lum-tolerance-value').textContent = elements.lumTolerance.value;
    document.getElementById('hue-shift-value').textContent = elements.hueShift.value;
    document.getElementById('sat-adjust-value').textContent = elements.satAdjust.value;
    document.getElementById('lum-adjust-value').textContent = elements.lumAdjust.value;
}

// ===== 處理與輸出 =====

function applyAdjustment() {
    if (!originalImageData || isProcessing) return;

    isProcessing = true;
    updateUIState();
    hideError();

    // 解析目標顏色
    const hex = elements.targetColor.value;
    const targetColor = {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };

    // 容差設定
    const tolerance = {
        hue: parseFloat(elements.hueTolerance.value),
        sat: parseFloat(elements.satTolerance.value),
        lum: parseFloat(elements.lumTolerance.value)
    };

    // 調整參數
    const adjustment = {
        hueShift: parseFloat(elements.hueShift.value),
        satAdjust: parseFloat(elements.satAdjust.value),
        lumAdjust: parseFloat(elements.lumAdjust.value)
    };

    worker.postMessage({
        type: 'PROCESS',
        payload: {
            imageData: {
                data: new Uint8ClampedArray(originalImageData.data),
                width: originalImageData.width,
                height: originalImageData.height
            },
            targetColor: targetColor,
            tolerance: tolerance,
            adjustment: adjustment,
            invertSelection: elements.invertSelection.checked,
            showMask: elements.showMask.checked
        }
    });
}

function displayResult(result) {
    const { imageData, duration, pixelCount, matchedPixels, matchPercentage } = result;

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
            <span class="stat-label">總像素數：</span>
            <span class="stat-value">${pixelCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">匹配像素：</span>
            <span class="stat-value">${matchedPixels.toLocaleString()} (${matchPercentage}%)</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">圖片尺寸：</span>
            <span class="stat-value">${imageData.width} × ${imageData.height}</span>
        </div>
    `;

    elements.downloadBtn.disabled = false;
    updateProgress(100, '處理完成');
}

function resetParameters() {
    elements.hueTolerance.value = 30;
    elements.satTolerance.value = 50;
    elements.lumTolerance.value = 50;
    elements.hueShift.value = 0;
    elements.satAdjust.value = 0;
    elements.lumAdjust.value = 0;
    elements.invertSelection.checked = false;
    elements.showMask.checked = false;
    updateSliderDisplay();
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'selective-color.png';
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
