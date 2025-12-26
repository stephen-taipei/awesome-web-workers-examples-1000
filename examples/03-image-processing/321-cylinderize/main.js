// Cylinderize - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const processingTimeEl = document.getElementById('processingTime');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

const strengthInput = document.getElementById('strength');
const strengthVal = document.getElementById('valStrength');
const axisSelect = document.getElementById('axis');

let originalImageData = null;
let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            const { imageData, width, height, executionTime } = e.data;
            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), width, height), 0, 0);
            processingTimeEl.textContent = `Time: ${executionTime.toFixed(2)}ms`;
            applyBtn.disabled = false;
        }
    };
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const maxD = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxD || h > maxD) {
                const r = Math.min(maxD/w, maxD/h);
                w = Math.round(w*r);
                h = Math.round(h*r);
            }

            sourceCanvas.width = w;
            sourceCanvas.height = h;
            sourceCtx.drawImage(img, 0, 0, w, h);
            originalImageData = sourceCtx.getImageData(0, 0, w, h);

            resultCanvas.width = w;
            resultCanvas.height = h;
            resultCtx.clearRect(0, 0, w, h);
            applyBtn.disabled = false;

            applyEffect();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

strengthInput.addEventListener('input', () => {
    strengthVal.textContent = strengthInput.value;
});

function applyEffect() {
    if (!originalImageData) return;
    applyBtn.disabled = true;
    processingTimeEl.textContent = 'Processing...';

    worker.postMessage({
        type: 'cylinderize',
        imageData: originalImageData,
        strength: parseFloat(strengthInput.value),
        axis: axisSelect.value
    });
}

applyBtn.addEventListener('click', applyEffect);

resetBtn.addEventListener('click', () => {
    strengthInput.value = 0.5; strengthVal.textContent = '0.5';
    axisSelect.value = 'vertical';
    if (originalImageData) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    }
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageLoad(e.target.files[0]);
});

initWorker();
