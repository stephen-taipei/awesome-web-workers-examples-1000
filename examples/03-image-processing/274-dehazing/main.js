const imageInput = document.getElementById('imageInput');
const patchSizeSlider = document.getElementById('patchSize');
const patchSizeVal = document.getElementById('patchSizeVal');
const omegaSlider = document.getElementById('omega');
const omegaVal = document.getElementById('omegaVal');
const t0Slider = document.getElementById('t0');
const t0Val = document.getElementById('t0Val');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('statusText');
const timeValEl = document.getElementById('timeVal');
const atmLight = document.getElementById('atmLight');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const darkChannelCanvas = document.getElementById('darkChannelCanvas');
const transmissionCanvas = document.getElementById('transmissionCanvas');

const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const darkCtx = darkChannelCanvas.getContext('2d');
const transCtx = transmissionCanvas.getContext('2d');

let worker;
let originalImageData = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValEl.textContent = `${data.duration}ms`;
            atmLight.textContent = `RGB(${data.atmosphericLight.join(', ')})`;

            // Display result
            const resultData = new ImageData(
                new Uint8ClampedArray(data.imageData),
                data.width,
                data.height
            );
            resultCtx.putImageData(resultData, 0, 0);

            // Display dark channel
            displayGrayscale(darkCtx, data.darkChannel, data.width, data.height);

            // Display transmission map
            displayGrayscale(transCtx, data.transmission, data.width, data.height);

            applyBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            applyBtn.disabled = false;
        }
    };
}

function displayGrayscale(ctx, data, width, height) {
    const canvas = ctx.canvas;
    canvas.width = width;
    canvas.height = height;

    const floatArray = new Float32Array(data);
    const imageData = ctx.createImageData(width, height);

    for (let i = 0; i < floatArray.length; i++) {
        const val = Math.round(floatArray[i] * 255);
        imageData.data[i * 4] = val;
        imageData.data[i * 4 + 1] = val;
        imageData.data[i * 4 + 2] = val;
        imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
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

        applyBtn.disabled = false;
        resetBtn.disabled = false;
    };
    img.src = URL.createObjectURL(file);
});

patchSizeSlider.addEventListener('input', () => {
    patchSizeVal.textContent = `${patchSizeSlider.value}px`;
});

omegaSlider.addEventListener('input', () => {
    omegaVal.textContent = `${omegaSlider.value}%`;
});

t0Slider.addEventListener('input', () => {
    t0Val.textContent = (t0Slider.value / 100).toFixed(2);
});

applyBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    if (!worker) initWorker();

    applyBtn.disabled = true;
    statusText.textContent = 'Processing...';
    timeValEl.textContent = '-';
    atmLight.textContent = '-';

    const dataBuffer = originalImageData.data.buffer.slice(0);

    worker.postMessage({
        command: 'dehaze',
        imageData: dataBuffer,
        width: originalImageData.width,
        height: originalImageData.height,
        patchSize: parseInt(patchSizeSlider.value),
        omega: omegaSlider.value / 100,
        t0: t0Slider.value / 100
    }, [dataBuffer]);
});

resetBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    resultCtx.putImageData(originalImageData, 0, 0);
    statusText.textContent = 'Reset';
});

initWorker();
