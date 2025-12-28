const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const blendModeInput = document.getElementById('blendMode');
const ratioInput = document.getElementById('ratio');
const ratioValue = document.getElementById('ratioValue');
const processBtn = document.getElementById('processBtn');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

let image1Data = null, image2Data = null;

uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea2.addEventListener('click', () => fileInput2.click());
fileInput1.addEventListener('change', (e) => loadImage(e.target.files[0], 1));
fileInput2.addEventListener('change', (e) => loadImage(e.target.files[0], 2));
ratioInput.addEventListener('input', () => ratioValue.textContent = ratioInput.value);
processBtn.addEventListener('click', processImages);
worker.onmessage = (e) => { resultCtx.putImageData(e.data.imageData, 0, 0); processBtn.disabled = false; };

function loadImage(file, num) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            if (num === 1) {
                image1Data = ctx.getImageData(0, 0, w, h);
                resultCanvas.width = w; resultCanvas.height = h;
            } else {
                image2Data = ctx.getImageData(0, 0, w, h);
            }
            processBtn.disabled = !(image1Data && image2Data);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImages() {
    processBtn.disabled = true;
    worker.postMessage({
        image1: image1Data,
        image2: image2Data,
        blendMode: blendModeInput.value,
        ratio: parseFloat(ratioInput.value)
    });
}
