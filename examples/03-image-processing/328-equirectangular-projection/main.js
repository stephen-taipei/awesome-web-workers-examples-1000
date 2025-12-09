// Equirectangular Projection - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const yawRange = document.getElementById('yawRange');
const yawValue = document.getElementById('yawValue');
const pitchRange = document.getElementById('pitchRange');
const pitchValue = document.getElementById('pitchValue');
const fovRange = document.getElementById('fovRange');
const fovValue = document.getElementById('fovValue');
const autoUpdateCheck = document.getElementById('autoUpdate');

const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');

const resultContainer = document.getElementById('resultContainer');
const processingTimeEl = document.getElementById('processingTime');
const viewResEl = document.getElementById('viewRes');
const workerStatusEl = document.getElementById('workerStatus');

let originalImageData = null;
let worker = null;
let isProcessing = false;
let pendingUpdate = false;

// View settings
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data.percent}%`;
        } else if (type === 'result') {
            handleResult(data);
        } else if (type === 'error') {
            console.error('Worker error:', data.error);
            workerStatusEl.textContent = 'Error';
            isProcessing = false;
        }
    };

    workerStatusEl.textContent = 'Ready';
}

function handleImageLoad(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Keep full resolution in memory, but draw scaled on canvas
            const displayMaxSize = 600;
            const ratio = Math.min(displayMaxSize / img.width, displayMaxSize / img.height);
            const displayWidth = Math.round(img.width * ratio);
            const displayHeight = Math.round(img.height * ratio);

            originalCanvas.width = displayWidth;
            originalCanvas.height = displayHeight;
            originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);

            // Create an offscreen canvas to get full ImageData
            const offscreen = document.createElement('canvas');
            // Limit input size for performance in this demo
            const maxInputSize = 2048;
            let inputWidth = img.width;
            let inputHeight = img.height;

            if (inputWidth > maxInputSize) {
                inputHeight = Math.round(inputHeight * (maxInputSize / inputWidth));
                inputWidth = maxInputSize;
            }

            offscreen.width = inputWidth;
            offscreen.height = inputHeight;
            const offscreenCtx = offscreen.getContext('2d');
            offscreenCtx.drawImage(img, 0, 0, inputWidth, inputHeight);

            originalImageData = offscreenCtx.getImageData(0, 0, inputWidth, inputHeight);

            originalInfo.textContent = `${inputWidth} × ${inputHeight} (Source)`;

            // Set up processed canvas
            processedCanvas.width = VIEW_WIDTH;
            processedCanvas.height = VIEW_HEIGHT;
            processedCtx.fillStyle = '#000';
            processedCtx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
            processedInfo.textContent = 'Ready';

            processBtn.disabled = false;

            // Initial render
            updateView();
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

function updateView(isInteractive = false) {
    if (!originalImageData || isProcessing) {
        if (isProcessing) pendingUpdate = true;
        return;
    }

    isProcessing = true;
    workerStatusEl.textContent = 'Processing...';

    // If interactive (dragging), use lower resolution
    const width = isInteractive ? VIEW_WIDTH / 2 : VIEW_WIDTH;
    const height = isInteractive ? VIEW_HEIGHT / 2 : VIEW_HEIGHT;

    const yaw = parseFloat(yawRange.value);
    const pitch = parseFloat(pitchRange.value);
    const fov = parseFloat(fovRange.value);

    worker.postMessage({
        type: 'process',
        imageData: originalImageData,
        params: {
            width,
            height,
            yaw,
            pitch,
            fov
        }
    });
}

function handleResult(data) {
    const { processedData, width, height, executionTime } = data;

    // Scale up if low res
    if (width !== VIEW_WIDTH) {
        createImageBitmap(new ImageData(new Uint8ClampedArray(processedData), width, height))
            .then(bitmap => {
                processedCtx.drawImage(bitmap, 0, 0, width, height, 0, 0, VIEW_WIDTH, VIEW_HEIGHT);
                finishUpdate(executionTime, width, height);
            });
    } else {
        const imageData = new ImageData(
            new Uint8ClampedArray(processedData),
            width,
            height
        );
        processedCtx.putImageData(imageData, 0, 0);
        finishUpdate(executionTime, width, height);
    }
}

function finishUpdate(time, width, height) {
    isProcessing = false;
    processingTimeEl.textContent = `${time.toFixed(2)} ms`;
    viewResEl.textContent = `${width} × ${height}`;
    workerStatusEl.textContent = 'Ready';

    if (!resultContainer.classList.contains('hidden')) {
        // results visible
    } else {
        // Show results on first valid render
        resultContainer.classList.remove('hidden');
    }

    if (pendingUpdate) {
        pendingUpdate = false;
        // Check if we need another update (e.g. slider moved while processing)
        if (autoUpdateCheck.checked) {
             updateView(true);
        }
    }
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'view.png';
    link.href = processedCanvas.toDataURL('image/png');
    link.click();
}

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleImageLoad(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageLoad(e.target.files[0]);
});

function onControlChange() {
    yawValue.textContent = yawRange.value;
    pitchValue.textContent = pitchRange.value;
    fovValue.textContent = fovRange.value;

    if (autoUpdateCheck.checked) {
        updateView(true);
    }
}

yawRange.addEventListener('input', onControlChange);
pitchRange.addEventListener('input', onControlChange);
fovRange.addEventListener('input', onControlChange);

processBtn.addEventListener('click', () => updateView(false));
downloadBtn.addEventListener('click', downloadImage);

initWorker();
