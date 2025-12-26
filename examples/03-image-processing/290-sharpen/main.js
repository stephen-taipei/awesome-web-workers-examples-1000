/**
 * 銳化 - 主執行緒腳本
 */

let worker = null;
let originalImageData = null;

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    strengthInput: null,
    strengthValue: null,
    kernelPreview: null,
    kernelSize: null,
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
    updateKernelPreview();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.strengthInput = document.getElementById('strength-input');
    elements.strengthValue = document.getElementById('strength-value');
    elements.kernelPreview = document.getElementById('kernel-preview');
    elements.kernelSize = document.getElementById('kernel-size');
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

    elements.strengthInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.applyBtn.addEventListener('click', applySharpen);
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

    // 模糊的背景
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#bdc3c7');
    gradient.addColorStop(1, '#2c3e50');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);

    // 繪製一些線條和文字，這是觀察銳化效果最好的方式
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0; i<400; i+=20) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 300);
    }
    ctx.stroke();

    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText('SHARPEN', 200, 150);

    // 故意做一點模糊處理，讓銳化效果更明顯
    // 這裡我們直接用 filter (如果在瀏覽器中生成)
    // 或者簡單地繪製一些邊緣柔和的圖形

    // 使用 shadow 來模擬模糊邊緣
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(100, 200, 200, 50);
    ctx.shadowBlur = 0;

    // 繪製細節紋理
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    for(let i=0; i<1000; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 300;
        ctx.fillRect(x, y, 2, 2);
    }

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
    const val = parseInt(elements.strengthInput.value);
    elements.strengthValue.textContent = (val / 10).toFixed(1);
}

function updateKernelPreview() {
    const strength = parseInt(elements.strengthInput.value) / 10;
    worker.postMessage({
        type: 'GENERATE_KERNEL',
        payload: { strength }
    });
}

function displayKernelPreview(data) {
    const { kernel, kernelSize } = data;
    elements.kernelSize.textContent = `${kernelSize}×${kernelSize}`;

    const maxDisplay = 3;
    let html = `<div class="kernel-grid" style="grid-template-columns: repeat(${maxDisplay}, 1fr);">`;

    // 顯示數值
    for (let i = 0; i < kernel.length; i++) {
        const val = kernel[i];
        // 根據正負值給顏色
        const color = val >= 0 ? 'var(--text-primary)' : '#ff6b6b';
        const bg = val > 0 ? 'rgba(16, 185, 129, 0.2)' : (val < 0 ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)');

        html += `<span style="background:${bg}; color:${color}; padding: 8px;">${val.toFixed(1)}</span>`;
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

function applySharpen() {
    if (!originalImageData) return;

    const strength = parseInt(elements.strengthInput.value) / 10;

    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'APPLY_SHARPEN',
        payload: {
            imageData: imageData,
            strength: strength
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
    link.download = 'sharpened-image.png';
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
        <div class="stat-item"><span class="stat-label">強度：</span><span class="stat-value">${result.strength}</span></div>
    `;
}
