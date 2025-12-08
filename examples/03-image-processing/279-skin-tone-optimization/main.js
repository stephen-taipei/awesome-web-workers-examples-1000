/**
 * 膚色優化 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與結果顯示
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 全域變數 =====
let worker = null;
let isProcessing = false;
let originalImageData = null;

// ===== DOM 元素參考 =====
const elements = {
    uploadArea: null,
    fileInput: null,
    modeInputs: null,
    strengthSlider: null,
    strengthValue: null,
    workerBtn: null,
    mainThreadBtn: null,
    resetBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    originalCanvas: null,
    resultCanvas: null,
    downloadBtn: null,
    errorMessage: null,
    comparisonSection: null,
    workerTime: null,
    mainThreadTime: null,
    speedup: null
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateUIState(false);
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.modeInputs = document.querySelectorAll('input[name="mode"]');
    elements.strengthSlider = document.getElementById('strength');
    elements.strengthValue = document.getElementById('strength-value');
    elements.workerBtn = document.getElementById('worker-btn');
    elements.mainThreadBtn = document.getElementById('main-thread-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.workerTime = document.getElementById('worker-time');
    elements.mainThreadTime = document.getElementById('main-thread-time');
    elements.speedup = document.getElementById('speedup');
}

function setupEventListeners() {
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    elements.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    elements.strengthSlider.addEventListener('input', (e) => {
        elements.strengthValue.textContent = `${e.target.value}%`;
    });

    elements.workerBtn.addEventListener('click', startWorkerProcessing);
    elements.mainThreadBtn.addEventListener('click', startMainThreadProcessing);
    elements.resetBtn.addEventListener('click', resetImage);
    elements.downloadBtn.addEventListener('click', downloadResult);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.workerBtn.disabled = true;
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

function getSelectedMode() {
    for (const input of elements.modeInputs) {
        if (input.checked) {
            return input.value;
        }
    }
    return 'natural';
}

// ===== 圖片處理 =====
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            elements.originalCanvas.width = img.width;
            elements.originalCanvas.height = img.height;
            elements.resultCanvas.width = img.width;
            elements.resultCanvas.height = img.height;

            const ctx = elements.originalCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            originalImageData = ctx.getImageData(0, 0, img.width, img.height);

            elements.workerBtn.disabled = false;
            elements.mainThreadBtn.disabled = false;
            elements.resetBtn.disabled = false;

            elements.uploadArea.innerHTML = `
                <div class="upload-preview">
                    <img src="${e.target.result}" alt="Preview">
                    <p>${img.width} x ${img.height} px</p>
                </div>
            `;

            hideError();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ===== Worker 通訊 =====
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload.imageData, payload.stats, payload.duration, 'worker');
            isProcessing = false;
            updateUIState(false);
            break;

        case 'ERROR':
            showError(payload.message);
            isProcessing = false;
            updateUIState(false);
            break;
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    isProcessing = false;
    updateUIState(false);

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 處理控制 =====
function startWorkerProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const mode = getSelectedMode();
    const strength = parseInt(elements.strengthSlider.value) / 100;

    isProcessing = true;
    updateUIState(true);
    hideError();

    const imageDataCopy = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    worker.postMessage({
        type: 'START',
        payload: {
            imageData: imageDataCopy,
            mode: mode,
            strength: strength
        }
    }, [imageDataCopy.data.buffer]);
}

function startMainThreadProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const mode = getSelectedMode();
    const strength = parseInt(elements.strengthSlider.value) / 100;

    isProcessing = true;
    updateUIState(true);
    hideError();
    updateProgress(0, '主執行緒處理中...');

    setTimeout(() => {
        const startTime = performance.now();

        const result = skinToneOptimizationMainThread(originalImageData, mode, strength);

        const duration = performance.now() - startTime;

        displayResult(result.imageData, result.stats, duration, 'main');
        isProcessing = false;
        updateUIState(false);
    }, 50);
}

function resetImage() {
    if (originalImageData) {
        const ctx = elements.resultCanvas.getContext('2d');
        ctx.putImageData(originalImageData, 0, 0);
    }
    updateProgress(0, '已重置');
}

// ===== 主執行緒演算法 =====
function skinToneOptimizationMainThread(imageData, mode, strength) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;

    let skinPixelCount = 0;

    // 處理每個像素
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 膚色檢測
        const isSkin = detectSkinPixel(r, g, b);

        if (isSkin) {
            skinPixelCount++;

            // 根據模式應用不同的優化
            const optimized = optimizeSkinPixel(r, g, b, mode, strength);

            data[i] = optimized.r;
            data[i + 1] = optimized.g;
            data[i + 2] = optimized.b;
        }
    }

    const skinPercentage = (skinPixelCount / pixelCount * 100).toFixed(1);

    return {
        imageData: new ImageData(data, width, height),
        stats: {
            mode: mode,
            strength: strength,
            skinPixelCount: skinPixelCount,
            skinPercentage: skinPercentage
        }
    };
}

function detectSkinPixel(r, g, b) {
    // 方法 1: YCbCr 色彩空間
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    const ycbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

    // 方法 2: RGB 規則
    const rgbSkin = (r > 95) && (g > 40) && (b > 20) &&
                    (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
                    (Math.abs(r - g) > 15) && (r > g) && (r > b);

    // 方法 3: HSV 色彩空間
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;

    const hsvSkin = (h >= 0 && h <= 50) && (s >= 0.2 && s <= 0.68) && (v >= 0.35);

    // 綜合判斷：至少需要兩種方法判定為膚色
    const methods = [ycbcrSkin, rgbSkin, hsvSkin];
    const trueCount = methods.filter(m => m).length;

    return trueCount >= 2;
}

function optimizeSkinPixel(r, g, b, mode, strength) {
    let newR = r, newG = g, newB = b;

    switch (mode) {
        case 'natural':
            // 自然增強：輕微提亮，保持膚色均勻
            const brightness = 1 + 0.1 * strength;
            newR = Math.min(255, r * brightness);
            newG = Math.min(255, g * brightness);
            newB = Math.min(255, b * brightness);

            // 稍微減少綠色偏移
            newG = newG - 3 * strength;
            break;

        case 'warm':
            // 溫暖光澤：增添紅潤感
            newR = Math.min(255, r + 15 * strength);
            newG = Math.min(255, g + 5 * strength);
            newB = Math.max(0, b - 5 * strength);
            break;

        case 'smooth':
            // 柔膚美顏：柔化過渡
            const avg = (r + g + b) / 3;
            const blend = 0.3 * strength;
            newR = r + (avg - r) * blend + 5 * strength;
            newG = g + (avg - g) * blend;
            newB = b + (avg - b) * blend;
            break;
    }

    return {
        r: Math.round(Math.max(0, Math.min(255, newR))),
        g: Math.round(Math.max(0, Math.min(255, newG))),
        b: Math.round(Math.max(0, Math.min(255, newB)))
    };
}

// ===== UI 更新 =====
function updateUIState(processing) {
    elements.workerBtn.disabled = processing || !originalImageData;
    elements.mainThreadBtn.disabled = processing || !originalImageData;
    elements.resetBtn.disabled = processing || !originalImageData;
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function displayResult(imageData, stats, duration, source) {
    updateProgress(100, '處理完成');

    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    const modeNames = {
        'natural': '自然增強',
        'warm': '溫暖光澤',
        'smooth': '柔膚美顏'
    };

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理耗時：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">優化模式：</span>
            <span class="stat-value">${modeNames[stats.mode]}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">膚色像素數：</span>
            <span class="stat-value">${stats.skinPixelCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">膚色佔比：</span>
            <span class="stat-value">${stats.skinPercentage}%</span>
        </div>
    `;

    elements.resultSection.classList.remove('hidden');
    updatePerformanceComparison(duration, source);
}

function updatePerformanceComparison(duration, source) {
    if (source === 'worker') {
        elements.workerTime.textContent = `${duration.toFixed(2)} ms`;
    } else {
        elements.mainThreadTime.textContent = `${duration.toFixed(2)} ms`;
    }

    const workerTime = parseFloat(elements.workerTime.textContent);
    const mainTime = parseFloat(elements.mainThreadTime.textContent);

    if (!isNaN(workerTime) && !isNaN(mainTime) && workerTime > 0) {
        const ratio = mainTime / workerTime;
        elements.speedup.textContent = ratio > 1
            ? `Worker 快 ${ratio.toFixed(2)}x，且不阻塞 UI`
            : `效能相近，但 Worker 不阻塞 UI`;
    }

    elements.comparisonSection.classList.remove('hidden');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'skin-tone-optimized.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
