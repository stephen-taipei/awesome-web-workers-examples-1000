/**
 * 曲線調整 - 主執行緒腳本
 *
 * 功能：管理曲線編輯器、圖片處理與 Worker 通訊
 */

// ===== 全域變數 =====

let worker = null;
let originalImageData = null;
let isProcessing = false;

// 曲線控制點 (每個通道獨立)
const curves = {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: null,
    g: null,
    b: null
};

// 當前選擇的通道
let currentChannel = 'rgb';

// 曲線編輯器狀態
let curveCanvas = null;
let curveCtx = null;
let isDragging = false;
let dragPointIndex = -1;

// ===== DOM 元素參考 =====

const elements = {
    uploadArea: null,
    fileInput: null,
    loadSampleBtn: null,
    curveCanvas: null,
    channelBtns: null,
    presetBtns: null,
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
    initializeCurveEditor();
});

function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadSampleBtn = document.getElementById('load-sample-btn');
    elements.curveCanvas = document.getElementById('curve-canvas');
    elements.channelBtns = document.querySelectorAll('.channel-btn');
    elements.presetBtns = document.querySelectorAll('.preset-btn');
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

    curveCanvas = elements.curveCanvas;
    curveCtx = curveCanvas.getContext('2d');
}

function setupEventListeners() {
    // 圖片上傳
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.loadSampleBtn.addEventListener('click', loadSampleImage);

    // 通道選擇
    elements.channelBtns.forEach(btn => {
        btn.addEventListener('click', () => selectChannel(btn.dataset.channel));
    });

    // 預設曲線
    elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    // 操作按鈕
    elements.applyBtn.addEventListener('click', applyCurve);
    elements.resetBtn.addEventListener('click', resetCurve);
    elements.downloadBtn.addEventListener('click', downloadResult);

    // 曲線編輯器事件
    curveCanvas.addEventListener('mousedown', handleCurveMouseDown);
    curveCanvas.addEventListener('mousemove', handleCurveMouseMove);
    curveCanvas.addEventListener('mouseup', handleCurveMouseUp);
    curveCanvas.addEventListener('mouseleave', handleCurveMouseUp);
    curveCanvas.addEventListener('dblclick', handleCurveDoubleClick);
    curveCanvas.addEventListener('contextmenu', handleCurveRightClick);
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

function initializeCurveEditor() {
    drawCurve();
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
    // 創建一個漸層測試圖片
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // 繪製彩色漸層
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.25, '#feca57');
    gradient.addColorStop(0.5, '#48dbfb');
    gradient.addColorStop(0.75, '#ff9ff3');
    gradient.addColorStop(1, '#54a0ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加一些形狀
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(160, 120, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(480, 360, 100, 0, Math.PI * 2);
    ctx.fill();

    // 添加灰階條
    for (let i = 0; i < 16; i++) {
        const gray = Math.floor(i * 255 / 15);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(i * 40, canvas.height - 30, 40, 30);
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

// ===== 曲線編輯器 =====

function drawCurve() {
    const ctx = curveCtx;
    const width = curveCanvas.width;
    const height = curveCanvas.height;

    // 清除畫布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // 繪製網格
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const pos = (i / 4) * width;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(width, pos);
        ctx.stroke();
    }

    // 繪製對角線（參考線）
    ctx.strokeStyle = '#4a4a6e';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 獲取當前通道的控制點
    const points = getCurrentPoints();

    // 生成並繪製曲線
    ctx.strokeStyle = getChannelColor(currentChannel);
    ctx.lineWidth = 2;
    ctx.beginPath();

    const lut = generateLUTFromPoints(points);
    for (let x = 0; x < 256; x++) {
        const canvasX = x;
        const canvasY = height - lut[x];
        if (x === 0) {
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
    }
    ctx.stroke();

    // 繪製控制點
    points.forEach((point, index) => {
        ctx.fillStyle = index === dragPointIndex ? '#ffffff' : getChannelColor(currentChannel);
        ctx.beginPath();
        ctx.arc(point.x, height - point.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function getCurrentPoints() {
    return curves[currentChannel] || curves.rgb;
}

function setCurrentPoints(points) {
    if (currentChannel === 'rgb') {
        curves.rgb = points;
    } else {
        curves[currentChannel] = points;
    }
}

function getChannelColor(channel) {
    const colors = {
        rgb: '#ffffff',
        r: '#ff6b6b',
        g: '#51cf66',
        b: '#339af0'
    };
    return colors[channel] || '#ffffff';
}

function generateLUTFromPoints(points) {
    const lut = new Uint8Array(256);
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    // 確保有起點和終點
    if (sortedPoints[0].x > 0) {
        sortedPoints.unshift({ x: 0, y: sortedPoints[0].y });
    }
    if (sortedPoints[sortedPoints.length - 1].x < 255) {
        sortedPoints.push({ x: 255, y: sortedPoints[sortedPoints.length - 1].y });
    }

    for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(interpolateCatmullRom(sortedPoints, i));
        lut[i] = Math.max(0, Math.min(255, lut[i]));
    }

    return lut;
}

function interpolateCatmullRom(points, x) {
    let i = 0;
    while (i < points.length - 1 && points[i + 1].x < x) {
        i++;
    }

    if (i === 0 && x < points[0].x) {
        return points[0].y;
    }
    if (i >= points.length - 1) {
        return points[points.length - 1].y;
    }

    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const t = (x - p1.x) / (p2.x - p1.x || 1);
    const t2 = t * t;
    const t3 = t2 * t;

    const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return y;
}

function handleCurveMouseDown(e) {
    const rect = curveCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = curveCanvas.height - (e.clientY - rect.top);

    const points = getCurrentPoints();

    // 檢查是否點擊到現有控制點
    for (let i = 0; i < points.length; i++) {
        const dx = points[i].x - x;
        const dy = points[i].y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
            isDragging = true;
            dragPointIndex = i;
            return;
        }
    }
}

function handleCurveMouseMove(e) {
    if (!isDragging || dragPointIndex === -1) return;

    const rect = curveCanvas.getBoundingClientRect();
    let x = Math.round(e.clientX - rect.left);
    let y = Math.round(curveCanvas.height - (e.clientY - rect.top));

    // 限制範圍
    x = Math.max(0, Math.min(255, x));
    y = Math.max(0, Math.min(255, y));

    const points = getCurrentPoints();

    // 端點只能在 y 方向移動
    if (dragPointIndex === 0) {
        x = 0;
    } else if (dragPointIndex === points.length - 1) {
        x = 255;
    }

    points[dragPointIndex] = { x, y };
    setCurrentPoints(points);
    drawCurve();
}

function handleCurveMouseUp() {
    isDragging = false;
    dragPointIndex = -1;
    drawCurve();
}

function handleCurveDoubleClick(e) {
    const rect = curveCanvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(curveCanvas.height - (e.clientY - rect.top));

    const points = getCurrentPoints();

    // 檢查是否已有附近的點
    for (const point of points) {
        if (Math.abs(point.x - x) < 15) {
            return; // 太近已有控制點
        }
    }

    // 添加新控制點
    points.push({ x, y });
    points.sort((a, b) => a.x - b.x);
    setCurrentPoints(points);
    drawCurve();
}

function handleCurveRightClick(e) {
    e.preventDefault();

    const rect = curveCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = curveCanvas.height - (e.clientY - rect.top);

    const points = getCurrentPoints();

    // 找到並刪除最近的控制點（不能刪除端點）
    for (let i = 1; i < points.length - 1; i++) {
        const dx = points[i].x - x;
        const dy = points[i].y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
            points.splice(i, 1);
            setCurrentPoints(points);
            drawCurve();
            return;
        }
    }
}

function selectChannel(channel) {
    currentChannel = channel;

    // 如果該通道沒有自訂曲線，使用 RGB 的曲線
    if (!curves[channel] && channel !== 'rgb') {
        curves[channel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    }

    // 更新 UI
    elements.channelBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.channel === channel);
    });

    drawCurve();
}

function applyPreset(preset) {
    const presets = {
        linear: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        brighten: [{ x: 0, y: 30 }, { x: 128, y: 170 }, { x: 255, y: 255 }],
        darken: [{ x: 0, y: 0 }, { x: 128, y: 85 }, { x: 255, y: 225 }],
        contrast: [{ x: 0, y: 0 }, { x: 64, y: 32 }, { x: 192, y: 224 }, { x: 255, y: 255 }],
        invert: [{ x: 0, y: 255 }, { x: 255, y: 0 }],
        solarize: [{ x: 0, y: 0 }, { x: 128, y: 255 }, { x: 255, y: 0 }]
    };

    if (presets[preset]) {
        setCurrentPoints([...presets[preset]]);
        drawCurve();
    }
}

function resetCurve() {
    curves.rgb = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    curves.r = null;
    curves.g = null;
    curves.b = null;
    currentChannel = 'rgb';

    elements.channelBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.channel === 'rgb');
    });

    drawCurve();
}

// ===== 處理與輸出 =====

function applyCurve() {
    if (!originalImageData || isProcessing) return;

    isProcessing = true;
    updateUIState();
    hideError();

    // 準備曲線數據
    const curvesData = {
        rgb: curves.rgb,
        r: curves.r || curves.rgb,
        g: curves.g || curves.rgb,
        b: curves.b || curves.rgb
    };

    worker.postMessage({
        type: 'PROCESS',
        payload: {
            imageData: {
                data: new Uint8ClampedArray(originalImageData.data),
                width: originalImageData.width,
                height: originalImageData.height
            },
            curves: curvesData
        }
    });
}

function displayResult(result) {
    const { imageData, duration, pixelCount } = result;

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
            <span class="stat-label">像素數量：</span>
            <span class="stat-value">${pixelCount.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">圖片尺寸：</span>
            <span class="stat-value">${imageData.width} × ${imageData.height}</span>
        </div>
    `;

    elements.downloadBtn.disabled = false;
    updateProgress(100, '處理完成');
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'curve-adjusted.png';
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
