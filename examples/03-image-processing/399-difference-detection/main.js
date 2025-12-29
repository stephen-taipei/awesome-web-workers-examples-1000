const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const processBtn = document.getElementById('processBtn');
const diffCanvas = document.getElementById('diffCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const diffCtx = diffCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const thresholdInput = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const diffCount = document.getElementById('diffCount');
const worker = new Worker('worker.js');

let image1Data = null, image2Data = null;

uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea2.addEventListener('click', () => fileInput2.click());
fileInput1.addEventListener('change', (e) => loadImage(e.target.files[0], 1));
fileInput2.addEventListener('change', (e) => loadImage(e.target.files[0], 2));
processBtn.addEventListener('click', processImages);
thresholdInput.addEventListener('input', () => thresholdValue.textContent = thresholdInput.value);

worker.onmessage = (e) => {
    diffCtx.putImageData(e.data.diffImage, 0, 0);
    resultCtx.putImageData(e.data.resultImage, 0, 0);
    diffCount.textContent = e.data.regions;
    processBtn.disabled = false;
};

function loadImage(file, num) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }

            tempCanvas.width = w;
            tempCanvas.height = h;
            tempCtx.drawImage(img, 0, 0, w, h);

            if (num === 1) {
                image1Data = tempCtx.getImageData(0, 0, w, h);
            } else {
                image2Data = tempCtx.getImageData(0, 0, w, h);
            }

            checkReady();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function checkReady() {
    processBtn.disabled = !(image1Data && image2Data);
}

function processImages() {
    processBtn.disabled = true;

    const w = Math.min(image1Data.width, image2Data.width);
    const h = Math.min(image1Data.height, image2Data.height);

    diffCanvas.width = resultCanvas.width = w;
    diffCanvas.height = resultCanvas.height = h;

    worker.postMessage({
        image1: image1Data,
        image2: image2Data,
        threshold: parseInt(thresholdInput.value)
    });
}
