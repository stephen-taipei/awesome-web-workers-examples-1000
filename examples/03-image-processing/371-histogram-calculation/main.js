const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sourceCanvas = document.getElementById('sourceCanvas');
const histCanvas = document.getElementById('histCanvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const histCtx = histCanvas.getContext('2d');

const statsRow = document.getElementById('statsRow');
const avgLumaEl = document.getElementById('avgLuma');
const pixelCountEl = document.getElementById('pixelCount');
const calcTimeEl = document.getElementById('calcTime');

let worker;
let originalImageData = null;
let currentHistData = null;

const channels = {
    r: true,
    g: true,
    b: true,
    l: true
};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'result') {
            currentHistData = e.data.histograms;
            drawHistogram(currentHistData);

            statsRow.style.display = 'grid';
            avgLumaEl.textContent = e.data.stats.avgLuma.toFixed(2);
            pixelCountEl.textContent = e.data.stats.pixelCount.toLocaleString();
            calcTimeEl.textContent = e.data.time.toFixed(2) + 'ms';

            document.getElementById('targetInfo').textContent = '計算完成';
        }
    };
}

function processImage() {
    if (!originalImageData) return;
    document.getElementById('targetInfo').textContent = '計算中...';
    worker.postMessage({ imageData: originalImageData });
}

function drawHistogram(histData) {
    if (!histData) return;

    const w = histCanvas.width = histCanvas.clientWidth;
    const h = histCanvas.height = histCanvas.clientHeight;

    histCtx.clearRect(0, 0, w, h);

    // Find max value to scale graph
    let maxCount = 0;
    if (channels.r) maxCount = Math.max(maxCount, Math.max(...histData.r));
    if (channels.g) maxCount = Math.max(maxCount, Math.max(...histData.g));
    if (channels.b) maxCount = Math.max(maxCount, Math.max(...histData.b));
    if (channels.l) maxCount = Math.max(maxCount, Math.max(...histData.l));

    if (maxCount === 0) return;

    histCtx.lineWidth = 2;
    histCtx.globalCompositeOperation = 'screen'; // Blend colors

    function drawLine(data, color) {
        histCtx.strokeStyle = color;
        histCtx.beginPath();
        const step = w / 256;

        for (let i = 0; i < 256; i++) {
            const val = data[i];
            const barH = (val / maxCount) * h * 0.9; // 90% height max
            const x = i * step;
            const y = h - barH;

            if (i === 0) histCtx.moveTo(x, y);
            else histCtx.lineTo(x, y);
        }
        histCtx.stroke();

        // Fill
        histCtx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
        histCtx.lineTo(w, h);
        histCtx.lineTo(0, h);
        histCtx.fill();
    }

    if (channels.r) drawLine(histData.r, 'rgb(239, 68, 68)');
    if (channels.g) drawLine(histData.g, 'rgb(34, 197, 94)');
    if (channels.b) drawLine(histData.b, 'rgb(59, 130, 246)');
    if (channels.l) drawLine(histData.l, 'rgb(156, 163, 175)');
}

// Channel Toggles
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = () => {
        const ch = btn.dataset.channel;
        channels[ch] = !channels[ch];
        btn.classList.toggle('active', channels[ch]);
        drawHistogram(currentHistData);
    };
});

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
             // Resize to a reasonable analysis size (e.g. max 1000px)
             let w = img.width;
             let h = img.height;
             const MAX_SIZE = 1000;
             if (w > MAX_SIZE || h > MAX_SIZE) {
                 const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                 w = Math.floor(w * ratio);
                 h = Math.floor(h * ratio);
             }

             sourceCanvas.width = w;
             sourceCanvas.height = h;
             sourceCtx.drawImage(img, 0, 0, w, h);
             originalImageData = sourceCtx.getImageData(0, 0, w, h);

             document.getElementById('sourceInfo').textContent = `尺寸: ${w}x${h}`;

             initWorker();
             processImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

initWorker();
