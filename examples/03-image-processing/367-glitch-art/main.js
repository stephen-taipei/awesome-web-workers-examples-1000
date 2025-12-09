const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const sourceCanvas = document.getElementById('sourceCanvas');
const targetCanvas = document.getElementById('targetCanvas');
const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const targetCtx = targetCanvas.getContext('2d');

const intensitySlider = document.getElementById('intensity');
const seedSlider = document.getElementById('seed');
const randomizeBtn = document.getElementById('randomizeBtn');

const intensityVal = document.getElementById('intensityVal');
const seedVal = document.getElementById('seedVal');

let worker;
let originalImageData = null;

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

    const params = {
        intensity: parseInt(intensitySlider.value),
        seed: parseInt(seedSlider.value)
    };

    document.getElementById('targetInfo').textContent = '處理中...';

    worker.postMessage({
        imageData: originalImageData,
        params: params
    });
}

function updateVal(slider, display) {
    display.textContent = slider.value;
}

intensitySlider.oninput = () => { updateVal(intensitySlider, intensityVal); processImage(); };
seedSlider.oninput = () => { updateVal(seedSlider, seedVal); processImage(); };

randomizeBtn.onclick = () => {
    const val = Math.floor(Math.random() * 1000);
    seedSlider.value = val;
    updateVal(seedSlider, seedVal);
    processImage();
};

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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
