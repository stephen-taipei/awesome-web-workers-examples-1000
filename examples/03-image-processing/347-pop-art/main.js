const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalInfo = document.getElementById('originalInfo');
const resultInfo = document.getElementById('resultInfo');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const paletteSelect = document.getElementById('paletteSelect');
const threshold1Input = document.getElementById('threshold1');
const threshold2Input = document.getElementById('threshold2');
const thresh1Value = document.getElementById('thresh1Value');
const thresh2Value = document.getElementById('thresh2Value');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');

let worker;
let originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
let resultCtx = resultCanvas.getContext('2d');
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `Processing... ${percent}%`;
        } else if (type === 'result') {
            const { imageData, time } = data;

            // Draw result
            resultCtx.putImageData(imageData, 0, 0);

            // Update info
            processingTimeDisplay.textContent = `${time} ms`;

            // Show result section
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

initWorker();

// Event Listeners
threshold1Input.addEventListener('input', (e) => {
    thresh1Value.textContent = e.target.value;
});
threshold2Input.addEventListener('input', (e) => {
    thresh2Value.textContent = e.target.value;
});

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#007bff';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ccc';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

processBtn.addEventListener('click', () => {
    if (!currentImageBitmap) return;

    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    // Get ImageData
    const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    // Send to worker
    worker.postMessage({
        imageData: imageData,
        palette: paletteSelect.value,
        t1: parseInt(threshold1Input.value),
        t2: parseInt(threshold2Input.value)
    });
});

resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    originalInfo.textContent = 'No image loaded';
    resultInfo.textContent = '-';
    currentImageBitmap = null;
    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'pop-art-image.png';
    link.href = resultCanvas.toDataURL();
    link.click();
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }

    createImageBitmap(file).then(bitmap => {
        currentImageBitmap = bitmap;
        originalCanvas.width = bitmap.width;
        originalCanvas.height = bitmap.height;
        resultCanvas.width = bitmap.width;
        resultCanvas.height = bitmap.height;

        originalCtx.drawImage(bitmap, 0, 0);
        originalInfo.textContent = `${bitmap.width} x ${bitmap.height} px`;
        resultInfo.textContent = `${bitmap.width} x ${bitmap.height} px`;
        processBtn.disabled = false;

        // Clear previous result
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultContainer.classList.add('hidden');
    });
}
