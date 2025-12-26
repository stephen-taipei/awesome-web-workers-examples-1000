// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const blockSizeInput = document.getElementById('blockSize');
const blockSizeValue = document.getElementById('blockSizeValue');
const constantInput = document.getElementById('constant');
const constantValue = document.getElementById('constantValue');
const methodSelect = document.getElementById('method');
const processBtn = document.getElementById('processBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const globalCanvas = document.getElementById('globalCanvas');
const comparisonResult = document.getElementById('comparisonResult');
const imageSizeDisplay = document.getElementById('imageSize');
const processTimeDisplay = document.getElementById('processTime');
const pixelRateDisplay = document.getElementById('pixelRate');

// Contexts
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const globalCtx = globalCanvas.getContext('2d');

// Worker
const worker = new Worker('worker.js');

// State
let originalImage = null;
let startTime = null;

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
});

blockSizeInput.addEventListener('input', () => {
    blockSizeValue.textContent = blockSizeInput.value;
});

constantInput.addEventListener('input', () => {
    constantValue.textContent = constantInput.value;
});

processBtn.addEventListener('click', processImage);
compareBtn.addEventListener('click', compareGlobal);
resetBtn.addEventListener('click', reset);

// Worker message handler
worker.onmessage = function(e) {
    const { type, imageData, progress, threshold } = e.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(progress);
            break;

        case 'RESULT':
            displayResult(imageData);
            break;

        case 'GLOBAL_RESULT':
            displayGlobalResult(imageData, threshold);
            break;
    }
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;

            // Resize if too large
            let width = img.width;
            let height = img.height;
            const maxDim = 800;

            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round(height * maxDim / width);
                    width = maxDim;
                } else {
                    width = Math.round(width * maxDim / height);
                    height = maxDim;
                }
            }

            // Set canvas sizes
            originalCanvas.width = resultCanvas.width = globalCanvas.width = width;
            originalCanvas.height = resultCanvas.height = globalCanvas.height = height;

            // Draw original
            originalCtx.drawImage(img, 0, 0, width, height);

            // Update UI
            imageSizeDisplay.textContent = `${width} x ${height}`;
            processBtn.disabled = false;
            compareBtn.disabled = false;
            resetBtn.disabled = false;
            progressText.textContent = '圖片已載入，點擊處理按鈕開始';

            // Clear result
            resultCtx.clearRect(0, 0, width, height);
            comparisonResult.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    if (!originalImage) return;

    const width = originalCanvas.width;
    const height = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, width, height);

    processBtn.disabled = true;
    compareBtn.disabled = true;
    startTime = performance.now();
    updateProgress(0);
    progressText.textContent = '處理中...';

    worker.postMessage({
        type: 'ADAPTIVE_THRESHOLD',
        imageData: imageData,
        params: {
            blockSize: parseInt(blockSizeInput.value),
            constant: parseInt(constantInput.value),
            method: methodSelect.value
        }
    });
}

function compareGlobal() {
    if (!originalImage) return;

    const width = originalCanvas.width;
    const height = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, width, height);

    worker.postMessage({
        type: 'GLOBAL_THRESHOLD',
        imageData: imageData,
        params: {}
    });

    comparisonResult.classList.remove('hidden');
}

function updateProgress(progress) {
    progressBar.style.width = progress + '%';
    progressText.textContent = `處理中... ${progress}%`;
}

function displayResult(imageData) {
    const endTime = performance.now();
    const elapsed = endTime - startTime;

    resultCtx.putImageData(imageData, 0, 0);

    progressBar.style.width = '100%';
    progressText.textContent = '處理完成！';

    processBtn.disabled = false;
    compareBtn.disabled = false;

    // Update stats
    const pixels = imageData.width * imageData.height;
    processTimeDisplay.textContent = elapsed.toFixed(2) + ' ms';
    pixelRateDisplay.textContent = (pixels / elapsed * 1000 / 1000000).toFixed(2) + ' MP/s';
}

function displayGlobalResult(imageData, threshold) {
    globalCtx.putImageData(imageData, 0, 0);
    progressText.textContent = `全域閾值: ${threshold} (Otsu's method)`;
}

function reset() {
    if (!originalImage) return;

    const width = originalCanvas.width;
    const height = originalCanvas.height;

    resultCtx.clearRect(0, 0, width, height);
    globalCtx.clearRect(0, 0, width, height);
    comparisonResult.classList.add('hidden');

    progressBar.style.width = '0%';
    progressText.textContent = '已重置';
    processTimeDisplay.textContent = '-';
    pixelRateDisplay.textContent = '-';
}
