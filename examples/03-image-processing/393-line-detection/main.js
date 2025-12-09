const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceInfo = document.getElementById('sourceInfo');
const targetInfo = document.getElementById('targetInfo');
const processTimeDisplay = document.getElementById('processTime');
const lineCountDisplay = document.getElementById('lineCount');
const resultsSection = document.getElementById('results');
const thresholdInput = document.getElementById('threshold');
const thresholdVal = document.getElementById('thresholdVal');

let worker;
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { lines, time } = data;
            drawResults(lines);
            processTimeDisplay.textContent = `${time}ms`;
            lineCountDisplay.textContent = lines.length;
        } else if (type === 'error') {
            console.error(data);
            alert('處理發生錯誤: ' + data);
        }
    };
}

thresholdInput.addEventListener('input', (e) => thresholdVal.textContent = e.target.value);

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
        threshold: parseInt(thresholdInput.value, 10)
    });
});

function drawResults(lines) {
    const ctx = targetCanvas.getContext('2d');
    // Redraw image
    ctx.drawImage(currentImageBitmap, 0, 0);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ef4444';

    // lines are {rho, theta}
    // We need to convert back to coordinates to draw

    lines.forEach(line => {
        const { rho, theta } = line;
        const a = Math.cos(theta);
        const b = Math.sin(theta);
        const x0 = a * rho;
        const y0 = b * rho;

        // Calculate two points far away
        const pt1x = Math.round(x0 + 1000 * (-b));
        const pt1y = Math.round(y0 + 1000 * (a));
        const pt2x = Math.round(x0 - 1000 * (-b));
        const pt2y = Math.round(y0 - 1000 * (a));

        ctx.beginPath();
        ctx.moveTo(pt1x, pt1y);
        ctx.lineTo(pt2x, pt2y);
        ctx.stroke();
    });
}
