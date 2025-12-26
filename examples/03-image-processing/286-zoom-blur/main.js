<<<<<<< HEAD
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const strengthInput = document.getElementById('strength');
const strengthValue = document.getElementById('strengthValue');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
strengthInput.addEventListener('input', () => strengthValue.textContent = strengthInput.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => { resultCtx.putImageData(e.data.imageData, 0, 0); processBtn.disabled = false; };

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            originalCanvas.width = resultCanvas.width = w;
            originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            processBtn.disabled = false;
=======
/**
 * 縮放模糊 - 主執行緒腳本
 */

let worker = null;
let originalImageData = null;

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    cxInput: null,
    cxValue: null,
    cyInput: null,
    cyValue: null,
    strengthInput: null,
    strengthValue: null,
    samplesInput: null,
    samplesValue: null,
    presetBtns: null,
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,
    progressBar: null,
    progressText: null,
    previewSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null,
    centerIndicator: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.cxInput = document.getElementById('cx-input');
    elements.cxValue = document.getElementById('cx-value');
    elements.cyInput = document.getElementById('cy-input');
    elements.cyValue = document.getElementById('cy-value');
    elements.strengthInput = document.getElementById('strength-input');
    elements.strengthValue = document.getElementById('strength-value');
    elements.samplesInput = document.getElementById('samples-input');
    elements.samplesValue = document.getElementById('samples-value');
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
    elements.centerIndicator = document.getElementById('center-indicator');
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

    elements.cxInput.addEventListener('input', updateParameterDisplay);
    elements.cyInput.addEventListener('input', updateParameterDisplay);
    elements.strengthInput.addEventListener('input', updateParameterDisplay);
    elements.samplesInput.addEventListener('input', updateParameterDisplay);

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.cxInput.value = btn.dataset.cx;
            elements.cyInput.value = btn.dataset.cy;
            elements.strengthInput.value = btn.dataset.str;
            updateParameterDisplay();
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
    worker.postMessage({ imageData: originalCtx.getImageData(0, 0, w, h), strength: parseInt(strengthInput.value) });
=======
function loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // 繪製放射狀線條背景
    const cx = 200;
    const cy = 200;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 280);
    gradient.addColorStop(0, '#f39c12');
    gradient.addColorStop(0.5, '#e74c3c');
    gradient.addColorStop(1, '#8e44ad');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);

    // 一些隨機圓形
    for(let i=0; i<20; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 400;
        const r = Math.random() * 20 + 5;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
    }

    // 中心文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px Impact';
    ctx.textAlign = 'center';
    ctx.fillText('ZOOM!', cx, cy + 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText('ZOOM!', cx, cy + 20);

    const img = new Image();
    img.onload = function() {
        displayImage(img);
    };
    img.src = canvas.toDataURL();
}

function displayImage(img) {
    const maxWidth = 500;
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
    updateParameterDisplay();
    updateButtonStates();
}

function updateParameterDisplay() {
    elements.cxValue.textContent = elements.cxInput.value;
    elements.cyValue.textContent = elements.cyInput.value;

    // 強度 0-100 映射到 0.0 - 1.0 (或其他合適範圍)
    // 這裡顯示原始值 / 100
    const strVal = parseInt(elements.strengthInput.value) / 100;
    elements.strengthValue.textContent = strVal.toFixed(2);

    elements.samplesValue.textContent = elements.samplesInput.value;

    const cx = parseInt(elements.cxInput.value);
    const cy = parseInt(elements.cyInput.value);

    if (elements.previewSection.style.display !== 'none') {
        elements.centerIndicator.style.display = 'block';
        elements.centerIndicator.style.left = `${cx}%`;
        elements.centerIndicator.style.top = `${cy}%`;
    }
}

function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applyBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

function applyBlur() {
    if (!originalImageData) return;

    const cx = parseInt(elements.cxInput.value) / 100; // 0.0 - 1.0
    const cy = parseInt(elements.cyInput.value) / 100; // 0.0 - 1.0
    const strength = parseInt(elements.strengthInput.value) / 100; // 0.01 - 1.0
    const samples = parseInt(elements.samplesInput.value);

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
            cx: cx,
            cy: cy,
            strength: strength,
            samples: samples
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
    link.download = 'zoom-blurred.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

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
        <div class="stat-item"><span class="stat-label">中心 (X,Y)：</span><span class="stat-value">${(result.cx*100).toFixed(0)}%, ${(result.cy*100).toFixed(0)}%</span></div>
        <div class="stat-item"><span class="stat-label">強度 / 採樣：</span><span class="stat-value">${result.strength.toFixed(2)} / ${result.samples}</span></div>
    `;
>>>>>>> origin/main
}
