// Grayscale Conversion - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const methodSelect = document.getElementById('methodSelect');
const customWeights = document.getElementById('customWeights');
const redWeight = document.getElementById('redWeight');
const greenWeight = document.getElementById('greenWeight');
const blueWeight = document.getElementById('blueWeight');
const redValue = document.getElementById('redValue');
const greenValue = document.getElementById('greenValue');
const blueValue = document.getElementById('blueValue');

const convertBtn = document.getElementById('convertBtn');
const compareBtn = document.getElementById('compareBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const originalCanvas = document.getElementById('originalCanvas');
const grayscaleCanvas = document.getElementById('grayscaleCanvas');
const originalCtx = originalCanvas.getContext('2d');
const grayscaleCtx = grayscaleCanvas.getContext('2d');

const originalInfo = document.getElementById('originalInfo');
const grayscaleInfo = document.getElementById('grayscaleInfo');

const resultContainer = document.getElementById('resultContainer');
const processingTimeEl = document.getElementById('processingTime');
const pixelsProcessedEl = document.getElementById('pixelsProcessed');
const throughputEl = document.getElementById('throughput');
const methodUsedEl = document.getElementById('methodUsed');
const avgBrightnessEl = document.getElementById('avgBrightness');
const contrastEl = document.getElementById('contrast');
const dynamicRangeEl = document.getElementById('dynamicRange');
const workerStatusEl = document.getElementById('workerStatus');

const histogramCanvas = document.getElementById('histogramCanvas');
const histogramCtx = histogramCanvas.getContext('2d');

const comparisonContainer = document.getElementById('comparisonContainer');
const comparisonGrid = document.getElementById('comparisonGrid');

let originalImageData = null;
let worker = null;

const methodNames = {
    luminosity: 'Luminosity (BT.709)',
    average: 'Average',
    lightness: 'Lightness',
    custom: 'Custom Weights'
};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data.percent}%`;
            progressText.textContent = `Processing: ${data.percent}%`;
        } else if (type === 'result') {
            handleResult(data);
        } else if (type === 'comparison') {
            handleComparison(data);
        }
    };

    workerStatusEl.textContent = 'Ready';
}

function handleImageLoad(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Resize if too large
            const maxSize = 1920;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            grayscaleCanvas.width = width;
            grayscaleCanvas.height = height;

            originalCtx.drawImage(img, 0, 0, width, height);
            originalImageData = originalCtx.getImageData(0, 0, width, height);

            originalInfo.textContent = `${width} × ${height} (${(width * height).toLocaleString()} pixels)`;
            grayscaleInfo.textContent = 'Ready to convert';

            convertBtn.disabled = false;
            compareBtn.disabled = false;

            // Clear grayscale canvas
            grayscaleCtx.fillStyle = '#1a1a1a';
            grayscaleCtx.fillRect(0, 0, width, height);
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

function getWeights() {
    const method = methodSelect.value;

    switch (method) {
        case 'luminosity':
            return { r: 0.2126, g: 0.7152, b: 0.0722 };
        case 'average':
            return { r: 1/3, g: 1/3, b: 1/3 };
        case 'lightness':
            return { r: 0.5, g: 0.5, b: 0.5, method: 'lightness' };
        case 'custom':
            const r = parseInt(redWeight.value);
            const g = parseInt(greenWeight.value);
            const b = parseInt(blueWeight.value);
            const total = r + g + b || 1;
            return { r: r / total, g: g / total, b: b / total };
        default:
            return { r: 0.2126, g: 0.7152, b: 0.0722 };
    }
}

function convert() {
    if (!originalImageData) return;

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    workerStatusEl.textContent = 'Processing...';

    initWorker();

    const weights = getWeights();
    const method = methodSelect.value;

    worker.postMessage({
        type: 'convert',
        imageData: originalImageData,
        weights,
        method
    });
}

function handleResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const { processedData, stats, executionTime, method } = data;

    // Display grayscale image
    const imageData = new ImageData(
        new Uint8ClampedArray(processedData),
        originalCanvas.width,
        originalCanvas.height
    );
    grayscaleCtx.putImageData(imageData, 0, 0);

    grayscaleInfo.textContent = `Converted in ${executionTime.toFixed(2)}ms`;

    // Display results
    const pixels = originalCanvas.width * originalCanvas.height;
    processingTimeEl.textContent = `${executionTime.toFixed(2)} ms`;
    pixelsProcessedEl.textContent = pixels.toLocaleString();
    throughputEl.textContent = `${(pixels / executionTime * 1000 / 1000000).toFixed(2)} MP/s`;
    methodUsedEl.textContent = methodNames[method] || method;

    avgBrightnessEl.textContent = stats.avgBrightness.toFixed(1);
    contrastEl.textContent = stats.contrast.toFixed(1);
    dynamicRangeEl.textContent = `${stats.min} - ${stats.max}`;
    workerStatusEl.textContent = 'Complete';

    // Draw histogram
    drawHistogram(stats.histogram);
}

function drawHistogram(histogram) {
    const w = histogramCanvas.width;
    const h = histogramCanvas.height;
    const padding = 30;

    histogramCtx.fillStyle = '#080f08';
    histogramCtx.fillRect(0, 0, w, h);

    if (!histogram || histogram.length === 0) return;

    const maxCount = Math.max(...histogram);
    const barWidth = (w - padding * 2) / 256;
    const scale = (h - padding * 2) / maxCount;

    // Draw bars
    for (let i = 0; i < 256; i++) {
        const barHeight = histogram[i] * scale;
        const x = padding + i * barWidth;
        const y = h - padding - barHeight;

        // Gradient from dark to light
        const brightness = Math.round(i);
        histogramCtx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        histogramCtx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
    }

    // Axes
    histogramCtx.strokeStyle = '#2a5a3a';
    histogramCtx.lineWidth = 1;
    histogramCtx.beginPath();
    histogramCtx.moveTo(padding, padding);
    histogramCtx.lineTo(padding, h - padding);
    histogramCtx.lineTo(w - padding, h - padding);
    histogramCtx.stroke();

    // Labels
    histogramCtx.fillStyle = '#4a7a5a';
    histogramCtx.font = '10px sans-serif';
    histogramCtx.textAlign = 'center';

    for (let i = 0; i <= 255; i += 64) {
        const x = padding + i * barWidth;
        histogramCtx.fillText(i.toString(), x, h - padding + 12);
    }

    histogramCtx.fillStyle = '#34d399';
    histogramCtx.fillText('Brightness Level', w / 2, h - 5);
}

function compareAllMethods() {
    if (!originalImageData) return;

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');
    progressBar.style.width = '0%';

    initWorker();

    worker.postMessage({
        type: 'compare',
        imageData: originalImageData
    });
}

function handleComparison(data) {
    progressContainer.classList.add('hidden');
    comparisonContainer.classList.remove('hidden');

    comparisonGrid.innerHTML = '';

    data.results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'comparison-item';

        const canvas = document.createElement('canvas');
        canvas.width = originalCanvas.width;
        canvas.height = originalCanvas.height;
        const ctx = canvas.getContext('2d');

        const imageData = new ImageData(
            new Uint8ClampedArray(result.processedData),
            originalCanvas.width,
            originalCanvas.height
        );
        ctx.putImageData(imageData, 0, 0);

        div.innerHTML = `
            <h4>${methodNames[result.method]}</h4>
        `;
        div.appendChild(canvas);
        div.innerHTML += `
            <div class="stats">
                Time: ${result.executionTime.toFixed(2)}ms |
                Avg: ${result.stats.avgBrightness.toFixed(0)} |
                Contrast: ${result.stats.contrast.toFixed(0)}
            </div>
        `;

        comparisonGrid.appendChild(div);
    });
}

function updateWeightDisplay() {
    const r = parseInt(redWeight.value);
    const g = parseInt(greenWeight.value);
    const b = parseInt(blueWeight.value);
    const total = r + g + b || 1;

    redValue.textContent = (r / total).toFixed(2);
    greenValue.textContent = (g / total).toFixed(2);
    blueValue.textContent = (b / total).toFixed(2);
}

function downloadGrayscale() {
    const link = document.createElement('a');
    link.download = 'grayscale-image.png';
    link.href = grayscaleCanvas.toDataURL('image/png');
    link.click();
}

function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    originalImageData = null;
    convertBtn.disabled = true;
    compareBtn.disabled = true;

    originalCanvas.width = 300;
    originalCanvas.height = 200;
    grayscaleCanvas.width = 300;
    grayscaleCanvas.height = 200;

    originalCtx.fillStyle = '#1a1a1a';
    originalCtx.fillRect(0, 0, 300, 200);
    originalCtx.fillStyle = '#4a7a5a';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Upload an image', 150, 100);

    grayscaleCtx.fillStyle = '#1a1a1a';
    grayscaleCtx.fillRect(0, 0, 300, 200);

    originalInfo.textContent = 'No image loaded';
    grayscaleInfo.textContent = '-';

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    comparisonContainer.classList.add('hidden');

    // Clear histogram
    histogramCtx.fillStyle = '#080f08';
    histogramCtx.fillRect(0, 0, histogramCanvas.width, histogramCanvas.height);
}

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleImageLoad(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageLoad(e.target.files[0]);
    }
});

methodSelect.addEventListener('change', () => {
    customWeights.classList.toggle('hidden', methodSelect.value !== 'custom');
});

redWeight.addEventListener('input', updateWeightDisplay);
greenWeight.addEventListener('input', updateWeightDisplay);
blueWeight.addEventListener('input', updateWeightDisplay);

convertBtn.addEventListener('click', convert);
compareBtn.addEventListener('click', compareAllMethods);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadGrayscale);

// Initialize
reset();
initWorker();
