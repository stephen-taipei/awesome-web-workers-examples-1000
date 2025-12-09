const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const resetBtn = document.getElementById('resetBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processTimeDisplay = document.getElementById('processTime');
const pixelCountDisplay = document.getElementById('pixelCount');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const thresholdInput = document.getElementById('threshold');
const seedMarker = document.getElementById('seedMarker');

let worker;
let originalImageData = null;
let currentSeed = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime, progress, message } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = message;
        } else if (type === 'result') {
            const { mask, pixelCount } = data;
            processTimeDisplay.textContent = `${executionTime}ms`;
            pixelCountDisplay.textContent = pixelCount;

            drawResult(mask);

            progressSection.classList.add('hidden');
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
        }
    };
}

function drawResult(mask) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Create result image: Original image overlayed with mask (e.g., green tint)
    const resultImg = resultCtx.createImageData(width, height);
    const src = originalImageData.data;
    const dest = resultImg.data;

    for (let i = 0; i < width * height; i++) {
        const isSelected = mask[i] === 1;

        dest[i*4] = src[i*4];
        dest[i*4+1] = src[i*4+1];
        dest[i*4+2] = src[i*4+2];
        dest[i*4+3] = 255;

        if (isSelected) {
            // Highlight in Red
            dest[i*4] = Math.min(255, dest[i*4] + 100);
            dest[i*4+1] = Math.max(0, dest[i*4+1] - 50);
            dest[i*4+2] = Math.max(0, dest[i*4+2] - 50);
        } else {
            // Dim unselected areas
            dest[i*4] = dest[i*4] * 0.5;
            dest[i*4+1] = dest[i*4+1] * 0.5;
            dest[i*4+2] = dest[i*4+2] * 0.5;
        }
    }

    resultCtx.putImageData(resultImg, 0, 0);
}

// Handle file upload
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        sourceCanvas.width = width;
        sourceCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        sourceCtx.drawImage(img, 0, 0, width, height);
        originalImageData = sourceCtx.getImageData(0, 0, width, height);
        resultCtx.drawImage(img, 0, 0, width, height); // Copy to result initially

        resetBtn.disabled = false;
        processTimeDisplay.textContent = '-';
        pixelCountDisplay.textContent = '-';
        seedMarker.style.display = 'none';
        currentSeed = null;
    };
    img.src = URL.createObjectURL(file);
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

sourceCanvas.addEventListener('click', (e) => {
    if (!originalImageData) return;

    const rect = sourceCanvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    currentSeed = { x, y };

    // Move marker
    seedMarker.style.display = 'block';
    seedMarker.style.left = x + 'px';
    seedMarker.style.top = y + 'px';

    runRegionGrowing();
});

resetBtn.addEventListener('click', () => {
    if (originalImageData) {
        resultCtx.putImageData(originalImageData, 0, 0);
        seedMarker.style.display = 'none';
        currentSeed = null;
    }
});

thresholdInput.addEventListener('change', () => {
    if (currentSeed) runRegionGrowing();
});

function runRegionGrowing() {
    if (!currentSeed || !originalImageData) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '計算中...';

    worker.postMessage({
        imageData: originalImageData,
        seed: currentSeed,
        threshold: parseInt(thresholdInput.value)
    });
}

initWorker();
