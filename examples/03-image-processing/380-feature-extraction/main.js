const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processTimeDisplay = document.getElementById('processTime');
const keypointCountDisplay = document.getElementById('keypointCount');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const sourceInfo = document.getElementById('sourceInfo');
const resultInfo = document.getElementById('resultInfo');
const thresholdInput = document.getElementById('threshold');
const maxKeypointsInput = document.getElementById('maxKeypoints');

let worker;
let originalImageData = null;

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
            const keypoints = data.keypoints;
            processTimeDisplay.textContent = `${executionTime}ms`;
            keypointCountDisplay.textContent = keypoints.length;

            drawKeypoints(keypoints);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

// Draw keypoints on result canvas
function drawKeypoints(keypoints) {
    // Restore original image
    resultCtx.putImageData(originalImageData, 0, 0);

    // Draw keypoints
    keypoints.forEach(kp => {
        const { x, y, size, angle } = kp;

        resultCtx.beginPath();
        resultCtx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        resultCtx.lineWidth = 1.5;
        resultCtx.arc(x, y, size, 0, 2 * Math.PI);
        resultCtx.stroke();

        // Draw orientation
        if (angle !== undefined) {
            resultCtx.beginPath();
            resultCtx.moveTo(x, y);
            resultCtx.lineTo(
                x + size * Math.cos(angle),
                y + size * Math.sin(angle)
            );
            resultCtx.stroke();
        }
    });

    resultInfo.textContent = `顯示 ${keypoints.length} 個關鍵點`;
}

// Handle file upload
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        // Resize if too large to avoid performance issues in this demo
        let width = img.width;
        let height = img.height;
        const maxSize = 1024;

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
        resultCtx.putImageData(originalImageData, 0, 0);

        sourceInfo.textContent = `${width} x ${height}`;
        resultInfo.textContent = '';
        processBtn.disabled = false;
        processTimeDisplay.textContent = '-';
        keypointCountDisplay.textContent = '-';
    };
    img.src = URL.createObjectURL(file);
}

// Event Listeners
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

processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    const params = {
        threshold: parseInt(thresholdInput.value),
        maxKeypoints: parseInt(maxKeypointsInput.value)
    };

    worker.postMessage({
        imageData: originalImageData,
        params
    });
});

// Initialize
initWorker();
