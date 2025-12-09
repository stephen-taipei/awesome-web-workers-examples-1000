/**
 * 浮雕效果 - 主執行緒腳本
 */

let worker = null;
let originalImageData = null;
let currentDirection = 'top-left';

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    directionBtns: null,
    strengthInput: null,
    strengthValue: null,
    grayCheckbox: null,
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

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.directionBtns = document.querySelectorAll('[data-direction]');
    elements.strengthInput = document.getElementById('strength-input');
    elements.strengthValue = document.getElementById('strength-value');
    elements.grayCheckbox = document.getElementById('gray-checkbox');
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
    elements.uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); elements.uploadArea.classList.add('dragover'); });
    elements.uploadArea.addEventListener('dragleave', () => elements.uploadArea.classList.remove('dragover'));
    elements.uploadArea.addEventListener('drop', handleFileDrop);
    elements.loadDemoBtn.addEventListener('click', loadDemoImage);

    elements.directionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.directionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDirection = btn.dataset.direction;
        });
    });

    elements.strengthInput.addEventListener('input', () => {
        elements.strengthValue.textContent = elements.strengthInput.value;
    });

    elements.applyBtn.addEventListener('click', applyFilter);
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
        img.onload = function() { displayImage(img); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 背景
    const grad = ctx.createLinearGradient(0,0,400,300);
    grad.addColorStop(0, '#888');
    grad.addColorStop(1, '#ccc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 300);

    // 浮雕文字
    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('EMBOSS', 40, 180);

    // 一些圖形
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(320, 80, 50, 0, Math.PI*2);
    ctx.fill();

    const img = new Image();
    img.onload = function() { displayImage(img); };
    img.src = canvas.toDataURL();
}

function displayImage(img) {
    const maxWidth = 500;
    const maxHeight = 400;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) { height = height * (maxWidth / width); width = maxWidth; }
    if (height > maxHeight) { width = width * (maxHeight / height); height = maxHeight; }

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

function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applyBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

function applyFilter() {
    if (!originalImageData) return;
    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'APPLY_EMBOSS',
        payload: {
            imageData,
            direction: currentDirection,
            strength: parseInt(elements.strengthInput.value),
            grayscale: elements.grayCheckbox.checked
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
    link.download = 'emboss-result.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

function handleWorkerMessage(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'PROGRESS': updateProgress(payload.percent, payload.message); break;
        case 'RESULT': displayResult(payload); elements.applyBtn.disabled = false; break;
        case 'ERROR': alert(payload.message); elements.applyBtn.disabled = false; break;
    }
}

function handleWorkerError(error) {
    console.error('Worker error:', error);
    alert(`Worker error: ${error.message}`);
    elements.applyBtn.disabled = false;
    if (worker) worker.terminate();
    initializeWorker();
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
        <div class="stat-item"><span class="stat-label">光源方向：</span><span class="stat-value">${result.direction}</span></div>
        <div class="stat-item"><span class="stat-label">強度：</span><span class="stat-value">${result.strength}</span></div>
    `;
}
