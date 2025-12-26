// main.js

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const originalCanvas = document.getElementById('originalCanvas');
const originalCtx = originalCanvas.getContext('2d');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');
const iterationsDisplay = document.getElementById('iterations');
const originalInfo = document.getElementById('originalInfo');
const paletteContainer = document.getElementById('paletteContainer');
const colorChartCanvas = document.getElementById('colorChart');

const kSizeInput = document.getElementById('kSize');
const kSizeVal = document.getElementById('kSizeVal');

let worker;
let originalImageData = null;

kSizeInput.addEventListener('input', (e) => {
    kSizeVal.textContent = e.target.value;
});

// Initialize Worker
if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data}%`;
            progressText.textContent = `Processing... ${Math.round(data)}%`;
        } else if (type === 'result') {
            const { clusters, time, iterations } = data;

            displayPalette(clusters);
            drawChart(clusters);

            processingTimeDisplay.textContent = `${time.toFixed(2)} ms`;
            iterationsDisplay.textContent = iterations;

            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', startProcessing);
resetBtn.addEventListener('click', reset);

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const maxWidth = 800; // Limit size for performance
            const maxHeight = 600;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            originalCtx.drawImage(img, 0, 0, width, height);

            originalImageData = originalCtx.getImageData(0, 0, width, height);
            originalInfo.textContent = `${width} x ${height}`;

            processBtn.disabled = false;
            resultContainer.classList.add('hidden');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startProcessing() {
    if (!originalImageData || !worker) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing K-Means...';

    const k = parseInt(kSizeInput.value);

    worker.postMessage({
        imageData: originalImageData,
        k: k
    });
}

function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalInfo.textContent = 'No image loaded';
    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    fileInput.value = '';
    originalImageData = null;
}

function displayPalette(clusters) {
    paletteContainer.innerHTML = '';
    const totalPoints = clusters.reduce((sum, c) => sum + c.count, 0);

    clusters.sort((a, b) => b.count - a.count); // Sort by prevalence

    clusters.forEach(cluster => {
        const r = Math.round(cluster.r);
        const g = Math.round(cluster.g);
        const b = Math.round(cluster.b);
        const hex = rgbToHex(r, g, b);
        const percentage = ((cluster.count / totalPoints) * 100).toFixed(1);

        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = `rgb(${r},${g},${b})`;
        swatch.innerHTML = `
            <span class="swatch-hex">${hex}</span>
            <span class="swatch-pct">${percentage}%</span>
        `;
        // Ensure text is readable
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        swatch.style.color = brightness > 125 ? 'black' : 'white';
        swatch.style.textShadow = brightness > 125 ? 'none' : '0 1px 2px rgba(0,0,0,0.8)';

        swatch.title = `RGB(${r}, ${g}, ${b})\nCount: ${cluster.count}`;
        paletteContainer.appendChild(swatch);
    });
}

function drawChart(clusters) {
    // Basic bar chart implementation on canvas
    const ctx = colorChartCanvas.getContext('2d');
    const width = colorChartCanvas.width = colorChartCanvas.parentElement.clientWidth;
    const height = colorChartCanvas.height = colorChartCanvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, width, height);

    const totalPoints = clusters.reduce((sum, c) => sum + c.count, 0);
    const maxCount = clusters[0].count; // clusters are sorted

    const barWidth = (width / clusters.length) * 0.8;
    const spacing = (width / clusters.length) * 0.2;
    const maxBarHeight = height * 0.8;

    clusters.forEach((cluster, i) => {
        const h = (cluster.count / maxCount) * maxBarHeight;
        const x = i * (barWidth + spacing) + spacing / 2;
        const y = height - h - 20;

        const r = Math.round(cluster.r);
        const g = Math.round(cluster.g);
        const b = Math.round(cluster.b);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, barWidth, h);

        // Label
        ctx.fillStyle = '#ccc';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const pct = ((cluster.count / totalPoints) * 100).toFixed(1) + '%';
        ctx.fillText(pct, x + barWidth/2, height - 5);
    });
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
