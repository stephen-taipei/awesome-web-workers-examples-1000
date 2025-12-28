const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const scaleInput = document.getElementById('scale');
const scaleValue = document.getElementById('scaleValue');
const noiseTypeInput = document.getElementById('noiseType');
const generateBtn = document.getElementById('generateBtn');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

scaleInput.addEventListener('input', () => scaleValue.textContent = scaleInput.value);
generateBtn.addEventListener('click', generate);
worker.onmessage = (e) => { resultCtx.putImageData(e.data.imageData, 0, 0); generateBtn.disabled = false; };

function generate() {
    generateBtn.disabled = true;
    const w = parseInt(widthInput.value), h = parseInt(heightInput.value);
    resultCanvas.width = w;
    resultCanvas.height = h;
    worker.postMessage({ width: w, height: h, scale: parseInt(scaleInput.value), type: noiseTypeInput.value });
}

generate();
