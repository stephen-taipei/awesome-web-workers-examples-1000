const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressContainer = document.getElementById('progressContainer');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');

const densityInput = document.getElementById('density');
const thresholdInput = document.getElementById('threshold');
const densityValue = document.getElementById('densityValue');
const thresholdValue = document.getElementById('thresholdValue');

let worker;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, imageData, progress, time } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Processing... ${Math.round(progress)}%`;
        } else if (type === 'result') {
            resultCanvas.width = imageData.width;
            resultCanvas.height = imageData.height;
            resultCtx.putImageData(imageData, 0, 0);

            progressBar.style.width = '100%';
            progressText.textContent = 'Completed!';
            processingTimeDisplay.textContent = `${time.toFixed(2)}ms`;

            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

initWorker();

// File Handling
fileInput.addEventListener('change', handleFileSelect);
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
    if (e.dataTransfer.files.length) {
        handleFileSelect({ target: { files: e.dataTransfer.files } });
    }
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Resize if too large
                let width = img.width;
                let height = img.height;
                const maxSize = 800;

                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }

                originalCanvas.width = width;
                originalCanvas.height = height;
                originalCtx.drawImage(img, 0, 0, width, height);

                document.getElementById('originalInfo').textContent = `${Math.round(width)}x${Math.round(height)}`;

                processBtn.disabled = false;
                resultContainer.classList.add('hidden');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Sliders
densityInput.addEventListener('input', () => {
    densityValue.textContent = densityInput.value;
});
thresholdInput.addEventListener('input', () => {
    thresholdValue.textContent = thresholdInput.value;
});

// Process
processBtn.addEventListener('click', () => {
    const imageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const density = parseFloat(densityInput.value);
    const threshold = parseFloat(thresholdInput.value);

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting...';

    worker.postMessage({
        imageData: imageData,
        density: density,
        threshold: threshold
    });
});

resetBtn.addEventListener('click', () => {
    if (originalCanvas.width > 0) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultContainer.classList.add('hidden');
        progressContainer.classList.add('hidden');
    }
});
