const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const pointSizeInput = document.getElementById('pointSize');
const pointSizeVal = document.getElementById('pointSizeVal');
const densityInput = document.getElementById('density');
const processTimeDisplay = document.getElementById('processTime');
const pointCountDisplay = document.getElementById('pointCountDisplay');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadLink = document.getElementById('downloadLink');

let originalImageData = null;
let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, duration, progress, count } = e.data;

        if (type === 'progress') {
            const percent = Math.round(progress * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `處理中... ${percent}%`;
        } else if (type === 'result') {
            resultCtx.putImageData(data, 0, 0);
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            pointCountDisplay.textContent = count.toLocaleString();

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

function handleImage(file) {
    const img = new Image();
    img.onload = function() {
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

        document.getElementById('originalInfo').textContent = `${width} x ${height} - ${(file.size / 1024).toFixed(2)} KB`;

        processBtn.disabled = false;
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

pointSizeInput.addEventListener('input', (e) => {
    pointSizeVal.textContent = e.target.value;
});

processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    processBtn.disabled = true;
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '準備中...';

    initWorker();

    const pointSize = parseInt(pointSizeInput.value);
    const density = parseFloat(densityInput.value);

    worker.postMessage({
        imageData: originalImageData,
        pointSize: pointSize,
        density: density
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImageData) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        processTimeDisplay.textContent = '-';
        pointCountDisplay.textContent = '-';
        downloadLink.classList.add('hidden');
    }
});
