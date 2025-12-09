// main.js

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');
const keypointCountDisplay = document.getElementById('keypointCount');
const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');

const thresholdInput = document.getElementById('threshold');
const thresholdVal = document.getElementById('thresholdVal');
const nmsInput = document.getElementById('nmsInput');
const overlayInput = document.getElementById('overlayInput');

let worker;
let originalImageData = null;

thresholdInput.addEventListener('input', (e) => {
    thresholdVal.textContent = e.target.value;
});

// Initialize Worker
if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data}%`;
            progressText.textContent = `Processing... ${Math.round(data)}%`;
        } else if (type === 'result') {
            const { keypoints, time, width, height } = data;

            drawKeypoints(keypoints, width, height);

            processingTimeDisplay.textContent = `${time.toFixed(2)} ms`;
            keypointCountDisplay.textContent = keypoints.length;
            processedInfo.textContent = `${width} x ${height}`;

            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', startProcessing);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadImage);

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
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
    reader.onload = function(event) {
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
            originalCtx.drawImage(img, 0, 0, width, height);

            originalImageData = originalCtx.getImageData(0, 0, width, height);
            originalInfo.textContent = `${width} x ${height}`;

            processedCanvas.width = width;
            processedCanvas.height = height;
            processedCtx.clearRect(0, 0, width, height);

            processBtn.disabled = false;
            resultContainer.classList.add('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startProcessing() {
    if (!originalImageData || !worker) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Finding corners...';

    const threshold = parseInt(thresholdInput.value);
    const nms = nmsInput.checked;

    worker.postMessage({
        imageData: originalImageData,
        threshold: threshold,
        nms: nms
    });
}

function drawKeypoints(keypoints, width, height) {
    if (overlayInput.checked) {
        processedCtx.putImageData(originalImageData, 0, 0);
    } else {
        processedCtx.fillStyle = '#000';
        processedCtx.fillRect(0, 0, width, height);
    }

    processedCtx.strokeStyle = '#00ff00';
    processedCtx.lineWidth = 1;

    keypoints.forEach(kp => {
        processedCtx.beginPath();
        processedCtx.arc(kp.x, kp.y, 3, 0, 2 * Math.PI);
        processedCtx.stroke();
    });
}

function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    originalInfo.textContent = 'No image loaded';
    processedInfo.textContent = '-';
    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    fileInput.value = '';
    originalImageData = null;
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'fast-corners.png';
    link.href = processedCanvas.toDataURL();
    link.click();
}
