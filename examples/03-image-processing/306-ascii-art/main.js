const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const resInput = document.getElementById('resolution');
const resValue = document.getElementById('resValue');
const processBtn = document.getElementById('processBtn');
const asciiOutput = document.getElementById('asciiOutput');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const ctx = hiddenCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
resInput.addEventListener('input', () => resValue.textContent = resInput.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => { asciiOutput.textContent = e.data.ascii; processBtn.disabled = false; };

let currentImg = null;

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImg = img;
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    if (!currentImg) return;
    processBtn.disabled = true;
    const cols = parseInt(resInput.value);
    const ratio = currentImg.height / currentImg.width;
    const rows = Math.floor(cols * ratio * 0.5);
    hiddenCanvas.width = cols;
    hiddenCanvas.height = rows;
    ctx.drawImage(currentImg, 0, 0, cols, rows);
    worker.postMessage({ imageData: ctx.getImageData(0, 0, cols, rows) });
}
