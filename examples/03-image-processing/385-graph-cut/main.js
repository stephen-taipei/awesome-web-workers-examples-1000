const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const markerCanvas = document.getElementById('markerCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const markerCtx = markerCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processTimeDisplay = document.getElementById('processTime');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const brushSizeInput = document.getElementById('brushSize');
const colorBtns = document.querySelectorAll('.color-btn');

let worker;
let originalImageData = null;
let isDrawing = false;
let currentType = 'foreground'; // 'foreground' or 'background'
let brushSize = 5;

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
            processTimeDisplay.textContent = `${executionTime}ms`;

            drawResult(data.mask);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

function drawResult(mask) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const resultImg = resultCtx.createImageData(width, height);
    const src = originalImageData.data;
    const dest = resultImg.data;

    for (let i = 0; i < width * height; i++) {
        const isForeground = mask[i] === 1;

        if (isForeground) {
            dest[i*4] = src[i*4];
            dest[i*4+1] = src[i*4+1];
            dest[i*4+2] = src[i*4+2];
            dest[i*4+3] = 255;
        } else {
            // Background - make it transparent or dark
            dest[i*4] = 0;
            dest[i*4+1] = 0;
            dest[i*4+2] = 0;
            dest[i*4+3] = 255;
        }
    }

    resultCtx.putImageData(resultImg, 0, 0);
}

// Drawing Logic
function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    markerCtx.beginPath();
}

function draw(e) {
    if (!isDrawing) return;

    const rect = sourceCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    markerCtx.lineWidth = brushSize;
    markerCtx.lineCap = 'round';
    markerCtx.strokeStyle = currentType === 'foreground' ? 'red' : 'blue';

    markerCtx.lineTo(x, y);
    markerCtx.stroke();
    markerCtx.beginPath();
    markerCtx.moveTo(x, y);
}

sourceCanvas.addEventListener('mousedown', startDrawing);
sourceCanvas.addEventListener('mousemove', draw);
sourceCanvas.addEventListener('mouseup', stopDrawing);
sourceCanvas.addEventListener('mouseout', stopDrawing);

// UI Events
colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentType = btn.dataset.type;
    });
});

brushSizeInput.addEventListener('input', (e) => brushSize = e.target.value);

clearBtn.addEventListener('click', () => {
    markerCtx.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
});

// File Handling
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        // Limit size significantly for Graph Cut performance in JS
        const maxSize = 200;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        sourceCanvas.width = width;
        sourceCanvas.height = height;
        markerCanvas.width = width;
        markerCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        sourceCtx.drawImage(img, 0, 0, width, height);
        originalImageData = sourceCtx.getImageData(0, 0, width, height);
        resultCtx.clearRect(0, 0, width, height);
        markerCtx.clearRect(0, 0, width, height);

        processBtn.disabled = false;
        clearBtn.disabled = false;
        processTimeDisplay.textContent = '-';
    };
    img.src = URL.createObjectURL(file);
}

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Processing
processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    // Parse markers
    const markerDataImg = markerCtx.getImageData(0, 0, markerCanvas.width, markerCanvas.height);
    // 0: Unknown, 1: Foreground (Source), 2: Background (Sink)
    const markers = new Uint8Array(markerCanvas.width * markerCanvas.height);

    let hasFg = false;
    let hasBg = false;

    for (let i = 0; i < markers.length; i++) {
        const r = markerDataImg.data[i*4];
        const b = markerDataImg.data[i*4+2];
        const a = markerDataImg.data[i*4+3];

        if (a > 128) {
            if (r > 200) {
                markers[i] = 1; // Foreground (Source)
                hasFg = true;
            } else if (b > 200) {
                markers[i] = 2; // Background (Sink)
                hasBg = true;
            }
        }
    }

    if (!hasFg || !hasBg) {
        alert('請標記至少一個前景區域 (紅) 和一個背景區域 (藍)');
        return;
    }

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化圖割...';
    processBtn.disabled = true;

    worker.postMessage({
        imageData: originalImageData,
        markers: markers
    });
});

initWorker();
