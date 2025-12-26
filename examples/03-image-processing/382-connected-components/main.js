const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processTimeDisplay = document.getElementById('processTime');
const componentCountDisplay = document.getElementById('componentCount');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const sourceInfo = document.getElementById('sourceInfo');
const resultInfo = document.getElementById('resultInfo');
const thresholdInput = document.getElementById('threshold');
const connectivityInput = document.getElementById('connectivity');

let worker;
let originalImageData = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime, progress, message } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = message;
        } else if (type === 'result') {
            const { labeledData, count, colorMap } = data;
            processTimeDisplay.textContent = `${executionTime}ms`;
            componentCountDisplay.textContent = count;

            drawLabeledImage(labeledData, colorMap);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

function drawLabeledImage(labeledData, colorMap) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const imageData = resultCtx.createImageData(width, height);

    // Create actual colors from random map
    const colors = {};
    for (const label in colorMap) {
        const hash = label * 12345;
        colors[label] = {
            r: (hash & 0xFF0000) >> 16,
            g: (hash & 0x00FF00) >> 8,
            b: (hash & 0x0000FF)
        };
        // Ensure background (0) is black
        if (label === '0') colors[label] = { r: 0, g: 0, b: 0 };
    }

    for (let i = 0; i < width * height; i++) {
        const label = labeledData[i];
        if (label === 0) {
            imageData.data[i * 4] = 0;
            imageData.data[i * 4 + 1] = 0;
            imageData.data[i * 4 + 2] = 0;
            imageData.data[i * 4 + 3] = 255;
        } else {
            // Use HSL for better distinction
            // Generate deterministic color from label
            const hue = (label * 137.5) % 360;
            const sat = 70 + (label % 30);
            const light = 50 + (label % 20);

            const [r, g, b] = hslToRgb(hue / 360, sat / 100, light / 100);

            imageData.data[i * 4] = r;
            imageData.data[i * 4 + 1] = g;
            imageData.data[i * 4 + 2] = b;
            imageData.data[i * 4 + 3] = 255;
        }
    }

    resultCtx.putImageData(imageData, 0, 0);
    resultInfo.textContent = `找到 ${Object.keys(colorMap).length - 1} 個連通區域`;
}

// Helper: HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Live Binary Preview
function updateBinaryPreview() {
    if (!originalImageData) return;

    const threshold = parseInt(thresholdInput.value);
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const imgData = sourceCtx.createImageData(w, h);
    const src = originalImageData.data;
    const dest = imgData.data;

    for (let i = 0; i < src.length; i += 4) {
        const gray = src[i] * 0.299 + src[i+1] * 0.587 + src[i+2] * 0.114;
        const val = gray > threshold ? 255 : 0;
        dest[i] = dest[i+1] = dest[i+2] = val;
        dest[i+3] = 255;
    }

    sourceCtx.putImageData(imgData, 0, 0);
}

thresholdInput.addEventListener('input', updateBinaryPreview);

// Handle file upload
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        sourceCanvas.width = width;
        sourceCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        sourceCtx.drawImage(img, 0, 0, width, height);
        originalImageData = sourceCtx.getImageData(0, 0, width, height);

        updateBinaryPreview();

        sourceInfo.textContent = `${width} x ${height}`;
        resultInfo.textContent = '';
        processBtn.disabled = false;
        processTimeDisplay.textContent = '-';
        componentCountDisplay.textContent = '-';
    };
    img.src = URL.createObjectURL(file);
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    // We send the current binary preview data, not original
    const binaryData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    worker.postMessage({
        imageData: binaryData,
        connectivity: parseInt(connectivityInput.value)
    });
});

initWorker();
