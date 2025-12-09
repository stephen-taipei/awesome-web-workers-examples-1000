const generateBtn = document.getElementById('generateBtn');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');
const widthInput = document.getElementById('width');
const widthVal = document.getElementById('widthVal');
const heightInput = document.getElementById('height');
const heightVal = document.getElementById('heightVal');
const scaleInput = document.getElementById('scale');
const scaleVal = document.getElementById('scaleVal');
const noiseTypeInput = document.getElementById('noiseType');
const processTimeDisplay = document.getElementById('processTime');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const downloadLink = document.getElementById('downloadLink');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, duration, progress } = e.data;

        if (type === 'progress') {
            const percent = Math.round(progress * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `生成中... ${percent}%`;
        } else if (type === 'result') {
            const width = parseInt(widthInput.value);
            const height = parseInt(heightInput.value);

            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.putImageData(data, 0, 0);

            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;

            progressSection.classList.add('hidden');
            generateBtn.disabled = false;
            downloadLink.href = resultCanvas.toDataURL();
            downloadLink.classList.remove('hidden');
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('生成過程中發生錯誤');
        generateBtn.disabled = false;
        progressSection.classList.add('hidden');
    };
}

widthInput.addEventListener('input', (e) => widthVal.textContent = e.target.value);
heightInput.addEventListener('input', (e) => heightVal.textContent = e.target.value);
scaleInput.addEventListener('input', (e) => scaleVal.textContent = e.target.value);

generateBtn.addEventListener('click', () => {
    generateBtn.disabled = true;
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '準備中...';

    initWorker();

    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const scale = parseInt(scaleInput.value);
    const noiseType = noiseTypeInput.value;

    worker.postMessage({
        width,
        height,
        scale,
        noiseType
    });
});
