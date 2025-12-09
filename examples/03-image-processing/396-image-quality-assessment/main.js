// 主執行緒
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const processBtn = document.getElementById('processBtn');
const previewCanvas = document.getElementById('previewCanvas');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const imageInfo = document.getElementById('imageInfo');

// 結果顯示元素
const qualityScoreEl = document.getElementById('qualityScore');
const sharpnessValEl = document.getElementById('sharpnessVal');
const contrastValEl = document.getElementById('contrastVal');
const brightnessValEl = document.getElementById('brightnessVal');
const processTimeEl = document.getElementById('processTime');

let worker;
let currentFile = null;

// 初始化 Worker
function initWorker() {
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `評估中... ${percent}%`;
        } else if (type === 'complete') {
            const { sharpness, contrast, brightness, score, time } = data;

            // 顯示結果
            qualityScoreEl.textContent = score.toFixed(1) + '/100';
            qualityScoreEl.style.color = getScoreColor(score);

            sharpnessValEl.textContent = sharpness.toFixed(2);
            contrastValEl.textContent = contrast.toFixed(2);
            brightnessValEl.textContent = brightness.toFixed(2);
            processTimeEl.textContent = `${time}ms`;

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        }
    };
}

function getScoreColor(score) {
    if (score >= 80) return '#4ade80'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    return '#f87171'; // Red
}

// 檔案處理
fileInput.addEventListener('change', handleFileSelect);

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('請上傳圖片檔案');
        return;
    }

    currentFile = file;
    processBtn.disabled = false;
    resultSection.classList.add('hidden');

    // 預覽圖片
    const img = new Image();
    img.onload = () => {
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        imageInfo.textContent = `${img.width} x ${img.height} • ${(file.size / 1024).toFixed(1)} KB`;

        // 為了性能，如果圖片太大，我們縮小一點傳給 Worker 做分析
        // 但為了準確評估品質（特別是模糊），最好不要縮太小
        // 這裡我們限制最大邊長為 1920，避免過大圖片導致 OOM
        const maxDim = 1920;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        // 準備傳給 Worker 的數據
        // 使用 OffscreenCanvas 或 createImageBitmap
        createImageBitmap(file)
            .then(bitmap => {
                // 如果需要縮放，Worker 內部處理或這裡處理
                // 這裡我們直接傳 bitmap 給 Worker，讓 Worker 決定是否縮放或直接讀取
                // 但 bitmap 不能直接讀取像素，需要繪製到 OffscreenCanvas
                // 所以我們在主線程提取 ImageData 傳給 Worker 比較通用

                // 使用一個臨時 canvas 獲取 ImageData
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0, w, h);
                const imageData = tempCtx.getImageData(0, 0, w, h);

                // 存儲準備好的數據，等待點擊按鈕
                currentFile.imageData = imageData;
            });
    };
    img.src = URL.createObjectURL(file);
}

processBtn.addEventListener('click', () => {
    if (!currentFile || !currentFile.imageData) return;

    if (!worker) initWorker();

    processBtn.disabled = true;
    progressSection.classList.remove('hidden');
    resultSection.classList.remove('hidden'); // Show results area (placeholders)
    progressBar.style.width = '0%';
    progressText.textContent = '準備中...';

    // 傳送數據給 Worker
    // 使用 transfer 轉移 ImageData 的 buffer 以提高性能
    worker.postMessage({
        imageData: currentFile.imageData
    }, [currentFile.imageData.data.buffer]);

    // 清除引用，因為 buffer 已轉移
    currentFile.imageData = null;
});

// 初始化
initWorker();
