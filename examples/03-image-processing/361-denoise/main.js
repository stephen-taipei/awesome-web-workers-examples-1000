const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const processBtn = document.getElementById('processBtn');
const addNoiseBtn = document.getElementById('addNoiseBtn');
const resetBtn = document.getElementById('resetBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const strengthInput = document.getElementById('strength');
const strengthVal = document.getElementById('strengthVal');
const windowSizeInput = document.getElementById('windowSize');
const patchSizeInput = document.getElementById('patchSize');
const processTimeDisplay = document.getElementById('processTime');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadLink = document.getElementById('downloadLink');

let originalImageData = null;
let currentImageData = null; // Can be noisy image
let worker = null;

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
            addNoiseBtn.disabled = false;
            downloadLink.href = resultCanvas.toDataURL();
            downloadLink.classList.remove('hidden');
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('處理過程中發生錯誤');
        processBtn.disabled = false;
        addNoiseBtn.disabled = false;
        progressSection.classList.add('hidden');
    };
}

function handleImage(file) {
    const img = new Image();
    img.onload = function() {
        // Limit size for NL-means performance
        const maxWidth = 800;
        const maxHeight = 600;
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
        currentImageData = originalImageData;

        document.getElementById('originalInfo').textContent = `${width} x ${height}`;

        processBtn.disabled = false;
        addNoiseBtn.disabled = false;
        resetBtn.disabled = false;
        downloadLink.classList.add('hidden');

        resultCtx.clearRect(0, 0, width, height);
    };
    img.src = URL.createObjectURL(file);
}

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

strengthInput.addEventListener('input', (e) => {
    strengthVal.textContent = e.target.value;
});

// Helper to add noise for testing
addNoiseBtn.addEventListener('click', () => {
    if (!currentImageData) return;

    const width = currentImageData.width;
    const height = currentImageData.height;
    const data = new Uint8ClampedArray(currentImageData.data);

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 50;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
    }

    currentImageData = new ImageData(data, width, height);
    originalCtx.putImageData(currentImageData, 0, 0);
});

processBtn.addEventListener('click', () => {
    if (!currentImageData) return;

    processBtn.disabled = true;
    addNoiseBtn.disabled = true;
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '準備中...';

    initWorker();

    const strength = parseFloat(strengthInput.value);
    const windowSize = parseInt(windowSizeInput.value);
    const patchSize = parseInt(patchSizeInput.value);

    worker.postMessage({
        imageData: currentImageData,
        strength: strength,
        windowSize: windowSize,
        patchSize: patchSize
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImageData) {
        currentImageData = originalImageData;
        originalCtx.putImageData(originalImageData, 0, 0);
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        processTimeDisplay.textContent = '-';
        downloadLink.classList.add('hidden');
    }
});
