const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const processBtn = document.getElementById('processBtn');
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const diffCanvas = document.getElementById('diffCanvas');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');
const diffCtx = diffCanvas.getContext('2d');
const ssimEl = document.getElementById('ssim');
const psnrEl = document.getElementById('psnr');
const worker = new Worker('worker.js');

let image1Loaded = false, image2Loaded = false;

uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea2.addEventListener('click', () => fileInput2.click());
fileInput1.addEventListener('change', (e) => loadImage(e.target.files[0], 1));
fileInput2.addEventListener('change', (e) => loadImage(e.target.files[0], 2));
processBtn.addEventListener('click', processImages);

worker.onmessage = (e) => {
    diffCtx.putImageData(e.data.diffImage, 0, 0);
    ssimEl.textContent = e.data.ssim.toFixed(4);
    psnrEl.textContent = e.data.psnr.toFixed(2);
    processBtn.disabled = false;
};

function loadImage(file, num) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 300) { h = h * 300 / w; w = 300; }

            if (num === 1) {
                canvas1.width = w;
                canvas1.height = h;
                ctx1.drawImage(img, 0, 0, w, h);
                image1Loaded = true;
            } else {
                canvas2.width = w;
                canvas2.height = h;
                ctx2.drawImage(img, 0, 0, w, h);
                image2Loaded = true;
            }

            checkReady();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function checkReady() {
    processBtn.disabled = !(image1Loaded && image2Loaded);
}

function processImages() {
    processBtn.disabled = true;

    // Resize to same dimensions
    const w = Math.min(canvas1.width, canvas2.width);
    const h = Math.min(canvas1.height, canvas2.height);

    diffCanvas.width = w;
    diffCanvas.height = h;

    const img1Data = ctx1.getImageData(0, 0, w, h);
    const img2Data = ctx2.getImageData(0, 0, w, h);

    worker.postMessage({ image1: img1Data, image2: img2Data });
}
