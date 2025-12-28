const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const processBtn = document.getElementById('processBtn');
const templateCanvas = document.getElementById('templateCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const templateCtx = templateCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const thresholdInput = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const matchScore = document.getElementById('matchScore');
const worker = new Worker('worker.js');

let mainImage = null;
let templateImage = null;

uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea2.addEventListener('click', () => fileInput2.click());
fileInput1.addEventListener('change', (e) => loadMainImage(e.target.files[0]));
fileInput2.addEventListener('change', (e) => loadTemplateImage(e.target.files[0]));
processBtn.addEventListener('click', processImage);
thresholdInput.addEventListener('input', () => thresholdValue.textContent = thresholdInput.value);

worker.onmessage = (e) => {
    resultCtx.putImageData(e.data.imageData, 0, 0);
    matchScore.textContent = e.data.score.toFixed(3);
    processBtn.disabled = false;
};

function loadMainImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            mainImage = img;
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            resultCanvas.width = w;
            resultCanvas.height = h;
            resultCtx.drawImage(img, 0, 0, w, h);
            checkReady();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadTemplateImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            templateImage = img;
            let w = img.width, h = img.height;
            if (w > 100) { h = h * 100 / w; w = 100; }
            templateCanvas.width = w;
            templateCanvas.height = h;
            templateCtx.drawImage(img, 0, 0, w, h);
            checkReady();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function checkReady() {
    processBtn.disabled = !(mainImage && templateImage);
}

function processImage() {
    processBtn.disabled = true;
    const mainData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    const templateData = templateCtx.getImageData(0, 0, templateCanvas.width, templateCanvas.height);
    worker.postMessage({
        mainImage: mainData,
        templateImage: templateData,
        threshold: parseFloat(thresholdInput.value)
    });
}
