const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const originalCanvas = document.getElementById('originalCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const originalCtx = originalCanvas.getContext('2d');
const histCtx = histogramCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
worker.onmessage = (e) => drawHistogram(e.data);

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            originalCanvas.width = w;
            originalCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            worker.postMessage({ imageData: originalCtx.getImageData(0, 0, w, h) });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawHistogram({ rHist, gHist, bHist }) {
    histCtx.fillStyle = '#1a1a2e';
    histCtx.fillRect(0, 0, 512, 200);
    const max = Math.max(...rHist, ...gHist, ...bHist);
    const scale = 180 / max;

    histCtx.globalAlpha = 0.7;
    for (let i = 0; i < 256; i++) {
        histCtx.fillStyle = '#ff0000';
        histCtx.fillRect(i * 2, 200 - rHist[i] * scale, 2, rHist[i] * scale);
        histCtx.fillStyle = '#00ff00';
        histCtx.fillRect(i * 2, 200 - gHist[i] * scale, 2, gHist[i] * scale);
        histCtx.fillStyle = '#0000ff';
        histCtx.fillRect(i * 2, 200 - bHist[i] * scale, 2, bHist[i] * scale);
    }
    histCtx.globalAlpha = 1;
}
