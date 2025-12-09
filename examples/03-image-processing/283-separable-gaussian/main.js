/**
 * 可分離高斯模糊 - 主執行緒腳本
 *
 * 功能：管理 Web Worker，比較可分離與標準高斯模糊的效能差異
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;
let comparisonData = {
    separable: null,
    regular: null
};

// ===== DOM 元素參考 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,
    radiusInput: null,
    radiusValue: null,
    sigmaInput: null,
    sigmaValue: null,
    kernelSize: null,
    speedupRatio: null,
    presetBtns: null,
    kernelCanvas: null,
    kernelValues: null,
    applySeparableBtn: null,
    applyRegularBtn: null,
    resetBtn: null,
    downloadBtn: null,
    progressBar: null,
    progressText: null,
    previewSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null,
    comparisonSection: null,
    comparisonResults: null
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
    elements.radiusInput = document.getElementById('radius-input');
    elements.radiusValue = document.getElementById('radius-value');
    elements.sigmaInput = document.getElementById('sigma-input');
    elements.sigmaValue = document.getElementById('sigma-value');
    elements.kernelSize = document.getElementById('kernel-size');
    elements.speedupRatio = document.getElementById('speedup-ratio');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
    elements.kernelCanvas = document.getElementById('kernel-canvas');
    elements.kernelValues = document.getElementById('kernel-values');
    elements.applySeparableBtn = document.getElementById('apply-separable-btn');
    elements.applyRegularBtn = document.getElementById('apply-regular-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.previewSection = document.getElementById('preview-section');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.resultStats = document.getElementById('result-stats');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.comparisonResults = document.getElementById('comparison-results');
}

function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);

    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });
    elements.uploadArea.addEventListener('drop', handleFileDrop);

    elements.loadDemoBtn.addEventListener('click', loadDemoImage);

    elements.radiusInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.sigmaInput.addEventListener('input', () => {
        updateParameterDisplay();
        updateKernelPreview();
    });

    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.radiusInput.value = btn.dataset.radius;
            elements.sigmaInput.value = btn.dataset.sigma;
            updateParameterDisplay();
            updateKernelPreview();
        });
    });

    elements.applySeparableBtn.addEventListener('click', () => applyBlur('separable'));
    elements.applyRegularBtn.addEventListener('click', () => applyBlur('regular'));
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
        img.onload = function() { displayImage(img); };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadDemoImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 350;
    const ctx = canvas.getContext('2d');

    // 漸層背景
    const gradient = ctx.createRadialGradient(250, 175, 0, 250, 175, 250);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 繪製同心圓（用於觀察模糊效果）
    for (let r = 200; r > 0; r -= 20) {
        ctx.strokeStyle = `hsl(${r}, 70%, 60%)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(250, 175, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 銳利的線條
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(250, 175);
        ctx.lineTo(250 + Math.cos(angle) * 150, 175 + Math.sin(angle) * 150);
        ctx.stroke();
    }

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Separable Gaussian Test', 250, 320);

    const img = new Image();
    img.onload = function() { displayImage(img); };
    img.src = canvas.toDataURL();
}

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

    // 重置比較數據
    comparisonData = { separable: null, regular: null };
    elements.comparisonSection.style.display = 'none';
}

// ===== 參數控制 =====

function updateParameterDisplay() {
    const radius = parseInt(elements.radiusInput.value);
    const sigma = parseFloat(elements.sigmaInput.value);
    const kernelSize = 2 * radius + 1;
    const speedup = (kernelSize * kernelSize) / (2 * kernelSize);

    elements.radiusValue.textContent = radius;
    elements.sigmaValue.textContent = sigma.toFixed(1);
    elements.kernelSize.textContent = kernelSize;
    elements.speedupRatio.textContent = speedup.toFixed(1);
}

function updateKernelPreview() {
    const radius = parseInt(elements.radiusInput.value);
    const sigma = parseFloat(elements.sigmaInput.value);

    worker.postMessage({
        type: 'GENERATE_KERNEL',
        payload: { radius, sigma }
    });
}

function displayKernelPreview(data) {
    const { kernel, kernelSize } = data;
    const canvas = elements.kernelCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 清除畫布
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, width, height);

    // 找出最大值
    const maxVal = Math.max(...kernel);

    // 繪製核心曲線
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const barWidth = width / kernelSize;
    for (let i = 0; i < kernelSize; i++) {
        const x = i * barWidth + barWidth / 2;
        const y = height - (kernel[i] / maxVal) * (height - 20) - 10;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();

    // 繪製點
    ctx.fillStyle = '#f97316';
    for (let i = 0; i < kernelSize; i++) {
        const x = i * barWidth + barWidth / 2;
        const y = height - (kernel[i] / maxVal) * (height - 20) - 10;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 顯示核心值（只顯示部分）
    const displayCount = Math.min(kernelSize, 11);
    const step = Math.ceil(kernelSize / displayCount);
    let valuesHtml = '<div class="kernel-value-items">';
    for (let i = 0; i < kernelSize; i += step) {
        valuesHtml += `<span>${kernel[i].toFixed(4)}</span>`;
    }
    valuesHtml += '</div>';
    elements.kernelValues.innerHTML = valuesHtml;
}

function updateButtonStates() {
    const hasImage = originalImageData !== null;
    elements.applySeparableBtn.disabled = !hasImage;
    elements.applyRegularBtn.disabled = !hasImage;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

// ===== 模糊處理 =====

function applyBlur(method) {
    if (!originalImageData) return;

    const radius = parseInt(elements.radiusInput.value);
    const sigma = parseFloat(elements.sigmaInput.value);

    elements.applySeparableBtn.disabled = true;
    elements.applyRegularBtn.disabled = true;
    updateProgress(0, '準備處理...');

    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    const messageType = method === 'separable' ? 'APPLY_SEPARABLE_BLUR' : 'APPLY_REGULAR_BLUR';

    worker.postMessage({
        type: messageType,
        payload: { imageData, radius, sigma }
    }, [imageData.data.buffer]);
}

function resetToOriginal() {
    if (!originalImageData) return;
    elements.resultCanvas.getContext('2d').putImageData(originalImageData, 0, 0);
    elements.resultStats.innerHTML = '';
    updateProgress(0, '已還原原圖');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'separable-gaussian-blur.png';
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
            elements.applySeparableBtn.disabled = false;
            elements.applyRegularBtn.disabled = false;
            break;

        case 'KERNEL':
            displayKernelPreview(payload);
            break;

        case 'ERROR':
            alert(payload.message);
            elements.applySeparableBtn.disabled = false;
            elements.applyRegularBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    console.error('Worker 錯誤:', error);
    alert(`Worker 錯誤: ${error.message}`);
    elements.applySeparableBtn.disabled = false;
    elements.applyRegularBtn.disabled = false;

    if (worker) worker.terminate();
    initializeWorker();
}

// ===== UI 更新 =====

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function displayResult(result) {
    elements.resultCanvas.getContext('2d').putImageData(result.imageData, 0, 0);

    // 儲存比較數據
    comparisonData[result.method] = result;

    const methodName = result.method === 'separable' ? '可分離高斯模糊' : '標準高斯模糊';
    const pixelCount = result.imageData.width * result.imageData.height;
    const kernelOps = result.method === 'separable'
        ? 2 * result.kernelSize
        : result.kernelSize * result.kernelSize;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">方法：</span>
            <span class="stat-value">${methodName}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">半徑 / Sigma：</span>
            <span class="stat-value">${result.radius}px / σ=${result.sigma}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">每像素運算：</span>
            <span class="stat-value">${kernelOps} 次</span>
        </div>
    `;

    // 顯示比較結果
    if (comparisonData.separable && comparisonData.regular) {
        displayComparison();
    }
}

function displayComparison() {
    const sep = comparisonData.separable;
    const reg = comparisonData.regular;
    const speedup = (reg.duration / sep.duration).toFixed(2);
    const sepOps = 2 * sep.kernelSize;
    const regOps = sep.kernelSize * sep.kernelSize;
    const theoreticalSpeedup = (regOps / sepOps).toFixed(2);

    elements.comparisonSection.style.display = 'block';
    elements.comparisonResults.innerHTML = `
        <div class="comparison-grid">
            <div class="comparison-item">
                <h4>可分離高斯模糊</h4>
                <div class="comparison-time">${sep.duration.toFixed(2)} ms</div>
                <div class="comparison-ops">每像素 ${sepOps} 次運算</div>
            </div>
            <div class="comparison-item">
                <h4>標準高斯模糊</h4>
                <div class="comparison-time">${reg.duration.toFixed(2)} ms</div>
                <div class="comparison-ops">每像素 ${regOps} 次運算</div>
            </div>
        </div>
        <div class="comparison-summary">
            <div class="speedup-badge">
                <span class="speedup-value">${speedup}x</span>
                <span class="speedup-label">實際加速</span>
            </div>
            <div class="theoretical-badge">
                <span class="theoretical-value">${theoreticalSpeedup}x</span>
                <span class="theoretical-label">理論加速</span>
            </div>
        </div>
        <p class="comparison-note">
            在半徑 ${sep.radius} 像素時，可分離濾波器顯著減少了計算量，
            從 ${regOps} 次降低到 ${sepOps} 次每像素運算。
        </p>
    `;
}
