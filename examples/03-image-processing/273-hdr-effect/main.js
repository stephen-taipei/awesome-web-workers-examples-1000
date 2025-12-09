const imageInput = document.getElementById('imageInput');
const strengthSlider = document.getElementById('strength');
const strengthVal = document.getElementById('strengthVal');
const radiusSlider = document.getElementById('radius');
const radiusVal = document.getElementById('radiusVal');
const gammaSlider = document.getElementById('gamma');
const gammaVal = document.getElementById('gammaVal');
const saturationSlider = document.getElementById('saturation');
const saturationVal = document.getElementById('saturationVal');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('statusText');
const timeValEl = document.getElementById('timeVal');
const sizeVal = document.getElementById('sizeVal');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker;
let originalImageData = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'progress') {
            statusText.textContent = `Processing: ${data}%`;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValEl.textContent = `${data.duration}ms`;

            const imageData = new ImageData(
                new Uint8ClampedArray(data.imageData),
                data.width,
                data.height
            );
            resultCtx.putImageData(imageData, 0, 0);
            applyBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            applyBtn.disabled = false;
        }
    };
}

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        const maxSize = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }

        originalCanvas.width = width;
        originalCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        originalCtx.drawImage(img, 0, 0, width, height);
        resultCtx.drawImage(img, 0, 0, width, height);

        originalImageData = originalCtx.getImageData(0, 0, width, height);

        sizeVal.textContent = `${width} x ${height}`;
        applyBtn.disabled = false;
        resetBtn.disabled = false;
    };
    img.src = URL.createObjectURL(file);
});

// Slider event listeners
strengthSlider.addEventListener('input', () => {
    strengthVal.textContent = `${strengthSlider.value}%`;
});

radiusSlider.addEventListener('input', () => {
    radiusVal.textContent = `${radiusSlider.value}px`;
});

gammaSlider.addEventListener('input', () => {
    gammaVal.textContent = (gammaSlider.value / 100).toFixed(2);
});

saturationSlider.addEventListener('input', () => {
    saturationVal.textContent = `${saturationSlider.value}%`;
});

applyBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    if (!worker) initWorker();

    applyBtn.disabled = true;
    statusText.textContent = 'Processing...';
    timeValEl.textContent = '-';

    const dataBuffer = originalImageData.data.buffer.slice(0);

    worker.postMessage({
        command: 'apply',
        imageData: dataBuffer,
        width: originalImageData.width,
        height: originalImageData.height,
        strength: strengthSlider.value / 100,
        radius: parseInt(radiusSlider.value),
        gamma: gammaSlider.value / 100,
        saturation: saturationSlider.value / 100
    }, [dataBuffer]);
});

resetBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    resultCtx.putImageData(originalImageData, 0, 0);
    statusText.textContent = 'Reset';
});

initWorker();
