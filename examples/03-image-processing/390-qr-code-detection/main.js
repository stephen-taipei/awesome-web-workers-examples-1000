const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceInfo = document.getElementById('sourceInfo');
const targetInfo = document.getElementById('targetInfo');
const processTimeDisplay = document.getElementById('processTime');
const patternCountDisplay = document.getElementById('patternCount');
const resultsSection = document.getElementById('results');

let worker;
let currentImageBitmap = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { patterns, time } = data;
            drawResults(patterns);
            processTimeDisplay.textContent = `${time}ms`;
            patternCountDisplay.textContent = patterns.length;
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
        imageData: imageData
    });
});

function drawResults(patterns) {
    const ctx = targetCanvas.getContext('2d');
    // Redraw image
    ctx.drawImage(currentImageBitmap, 0, 0);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444'; // Red for pattern
    ctx.fillStyle = '#ef4444';

    patterns.forEach(p => {
        // Draw cross at center
        const size = p.moduleSize * 7; // Approx size of finder pattern
        ctx.strokeRect(p.x - size/2, p.y - size/2, size, size);

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    if (patterns.length >= 3) {
        // Try to connect the 3 patterns (top-left, top-right, bottom-left)
        // Simplest way: Connect all of them
        ctx.strokeStyle = '#10b981'; // Green for potential QR box
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (patterns.length === 3) {
            ctx.moveTo(patterns[0].x, patterns[0].y);
            ctx.lineTo(patterns[1].x, patterns[1].y);
            ctx.lineTo(patterns[2].x, patterns[2].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}
