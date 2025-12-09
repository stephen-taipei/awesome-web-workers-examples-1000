const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceInfo = document.getElementById('sourceInfo');
const targetInfo = document.getElementById('targetInfo');
const processTimeDisplay = document.getElementById('processTime');
const skinRatioDisplay = document.getElementById('skinRatio');
const resultsSection = document.getElementById('results');
const thresholdTypeSelect = document.getElementById('thresholdType');

let worker;
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { imageData, time, ratio } = data;

            const ctx = targetCanvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);

            processTimeDisplay.textContent = `${time}ms`;
            skinRatioDisplay.textContent = `${(ratio * 100).toFixed(2)}%`;
            targetInfo.textContent = `${imageData.width} x ${imageData.height}`;

        } else if (type === 'error') {
            console.error(data);
            alert('處理發生錯誤: ' + data);
        }
    };
}

// File Upload Handling
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

async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    try {
        currentImageBitmap = await createImageBitmap(file);

        // Display Source
        sourceCanvas.width = currentImageBitmap.width;
        sourceCanvas.height = currentImageBitmap.height;
        const ctx = sourceCanvas.getContext('2d');
        ctx.drawImage(currentImageBitmap, 0, 0);

        sourceInfo.textContent = `${currentImageBitmap.width} x ${currentImageBitmap.height}`;

        // Prepare Target
        targetCanvas.width = currentImageBitmap.width;
        targetCanvas.height = currentImageBitmap.height;

        controls.classList.remove('hidden');
        resultsSection.classList.remove('hidden');
        initWorker();

    } catch (err) {
        console.error(err);
        alert('圖片載入失敗');
    }
}

processBtn.addEventListener('click', () => {
    if (!currentImageBitmap) return;

    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    worker.postMessage({
        imageData: imageData,
        mode: thresholdTypeSelect.value
    });
});
