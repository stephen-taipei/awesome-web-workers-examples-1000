const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const selectionBox = document.getElementById('selectionBox');
const processTimeDisplay = document.getElementById('processTime');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const iterationsInput = document.getElementById('iterations');

let worker;
let originalImageData = null;
let isSelecting = false;
let startX, startY, endX, endY;
let rect = null; // {x, y, w, h}

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
        // GrabCut masks: 0=BG, 1=FG, 2=Prob_BG, 3=Prob_FG
        // We show FG (1) and Prob_FG (3)
        const val = mask[i];

        if (val === 1 || val === 3) {
            dest[i*4] = src[i*4];
            dest[i*4+1] = src[i*4+1];
            dest[i*4+2] = src[i*4+2];
            dest[i*4+3] = 255;
        } else {
            // Transparent for BG
            dest[i*4] = 0;
            dest[i*4+1] = 0;
            dest[i*4+2] = 0;
            dest[i*4+3] = 0;
        }
    }

    resultCtx.putImageData(resultImg, 0, 0);
}

// Selection Logic
sourceCanvas.addEventListener('mousedown', e => {
    const canvasRect = sourceCanvas.getBoundingClientRect();
    startX = e.clientX - canvasRect.left;
    startY = e.clientY - canvasRect.top;
    isSelecting = true;
    selectionBox.style.display = 'block';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
});

sourceCanvas.addEventListener('mousemove', e => {
    if (!isSelecting) return;
    const canvasRect = sourceCanvas.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    const width = currentX - startX;
    const height = currentY - startY;

    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
    selectionBox.style.left = (width < 0 ? currentX : startX) + 'px';
    selectionBox.style.top = (height < 0 ? currentY : startY) + 'px';

    endX = currentX;
    endY = currentY;
});

sourceCanvas.addEventListener('mouseup', () => {
    isSelecting = false;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w > 10 && h > 10) {
        rect = { x: Math.floor(x), y: Math.floor(y), w: Math.floor(w), h: Math.floor(h) };
        processBtn.disabled = false;
    } else {
        rect = null;
        selectionBox.style.display = 'none';
        processBtn.disabled = true;
    }
});

// File Handling
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 250; // GrabCut is heavy

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
        resultCtx.clearRect(0, 0, width, height);

        rect = null;
        selectionBox.style.display = 'none';
        processBtn.disabled = true;
        processTimeDisplay.textContent = '-';
    };
    img.src = URL.createObjectURL(file);
}

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Processing
processBtn.addEventListener('click', () => {
    if (!originalImageData || !rect) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    worker.postMessage({
        imageData: originalImageData,
        rect: rect,
        iterations: parseInt(iterationsInput.value)
    });
});

initWorker();
