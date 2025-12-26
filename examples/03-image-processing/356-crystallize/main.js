// 主執行緒代碼
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const cellSizeInput = document.getElementById('cellSize');
const cellSizeVal = document.getElementById('cellSizeVal');
const pointCountVal = document.getElementById('pointCountVal');
const processTimeDisplay = document.getElementById('processTime');
const imageSizeDisplay = document.getElementById('imageSize');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadLink = document.getElementById('downloadLink');

let originalImageData = null;
let worker = null;

// 初始化 Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, duration, progress } = e.data;

        if (type === 'progress') {
            const percent = Math.round(progress * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `處理中... ${percent}%`;
        } else if (type === 'result') {
            resultCtx.putImageData(data, 0, 0);
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
            downloadLink.href = resultCanvas.toDataURL();
            downloadLink.classList.remove('hidden');
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('處理過程中發生錯誤');
        processBtn.disabled = false;
        progressSection.classList.add('hidden');
    };
}

// 圖片加載處理
function handleImage(file) {
    const img = new Image();
    img.onload = function() {
        // 限制最大尺寸以避免瀏覽器崩潰，但要保持高質量
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        originalCanvas.width = width;
        originalCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        originalCtx.drawImage(img, 0, 0, width, height);
        originalImageData = originalCtx.getImageData(0, 0, width, height);

        imageSizeDisplay.textContent = `${width} x ${height}`;
        document.getElementById('originalInfo').textContent = `${(file.size / 1024).toFixed(2)} KB`;

        processBtn.disabled = false;
        resetBtn.disabled = false;
        downloadLink.classList.add('hidden');

        // 清空結果畫布
        resultCtx.clearRect(0, 0, width, height);

        // 更新估計點數
        updateEstimatedPoints();
    };
    img.src = URL.createObjectURL(file);
}

// 更新估計點數
function updateEstimatedPoints() {
    if (!originalImageData) return;
    const width = originalImageData.width;
    const height = originalImageData.height;
    const cellSize = parseInt(cellSizeInput.value);

    // 估計的特徵點數量
    const estimatedPoints = Math.floor((width * height) / (cellSize * cellSize));
    pointCountVal.textContent = estimatedPoints.toLocaleString();
}

// 事件監聽器
fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) handleImage(e.target.files[0]);
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleImage(e.dataTransfer.files[0]);
});

dropZone.addEventListener('click', () => fileInput.click());

cellSizeInput.addEventListener('input', (e) => {
    cellSizeVal.textContent = e.target.value;
    updateEstimatedPoints();
});

processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    processBtn.disabled = true;
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '準備中...';

    initWorker();

    const cellSize = parseInt(cellSizeInput.value);

    worker.postMessage({
        imageData: originalImageData,
        cellSize: cellSize
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImageData) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        processTimeDisplay.textContent = '-';
        downloadLink.classList.add('hidden');
    }
});
