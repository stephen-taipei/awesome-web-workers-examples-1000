const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const targetCtx = targetCanvas.getContext('2d');
const lightSourceOverlay = document.getElementById('lightSourceOverlay');
const lightMarker = document.getElementById('lightMarker');

// Controls
const thresholdSlider = document.getElementById('threshold');
const intensitySlider = document.getElementById('intensity');
const artifactsSlider = document.getElementById('artifacts');

// Values
const thresholdVal = document.getElementById('thresholdVal');
const intensityVal = document.getElementById('intensityVal');
const artifactsVal = document.getElementById('artifactsVal');

let worker;
let originalImageData = null;
let lightPos = { x: 0.5, y: 0.5 };

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'result') {
            targetCtx.putImageData(e.data.imageData, 0, 0);
            document.getElementById('targetInfo').textContent = `處理完成 (${e.data.time}ms)`;
        }
    };
}

function processImage() {
    if (!originalImageData) return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const params = {
        threshold: parseInt(thresholdSlider.value),
        intensity: parseInt(intensitySlider.value) / 100,
        artifacts: parseInt(artifactsSlider.value),
        lightX: lightPos.x * width,
        lightY: lightPos.y * height
    };

    document.getElementById('targetInfo').textContent = '處理中...';

    worker.postMessage({
        imageData: originalImageData,
        params: params
    });
}

function updateVal(slider, display, scale = 1) {
    display.textContent = (slider.value / scale).toFixed(scale === 1 ? 0 : 2);
}

// Sliders
thresholdSlider.oninput = () => { updateVal(thresholdSlider, thresholdVal, 1); processImage(); };
intensitySlider.oninput = () => { updateVal(intensitySlider, intensityVal, 100); processImage(); };
artifactsSlider.oninput = () => { updateVal(artifactsSlider, artifactsVal, 1); processImage(); };

// Light Source Picker
lightSourceOverlay.addEventListener('mousedown', (e) => {
    const rect = lightSourceOverlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    lightPos.x = x / rect.width;
    lightPos.y = y / rect.height;

    updateMarker();
    processImage();
});

function updateMarker() {
    lightMarker.style.display = 'block';
    lightMarker.style.left = (lightPos.x * 100) + '%';
    lightMarker.style.top = (lightPos.y * 100) + '%';
}

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
             // Resize if too large for performance
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
             targetCanvas.width = w;
             targetCanvas.height = h;

             sourceCtx.drawImage(img, 0, 0, w, h);
             originalImageData = sourceCtx.getImageData(0, 0, w, h);

             document.getElementById('sourceInfo').textContent = `尺寸: ${w}x${h}`;

             // Set default light pos to center (or brightest spot?)
             lightPos = { x: 0.5, y: 0.5 };
             updateMarker();

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
updateVal(thresholdSlider, thresholdVal, 1);
updateVal(intensitySlider, intensityVal, 100);
updateVal(artifactsSlider, artifactsVal, 1);
