const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceInfo = document.getElementById('sourceInfo');
const targetInfo = document.getElementById('targetInfo');
const processTimeDisplay = document.getElementById('processTime');
const circleCountDisplay = document.getElementById('circleCount');
const resultsSection = document.getElementById('results');

const minRadiusInput = document.getElementById('minRadius');
const maxRadiusInput = document.getElementById('maxRadius');
const minRadiusVal = document.getElementById('minRadiusVal');
const maxRadiusVal = document.getElementById('maxRadiusVal');

let worker;
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { circles, time } = data;
            drawResults(circles);
            processTimeDisplay.textContent = `${time}ms`;
            circleCountDisplay.textContent = circles.length;
        } else if (type === 'error') {
            console.error(data);
            alert('處理發生錯誤: ' + data);
        }
    };
}

minRadiusInput.addEventListener('input', (e) => minRadiusVal.textContent = e.target.value);
maxRadiusInput.addEventListener('input', (e) => maxRadiusVal.textContent = e.target.value);

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

        // Prepare Target (Copy Source)
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

    worker.postMessage({
        imageData: imageData,
        minRadius: parseInt(minRadiusInput.value, 10),
        maxRadius: parseInt(maxRadiusInput.value, 10)
    });
});

function drawResults(circles) {
    const ctx = targetCanvas.getContext('2d');
    // Redraw image
    ctx.drawImage(currentImageBitmap, 0, 0);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8b5cf6'; // Violet

    circles.forEach(circle => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);
        ctx.stroke();

        // Center
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
}
