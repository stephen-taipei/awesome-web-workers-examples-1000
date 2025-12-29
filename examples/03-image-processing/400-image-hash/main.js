const uploadArea1 = document.getElementById('uploadArea1');
const uploadArea2 = document.getElementById('uploadArea2');
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const processBtn = document.getElementById('processBtn');
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');
const hash1El = document.getElementById('hash1');
const hash2El = document.getElementById('hash2');
const similarityDiv = document.getElementById('similarity');
const similarityValue = document.getElementById('similarityValue');
const hammingDistance = document.getElementById('hammingDistance');
const worker = new Worker('worker.js');

let image1Data = null, image2Data = null;
let hash1 = null, hash2 = null;
let pendingImages = 0;

uploadArea1.addEventListener('click', () => fileInput1.click());
uploadArea2.addEventListener('click', () => fileInput2.click());
fileInput1.addEventListener('change', (e) => loadImage(e.target.files[0], 1));
fileInput2.addEventListener('change', (e) => loadImage(e.target.files[0], 2));
processBtn.addEventListener('click', processImages);

worker.onmessage = (e) => {
    if (e.data.imageNum === 1) {
        hash1 = e.data.hash;
        hash1El.textContent = hash1;
    } else {
        hash2 = e.data.hash;
        hash2El.textContent = hash2;
    }

    pendingImages--;
    if (pendingImages === 0) {
        // Calculate similarity
        const hamming = hammingDistanceCalc(hash1, hash2);
        const similarity = ((64 - hamming) / 64 * 100).toFixed(1);

        hammingDistance.textContent = hamming;
        similarityValue.textContent = similarity;

        similarityDiv.style.display = 'block';
        similarityDiv.className = 'similarity ' +
            (similarity >= 80 ? 'high' : similarity >= 50 ? 'medium' : 'low');

        processBtn.disabled = false;
    }
};

function loadImage(file, num) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = num === 1 ? canvas1 : canvas2;
            const ctx = num === 1 ? ctx1 : ctx2;

            let w = img.width, h = img.height;
            if (w > 300) { h = h * 300 / w; w = 300; }

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            if (num === 1) {
                image1Data = ctx.getImageData(0, 0, w, h);
            } else {
                image2Data = ctx.getImageData(0, 0, w, h);
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
    pendingImages = 2;
    similarityDiv.style.display = 'none';

    worker.postMessage({ imageData: image1Data, imageNum: 1 });
    worker.postMessage({ imageData: image2Data, imageNum: 2 });
}

function hammingDistanceCalc(h1, h2) {
    let distance = 0;
    for (let i = 0; i < h1.length; i++) {
        if (h1[i] !== h2[i]) distance++;
    }
    return distance;
}
