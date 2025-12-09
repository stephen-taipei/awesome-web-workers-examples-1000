const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const ratioSelect = document.getElementById('ratioSelect');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const cropInfo = document.getElementById('cropInfo');
const resultSection = document.getElementById('resultSection');
const processingTimeDisplay = document.getElementById('processingTime');

let originalImage = null;
let worker = new Worker('worker.js');

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#10b981';
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = 'rgba(16,185,129,0.5)';
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

processBtn.addEventListener('click', () => {
    if (!originalImage) return;

    const targetRatio = parseFloat(ratioSelect.value);

    // Get image data
    const ctx = originalCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    const startTime = performance.now();
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    worker.postMessage({
        imageData: imageData,
        targetRatio: targetRatio
    });

    worker.onmessage = (e) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const { x, y, width, height } = e.data;

        // Draw cropped image
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        resultCtx.drawImage(originalCanvas, x, y, width, height, 0, 0, width, height);

        // Also draw a rectangle on original canvas to show the crop area
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Update info
        cropInfo.textContent = `Crop: x=${x}, y=${y}, ${width}x${height}`;
        processingTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
        resultSection.classList.remove('hidden');

        processBtn.disabled = false;
        processBtn.textContent = 'Smart Crop';
    };
});

function handleImage(file) {
    const img = new Image();
    img.onload = () => {
        originalImage = img;

        // Resize if too big for display/processing
        let w = img.width;
        let h = img.height;
        const maxDim = 800;
        if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.floor(w * scale);
            h = Math.floor(h * scale);
        }

        originalCanvas.width = w;
        originalCanvas.height = h;
        const ctx = originalCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        processBtn.disabled = false;
        resultSection.classList.add('hidden');
        // Clear result canvas
        resultCanvas.width = 0;
        resultCanvas.height = 0;
        cropInfo.textContent = '';
    };
    img.src = URL.createObjectURL(file);
}
