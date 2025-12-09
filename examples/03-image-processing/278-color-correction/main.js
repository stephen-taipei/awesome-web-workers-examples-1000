/**
 * 色彩校正 - 主執行緒腳本
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
    whitePointInputs: null,
    intensitySlider: null,
    intensityValue: null,
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

// ===== 標準白點色溫參考值 =====
const WHITE_POINTS = {
    d65: { r: 0.9505, g: 1.0000, b: 1.0890 }, // 日光 6500K
    d50: { r: 0.9642, g: 1.0000, b: 0.8251 }, // 水平日光 5000K
    tungsten: { r: 1.0985, g: 1.0000, b: 0.3558 } // 鎢絲燈 2856K
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
    elements.whitePointInputs = document.querySelectorAll('input[name="white-point"]');
    elements.intensitySlider = document.getElementById('intensity');
    elements.intensityValue = document.getElementById('intensity-value');
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

    elements.intensitySlider.addEventListener('input', (e) => {
        elements.intensityValue.textContent = `${e.target.value}%`;
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

function getSelectedWhitePoint() {
    for (const input of elements.whitePointInputs) {
        if (input.checked) {
            return input.value;
        }
    }
    return 'auto';
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

    const whitePoint = getSelectedWhitePoint();
    const intensity = parseInt(elements.intensitySlider.value) / 100;

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
            whitePoint: whitePoint,
            intensity: intensity
        }
    }, [imageDataCopy.data.buffer]);
}

function startMainThreadProcessing() {
    if (!originalImageData) {
        showError('請先選擇圖片');
        return;
    }

    const whitePoint = getSelectedWhitePoint();
    const intensity = parseInt(elements.intensitySlider.value) / 100;

    isProcessing = true;
    updateUIState(true);
    hideError();
    updateProgress(0, '主執行緒處理中...');

    setTimeout(() => {
        const startTime = performance.now();

        const result = colorCorrectionMainThread(originalImageData, whitePoint, intensity);

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
function colorCorrectionMainThread(imageData, whitePointType, intensity) {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;

    // 分析圖片找出白點
    let sourceWhitePoint;

    if (whitePointType === 'auto') {
        // 自動偵測：找出最亮的像素區域
        let maxBrightness = 0;
        let brightR = 0, brightG = 0, brightB = 0;
        let brightCount = 0;

        for (let i = 0; i < data.length; i += 4) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (brightness > 240) {
                brightR += data[i];
                brightG += data[i + 1];
                brightB += data[i + 2];
                brightCount++;
            }
            if (brightness > maxBrightness) {
                maxBrightness = brightness;
            }
        }

        if (brightCount > 0) {
            sourceWhitePoint = {
                r: brightR / brightCount / 255,
                g: brightG / brightCount / 255,
                b: brightB / brightCount / 255
            };
        } else {
            // 如果沒有足夠亮的像素，使用平均值
            let sumR = 0, sumG = 0, sumB = 0;
            for (let i = 0; i < data.length; i += 4) {
                sumR += data[i];
                sumG += data[i + 1];
                sumB += data[i + 2];
            }
            sourceWhitePoint = {
                r: sumR / pixelCount / 255,
                g: sumG / pixelCount / 255,
                b: sumB / pixelCount / 255
            };
        }
    } else {
        // 使用預設白點
        sourceWhitePoint = WHITE_POINTS[whitePointType];
    }

    // 目標白點 (純白)
    const targetWhitePoint = { r: 1, g: 1, b: 1 };

    // 計算色彩校正矩陣 (對角矩陣)
    const matrix = {
        r: targetWhitePoint.r / sourceWhitePoint.r,
        g: targetWhitePoint.g / sourceWhitePoint.g,
        b: targetWhitePoint.b / sourceWhitePoint.b
    };

    // 應用強度
    matrix.r = 1 + (matrix.r - 1) * intensity;
    matrix.g = 1 + (matrix.g - 1) * intensity;
    matrix.b = 1 + (matrix.b - 1) * intensity;

    // 應用色彩校正
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, Math.round(data[i] * matrix.r)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * matrix.g)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * matrix.b)));
    }

    return {
        imageData: new ImageData(data, width, height),
        stats: {
            whitePoint: whitePointType,
            sourceWhitePoint: {
                r: (sourceWhitePoint.r * 255).toFixed(0),
                g: (sourceWhitePoint.g * 255).toFixed(0),
                b: (sourceWhitePoint.b * 255).toFixed(0)
            },
            correctionMatrix: {
                r: matrix.r.toFixed(3),
                g: matrix.g.toFixed(3),
                b: matrix.b.toFixed(3)
            },
            intensity: intensity
        }
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

    const whitePointNames = {
        'auto': '自動偵測',
        'd65': 'D65 (6500K)',
        'd50': 'D50 (5000K)',
        'tungsten': '鎢絲燈 (2856K)'
    };

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理耗時：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">白點模式：</span>
            <span class="stat-value">${whitePointNames[stats.whitePoint]}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">檢測白點 RGB：</span>
            <span class="stat-value">${stats.sourceWhitePoint.r}, ${stats.sourceWhitePoint.g}, ${stats.sourceWhitePoint.b}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">校正矩陣：</span>
            <span class="stat-value">${stats.correctionMatrix.r}, ${stats.correctionMatrix.g}, ${stats.correctionMatrix.b}</span>
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
    link.download = 'color-correction-result.png';
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
