const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const widthRange = document.getElementById('widthRange');
const widthVal = document.getElementById('widthVal');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const canvas = document.getElementById('canvas');
const statusDiv = document.getElementById('status');

let originalImage = null;
let currentImageData = null;
let worker = new Worker('worker.js');
let isProcessing = false;

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#10b981';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(16,185,129,0.5)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImage(file);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleImage(e.target.files[0]);
});

widthRange.addEventListener('input', (e) => {
    widthVal.textContent = e.target.value;
});

processBtn.addEventListener('click', () => {
    if (isProcessing || !originalImage) return;

    const targetScale = parseInt(widthRange.value) / 100;
    const targetW = Math.floor(originalImage.width * targetScale);
    const currentW = canvas.width;
    const seamsToRemove = currentW - targetW;

    if (seamsToRemove <= 0) return;

    isProcessing = true;
    processBtn.disabled = true;
    resetBtn.disabled = true;
    widthRange.disabled = true;
    statusDiv.textContent = `Carving... removing ${seamsToRemove} seams`;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    worker.postMessage({
        imageData: imageData,
        seamsToRemove: seamsToRemove
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImage) {
        displayImage(originalImage);
        widthRange.value = 100;
        widthVal.textContent = 100;
    }
});

worker.onmessage = (e) => {
    const { imageData, type, progress } = e.data;

    if (type === 'progress') {
        statusDiv.textContent = `Progress: ${progress.toFixed(1)}%`;
        // Optional: Update canvas on intermediate steps if desired
        if (imageData) {
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(imageData, 0, 0);
        }
    } else if (type === 'done') {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);

        isProcessing = false;
        processBtn.disabled = false;
        resetBtn.disabled = false;
        widthRange.disabled = false;
        statusDiv.textContent = `Done. New size: ${imageData.width}x${imageData.height}`;
    }
};

function handleImage(file) {
    const img = new Image();
    img.onload = () => {
        // Limit size for performance
        let w = img.width;
        let h = img.height;
        const maxDim = 600; // Seam carving is slow in JS
        if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }

        img.width = w;
        img.height = h;
        originalImage = img;
        displayImage(img);

        processBtn.disabled = false;
        resetBtn.disabled = false;
        widthRange.disabled = false;
    };
    img.src = URL.createObjectURL(file);
}

function displayImage(img) {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // If img is an Image object
    if (img instanceof Image) {
        ctx.drawImage(img, 0, 0, img.width, img.height);
    }
}
