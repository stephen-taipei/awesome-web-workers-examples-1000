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
let currentLabel = 1;
let brushSize = 5;

// Colors for markers (ID 1-4)
const markerColors = {
    1: 'red',
    2: 'blue',
    3: 'green',
    4: 'yellow'
};

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

            drawResult(data.labels);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

function drawResult(labels) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Create result image: Original image blended with region colors
    const resultImg = resultCtx.createImageData(width, height);
    const src = originalImageData.data;
    const dest = resultImg.data;

    for (let i = 0; i < width * height; i++) {
        const label = labels[i];

        // Base pixel
        dest[i*4] = src[i*4];
        dest[i*4+1] = src[i*4+1];
        dest[i*4+2] = src[i*4+2];
        dest[i*4+3] = 255;

        // Overlay color if labeled
        if (label > 0) {
            let r=0, g=0, b=0;
            switch(label) {
                case 1: r=255; break; // Red
                case 2: b=255; break; // Blue
                case 3: g=128; break; // Green
                case 4: r=255; g=255; break; // Yellow
                default: r=255; g=255; b=255; break; // Watershed boundaries often 0 or -1, here regions are > 0
            }

            // Blend
            dest[i*4] = dest[i*4] * 0.7 + r * 0.3;
            dest[i*4+1] = dest[i*4+1] * 0.7 + g * 0.3;
            dest[i*4+2] = dest[i*4+2] * 0.7 + b * 0.3;
        } else if (label === 0) {
            // Watershed lines (boundaries)
            dest[i*4] = 255;
            dest[i*4+1] = 255;
            dest[i*4+2] = 255;
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
    markerCtx.strokeStyle = markerColors[currentLabel];

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
        currentLabel = parseInt(btn.dataset.color);
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
        const maxSize = 600; // Limit size for performance

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
        resultCtx.drawImage(img, 0, 0, width, height);
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

    // Get marker data
    // We need to convert RGB lines to Labels (1, 2, 3, 4)
    const markerDataImg = markerCtx.getImageData(0, 0, markerCanvas.width, markerCanvas.height);
    const markers = new Int32Array(markerCanvas.width * markerCanvas.height);

    let hasMarkers = false;

    for (let i = 0; i < markers.length; i++) {
        const r = markerDataImg.data[i*4];
        const g = markerDataImg.data[i*4+1];
        const b = markerDataImg.data[i*4+2];
        const a = markerDataImg.data[i*4+3];

        if (a > 128) { // If drawn
            hasMarkers = true;
            if (r > 200 && g < 100 && b < 100) markers[i] = 1; // Red
            else if (b > 200 && r < 100 && g < 100) markers[i] = 2; // Blue
            else if (g > 100 && r < 100 && b < 100) markers[i] = 3; // Green
            else if (r > 200 && g > 200 && b < 100) markers[i] = 4; // Yellow
        }
    }

    if (!hasMarkers) {
        alert('請先在圖片上繪製標記以指示不同區域');
        return;
    }

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    worker.postMessage({
        imageData: originalImageData,
        markers: markers
    });
});

initWorker();
