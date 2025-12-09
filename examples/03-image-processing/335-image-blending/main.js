const targetInput = document.getElementById('targetInput');
const sourceInput = document.getElementById('sourceInput');
const targetUpload = document.getElementById('targetUpload');
const sourceUpload = document.getElementById('sourceUpload');
const blendBtn = document.getElementById('blendBtn');
const naiveBtn = document.getElementById('naiveBtn');
const resultCanvas = document.getElementById('resultCanvas');
const statusDiv = document.getElementById('status');
const offsetXInput = document.getElementById('offsetX');
const offsetYInput = document.getElementById('offsetY');

let targetImg = null;
let sourceImg = null;
let worker = new Worker('worker.js');

function setupUpload(area, input, callback) {
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const img = new Image();
            img.onload = () => {
                callback(img);
                area.style.borderColor = '#10b981';
                area.querySelector('p').textContent = `Loaded: ${e.target.files[0].name}`;
                checkReady();
            };
            img.src = URL.createObjectURL(e.target.files[0]);
        }
    });
}

setupUpload(targetUpload, targetInput, (img) => targetImg = img);
setupUpload(sourceUpload, sourceInput, (img) => sourceImg = img);

function checkReady() {
    if (targetImg && sourceImg) {
        blendBtn.disabled = false;
        naiveBtn.disabled = false;

        // Initial preview (naive)
        drawNaive();
    }
}

function drawNaive() {
    resultCanvas.width = targetImg.width;
    resultCanvas.height = targetImg.height;
    const ctx = resultCanvas.getContext('2d');
    ctx.drawImage(targetImg, 0, 0);
    const x = parseInt(offsetXInput.value);
    const y = parseInt(offsetYInput.value);
    ctx.drawImage(sourceImg, x, y);
}

naiveBtn.addEventListener('click', () => {
    drawNaive();
    statusDiv.textContent = 'Naive paste shown.';
});

blendBtn.addEventListener('click', () => {
    statusDiv.textContent = 'Solving Poisson equation... (this may take a while)';
    blendBtn.disabled = true;

    // Get Data
    const c1 = document.createElement('canvas');
    c1.width = targetImg.width;
    c1.height = targetImg.height;
    c1.getContext('2d').drawImage(targetImg, 0, 0);
    const targetData = c1.getContext('2d').getImageData(0, 0, c1.width, c1.height);

    const c2 = document.createElement('canvas');
    c2.width = sourceImg.width;
    c2.height = sourceImg.height;
    c2.getContext('2d').drawImage(sourceImg, 0, 0);
    const sourceData = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height);

    worker.postMessage({
        target: targetData,
        source: sourceData,
        offsetX: parseInt(offsetXInput.value),
        offsetY: parseInt(offsetYInput.value)
    });
});

worker.onmessage = (e) => {
    const { type, imageData, iteration, error } = e.data;

    if (type === 'progress') {
        statusDiv.textContent = `Solving... Iteration ${iteration}, Error: ${error.toFixed(2)}`;
        // Update canvas
        const ctx = resultCanvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
    } else if (type === 'done') {
        statusDiv.textContent = 'Done!';
        blendBtn.disabled = false;
        const ctx = resultCanvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);
    }
};
