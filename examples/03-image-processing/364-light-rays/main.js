const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const targetCtx = targetCanvas.getContext('2d');
const lightSourceOverlay = document.getElementById('lightSourceOverlay');
const lightMarker = document.getElementById('lightMarker');

// Controls
const intensitySlider = document.getElementById('intensity');
const decaySlider = document.getElementById('decay');
const densitySlider = document.getElementById('density');
const weightSlider = document.getElementById('weight');
const thresholdSlider = document.getElementById('threshold');

// Values display
const intensityVal = document.getElementById('intensityVal');
const decayVal = document.getElementById('decayVal');
const densityVal = document.getElementById('densityVal');
const weightVal = document.getElementById('weightVal');
const thresholdVal = document.getElementById('thresholdVal');

let worker;
let originalImageData = null;
let lightPos = { x: 0.5, y: 0.5 }; // Normalized coordinates (0-1)

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

    // Convert normalized light position to pixels
    const lightX = lightPos.x * width;
    const lightY = lightPos.y * height;

    const params = {
        intensity: parseInt(intensitySlider.value) / 100,
        decay: parseInt(decaySlider.value) / 100,
        density: parseInt(densitySlider.value) / 100,
        weight: parseInt(weightSlider.value) / 100,
        threshold: parseInt(thresholdSlider.value),
        lightX,
        lightY
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

// Event Listeners for Sliders
intensitySlider.oninput = () => { updateVal(intensitySlider, intensityVal, 100); processImage(); };
decaySlider.oninput = () => { updateVal(decaySlider, decayVal, 100); processImage(); };
densitySlider.oninput = () => { updateVal(densitySlider, densityVal, 100); processImage(); };
weightSlider.oninput = () => { updateVal(weightSlider, weightVal, 100); processImage(); };
thresholdSlider.oninput = () => { updateVal(thresholdSlider, thresholdVal, 1); processImage(); };

// Light source picking
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

// File Upload Handling
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Resize if too large for performance
            let w = img.width;
            let h = img.height;
            const MAX_SIZE = 1200;
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

            // Set default light pos to center
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

// Initialize
initWorker();
updateVal(intensitySlider, intensityVal, 100);
updateVal(decaySlider, decayVal, 100);
updateVal(densitySlider, densityVal, 100);
updateVal(weightSlider, weightVal, 100);
updateVal(thresholdSlider, thresholdVal, 1);
