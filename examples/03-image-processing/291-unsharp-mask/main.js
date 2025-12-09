/**
 * USM 銳化 - 主執行緒腳本
 */

let worker = null;
let originalImageData = null;

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    amountInput: null,
    amountValue: null,
    radiusInput: null,
    radiusValue: null,
    thresholdInput: null,
    thresholdValue: null,
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
    elements.amountInput = document.getElementById('amount-input');
    elements.amountValue = document.getElementById('amount-value');
    elements.radiusInput = document.getElementById('radius-input');
    elements.radiusValue = document.getElementById('radius-value');
    elements.thresholdInput = document.getElementById('threshold-input');
    elements.thresholdValue = document.getElementById('threshold-value');
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

    elements.amountInput.addEventListener('input', updateParameterDisplay);
    elements.radiusInput.addEventListener('input', updateParameterDisplay);
    elements.thresholdInput.addEventListener('input', updateParameterDisplay);

    elements.applyBtn.addEventListener('click', applyUSM);
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
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 繪製一些略微模糊的圖形來展示銳化效果
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#e0eafc');
    gradient.addColorStop(1, '#cfdef3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);

    // 文字
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 40px Georgia';
    ctx.textAlign = 'center';
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 4;
    ctx.fillText('Unsharp Mask', 200, 100);

    // 細節圖案
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#34495e';
    ctx.beginPath();
    for(let i=0; i<10; i++) {
        ctx.arc(200, 200, 10 + i * 10, 0, Math.PI * 2);
    }
    ctx.stroke();

    // 稍微模糊整個畫布以模擬失焦
    // 這裡我們簡單地在 Canvas 上繪製一個半透明層或使用 filter
    // 但為了確保原始數據是像素級的，我們就直接使用這個作為"原圖"
    // USM 即使對清晰的圖像也能增強對比度

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
    elements.amountValue.textContent = elements.amountInput.value;
    elements.radiusValue.textContent = elements.radiusInput.value;
    elements.thresholdValue.textContent = elements.thresholdInput.value;
}

function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applyBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

function applyUSM() {
    if (!originalImageData) return;

    const amount = parseInt(elements.amountInput.value);
    const radius = parseFloat(elements.radiusInput.value);
    const threshold = parseInt(elements.thresholdInput.value);

    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'APPLY_USM',
        payload: {
            imageData: imageData,
            amount: amount,
            radius: radius,
            threshold: threshold
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
    link.download = 'usm-sharpened.png';
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
        <div class="stat-item"><span class="stat-label">參數：</span><span class="stat-value">A:${result.amount}%, R:${result.radius}, T:${result.threshold}</span></div>
    `;
}
