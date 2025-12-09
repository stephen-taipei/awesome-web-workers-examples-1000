const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceInfo = document.getElementById('sourceInfo');
const targetInfo = document.getElementById('targetInfo');
const processTimeDisplay = document.getElementById('processTime');
const faceCountDisplay = document.getElementById('faceCount');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('results');

// Controls
const minScaleInput = document.getElementById('minScale');
const maxScaleInput = document.getElementById('maxScale');
const stepScaleInput = document.getElementById('stepScale');
const minScaleVal = document.getElementById('minScaleVal');
const maxScaleVal = document.getElementById('maxScaleVal');
const stepScaleVal = document.getElementById('stepScaleVal');

let worker;
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `處理中: ${percent}%`;
        } else if (type === 'result') {
            const { faces, time } = data;
            drawResults(faces);
            processTimeDisplay.textContent = `${time}ms`;
            faceCountDisplay.textContent = faces.length;
            progressSection.classList.add('hidden');
        } else if (type === 'error') {
            console.error(data);
            alert('處理發生錯誤: ' + data);
            progressSection.classList.add('hidden');
        }
    };
}

// Update slider values
minScaleInput.addEventListener('input', (e) => minScaleVal.textContent = e.target.value);
maxScaleInput.addEventListener('input', (e) => maxScaleVal.textContent = e.target.value);
stepScaleInput.addEventListener('input', (e) => stepScaleVal.textContent = e.target.value);

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

        // Prepare Target Canvas (copy source for now)
        targetCanvas.width = currentImageBitmap.width;
        targetCanvas.height = currentImageBitmap.height;
        const tCtx = targetCanvas.getContext('2d');
        tCtx.drawImage(currentImageBitmap, 0, 0);

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

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';

    // Get parameters
    const params = {
        minScale: parseFloat(minScaleInput.value),
        maxScale: parseFloat(maxScaleInput.value),
        scaleStep: parseFloat(stepScaleInput.value)
    };

    worker.postMessage({
        imageData: imageData,
        params: params
    });
});

function drawResults(faces) {
    const ctx = targetCanvas.getContext('2d');
    // Clear and redraw image
    ctx.drawImage(currentImageBitmap, 0, 0);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10b981';

    faces.forEach(face => {
        ctx.strokeRect(face.x, face.y, face.width, face.height);
    });
}
