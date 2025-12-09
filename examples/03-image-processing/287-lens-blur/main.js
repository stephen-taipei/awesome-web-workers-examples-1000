/**
 * 鏡頭模糊 - 主執行緒腳本
 */

let worker = null;
let originalImageData = null;

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    radiusInput: null,
    radiusValue: null,
    brightnessInput: null,
    brightnessValue: null,
    shapeInput: null,
    presetBtns: null,
    kernelSize: null,
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
    elements.radiusInput = document.getElementById('radius-input');
    elements.radiusValue = document.getElementById('radius-value');
    elements.brightnessInput = document.getElementById('brightness-input');
    elements.brightnessValue = document.getElementById('brightness-value');
    elements.shapeInput = document.getElementById('shape-input');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.kernelSize = document.getElementById('kernel-size');
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

    elements.radiusInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.brightnessInput.addEventListener('input', updateParameterDisplay);

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            elements.shapeInput.value = btn.dataset.shape;
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

    // 夜景散景模擬
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);

    // 隨機亮點
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 300;
        const r = Math.random() * 5 + 2;
        const hue = Math.random() * 60 + 200; // 藍紫色系
        ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // 一些較大的亮點
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 300;
        const r = Math.random() * 10 + 5;
        ctx.fillStyle = `rgba(255, 255, 200, 0.8)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px Serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText('Bokeh', 200, 150);
    ctx.font = '20px Serif';
    ctx.fillText('Simulation', 200, 180);

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
    updateButtonStates();
}

function updateParameterDisplay() {
    elements.radiusValue.textContent = elements.radiusInput.value;
    elements.brightnessValue.textContent = elements.brightnessInput.value;
}

function updateKernelPreview() {
    const radius = parseInt(elements.radiusInput.value);
    const shape = elements.shapeInput.value;

    worker.postMessage({
        type: 'GENERATE_KERNEL',
        payload: { radius, shape }
    });
}

function displayKernelPreview(data) {
    const { kernel, kernelSize } = data;
    elements.kernelSize.textContent = `${kernelSize}×${kernelSize}`;

    // 視覺化展示
    // 鏡頭模糊的核心通常較大，我們只顯示縮略圖或部分
    const maxDisplay = Math.min(kernelSize, 11);
    const step = Math.ceil(kernelSize / maxDisplay);
    let html = `<div class="kernel-grid" style="grid-template-columns: repeat(${maxDisplay}, 1fr); gap: 1px;">`;

    let maxVal = 0;
    for(let v of kernel) if(v > maxVal) maxVal = v;
    if(maxVal === 0) maxVal = 1;

    for (let y = 0; y < kernelSize; y += step) {
        for (let x = 0; x < kernelSize; x += step) {
            const idx = y * kernelSize + x;
            const val = kernel[idx];
            const alpha = val / maxVal;
            // 讓形狀更明顯
            const bg = `rgba(16, 185, 129, ${alpha > 0.01 ? 0.4 + alpha * 0.6 : 0.05})`;
            html += `<span style="background:${bg}; width: 8px; height: 8px; padding:0; border-radius: 50%;"></span>`;
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

function applyBlur() {
    if (!originalImageData) return;

    const radius = parseInt(elements.radiusInput.value);
    const brightness = parseInt(elements.brightnessInput.value);
    const shape = elements.shapeInput.value;

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
            brightness: brightness,
            shape: shape
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
    link.download = 'lens-blurred.png';
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
        <div class="stat-item"><span class="stat-label">半徑 / 亮度：</span><span class="stat-value">${result.radius}px / ${result.brightness}</span></div>
        <div class="stat-item"><span class="stat-label">光圈形狀：</span><span class="stat-value" style="text-transform: capitalize;">${result.shape}</span></div>
    `;
}
