<<<<<<< HEAD
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const distanceInput = document.getElementById('distance');
const distanceValue = document.getElementById('distanceValue');
const angleInput = document.getElementById('angle');
const angleValue = document.getElementById('angleValue');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');
let originalImage = null;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
distanceInput.addEventListener('input', () => distanceValue.textContent = distanceInput.value);
angleInput.addEventListener('input', () => angleValue.textContent = angleInput.value);
processBtn.addEventListener('click', processImage);

worker.onmessage = (e) => {
    if (e.data.type === 'result') {
        resultCtx.putImageData(e.data.imageData, 0, 0);
        processBtn.disabled = false;
    }
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            let w = img.width, h = img.height;
            if (w > 500) { h = h * 500 / w; w = 500; }
            originalCanvas.width = resultCanvas.width = w;
            originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            processBtn.disabled = false;
=======
/**
 * 運動模糊 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與參數設定
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;

// ===== DOM 元素 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    angleInput: null,
    angleValue: null,
    distanceInput: null,
    distanceValue: null,
    kernelSize: null,
    presetBtns: null,
    kernelPreview: null,
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,
    progressBar: null,
    progressText: null,
    previewSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateKernelPreview();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.angleInput = document.getElementById('angle-input');
    elements.angleValue = document.getElementById('angle-value');
    elements.distanceInput = document.getElementById('distance-input');
    elements.distanceValue = document.getElementById('distance-value');
    elements.kernelSize = document.getElementById('kernel-size');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.kernelPreview = document.getElementById('kernel-preview');
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

function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });
    elements.uploadArea.addEventListener('dragleave', () => elements.uploadArea.classList.remove('dragover'));
    elements.uploadArea.addEventListener('drop', handleFileDrop);
    elements.loadDemoBtn.addEventListener('click', loadDemoImage);

    elements.angleInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.distanceInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.angleInput.value = btn.dataset.angle;
            elements.distanceInput.value = btn.dataset.distance;
            updateParameterDisplay();
            updateKernelPreview();
        });
    });

    elements.applyBtn.addEventListener('click', applyBlur);
    elements.resetBtn.addEventListener('click', resetToOriginal);
    elements.downloadBtn.addEventListener('click', downloadResult);
}

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

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) loadImage(file);
}

function handleFileDrop(event) {
    event.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            displayImage(img);
>>>>>>> origin/main
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

<<<<<<< HEAD
function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, w, h);
    worker.postMessage({
        imageData,
        distance: parseInt(distanceInput.value),
        angle: parseInt(angleInput.value)
    });
}
=======
function loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 繪製一個適合展示運動模糊的場景 (賽車跑道風格)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#34495e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 跑道線
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 10;
    ctx.setLineDash([30, 30]);
    ctx.beginPath();
    ctx.moveTo(0, 150);
    ctx.lineTo(400, 150);
    ctx.stroke();
    ctx.setLineDash([]);

    // 快速移動的物體 (紅色方塊)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(150, 100, 100, 50);

    // 文字
    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPEED', 200, 250);

    const img = new Image();
    img.onload = function() {
        displayImage(img);
    };
    img.src = canvas.toDataURL();
}

function displayImage(img) {
    const maxWidth = 600;
    const maxHeight = 500;
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

function updateParameterDisplay() {
    elements.angleValue.textContent = elements.angleInput.value;
    elements.distanceValue.textContent = elements.distanceInput.value;
}

function updateKernelPreview() {
    const angle = parseInt(elements.angleInput.value);
    const distance = parseInt(elements.distanceInput.value);

    worker.postMessage({
        type: 'GENERATE_KERNEL',
        payload: { angle, distance }
    });
}

function displayKernelPreview(data) {
    const { kernel, kernelSize } = data;
    elements.kernelSize.textContent = `${kernelSize}×${kernelSize}`;

    // 視覺化展示
    const maxDisplay = Math.min(kernelSize, 15);
    const step = Math.ceil(kernelSize / maxDisplay);
    let html = `<div class="kernel-grid" style="grid-template-columns: repeat(${maxDisplay}, 1fr);">`;

    // 歸一化以便顯示顏色
    let maxVal = 0;
    for(let v of kernel) if(v > maxVal) maxVal = v;
    if(maxVal === 0) maxVal = 1;

    for (let y = 0; y < kernelSize; y += step) {
        for (let x = 0; x < kernelSize; x += step) {
            const idx = y * kernelSize + x;
            const val = kernel[idx];
            const alpha = val / maxVal;
            const bg = `rgba(16, 185, 129, ${alpha})`;
            html += `<span style="background:${bg}; width: 10px; height: 10px; padding:0;"></span>`;
        }
    }
    html += '</div>';
    elements.kernelPreview.innerHTML = html;
}

function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applyBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

// ===== 模糊處理 =====

function applyBlur() {
    if (!originalImageData) return;

    const angle = parseInt(elements.angleInput.value);
    const distance = parseInt(elements.distanceInput.value);

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
            angle: angle,
            distance: distance
        }
    }, [imageData.data.buffer]);
}

function resetToOriginal() {
    if (!originalImageData) return;
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(originalImageData, 0, 0);
    elements.resultStats.innerHTML = '';
    updateProgress(0, '已還原原圖');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'motion-blurred.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
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

function handleWorkerError(error) {
    console.error('Worker 錯誤:', error);
    elements.applyBtn.disabled = false;
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function displayResult(result) {
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(result.imageData, 0, 0);

    elements.resultStats.innerHTML = `
        <div class="stat-item"><span class="stat-label">處理時間：</span><span class="stat-value">${result.duration.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">角度 / 距離：</span><span class="stat-value">${result.angle}° / ${result.distance}px</span></div>
        <div class="stat-item"><span class="stat-label">核心大小：</span><span class="stat-value">${result.kernelSize}×${result.kernelSize}</span></div>
    `;
}
>>>>>>> origin/main
