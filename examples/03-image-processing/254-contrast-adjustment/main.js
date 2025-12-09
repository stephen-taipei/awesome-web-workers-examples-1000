// Contrast Adjustment - Main Thread

const imageInput = document.getElementById('imageInput');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValue = document.getElementById('contrastValue');
const factorValue = document.getElementById('factorValue');
const livePreview = document.getElementById('livePreview');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const imageSizeEl = document.getElementById('imageSize');
const totalPixelsEl = document.getElementById('totalPixels');
const processingTimeEl = document.getElementById('processingTime');
const contrastAppliedEl = document.getElementById('contrastApplied');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const histogramCtx = histogramCanvas.getContext('2d');

let worker = null;
let currentImage = null;
let previewTimeout = null;

// Calculate contrast factor for display
function calculateFactor(contrast) {
    return (259 * (contrast + 255)) / (255 * (259 - contrast));
}

// Initialize worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'progress') {
            updateProgress(data.progress);
        } else if (data.type === 'result') {
            showResult(data);
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        progressContainer.classList.add('hidden');
        alert('Processing error occurred');
    };
}

// Update progress bar
function updateProgress(progress) {
    progressBar.style.width = progress + '%';
    progressText.textContent = `Processing... ${progress}%`;
}

// Show results
function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    // Draw result to canvas
    const imageData = new ImageData(
        new Uint8ClampedArray(data.imageData.data),
        data.imageData.width,
        data.imageData.height
    );
    resultCtx.putImageData(imageData, 0, 0);

    // Display stats
    const stats = data.stats;
    imageSizeEl.textContent = `${stats.width} x ${stats.height}`;
    totalPixelsEl.textContent = stats.totalPixels.toLocaleString();
    processingTimeEl.textContent = `${stats.processingTime.toFixed(2)} ms`;
    contrastAppliedEl.textContent = `${stats.contrast > 0 ? '+' : ''}${stats.contrast} (×${stats.factor.toFixed(2)})`;

    // Draw histogram
    drawHistogram(stats.histogramBefore, stats.histogramAfter);

    downloadBtn.disabled = false;
}

// Draw histogram comparison
function drawHistogram(before, after) {
    const w = histogramCanvas.width;
    const h = histogramCanvas.height;

    histogramCtx.fillStyle = '#1a2332';
    histogramCtx.fillRect(0, 0, w, h);

    // Find max value for scaling
    const maxVal = Math.max(...before, ...after);

    // Draw before histogram (cyan)
    histogramCtx.fillStyle = 'rgba(34, 211, 238, 0.5)';
    for (let i = 0; i < 256; i++) {
        const barHeight = (before[i] / maxVal) * (h - 20);
        histogramCtx.fillRect(i * 2, h - 10 - barHeight, 2, barHeight);
    }

    // Draw after histogram (orange)
    histogramCtx.fillStyle = 'rgba(251, 146, 60, 0.7)';
    for (let i = 0; i < 256; i++) {
        const barHeight = (after[i] / maxVal) * (h - 20);
        histogramCtx.fillRect(i * 2, h - 10 - barHeight, 2, barHeight);
    }

    // Draw x-axis labels
    histogramCtx.fillStyle = '#94a3b8';
    histogramCtx.font = '10px sans-serif';
    histogramCtx.textAlign = 'center';
    histogramCtx.fillText('0', 10, h - 2);
    histogramCtx.fillText('128', 256, h - 2);
    histogramCtx.fillText('255', 502, h - 2);

    // Legend
    histogramCtx.fillStyle = 'rgba(34, 211, 238, 0.8)';
    histogramCtx.fillRect(10, 5, 15, 10);
    histogramCtx.fillStyle = '#94a3b8';
    histogramCtx.textAlign = 'left';
    histogramCtx.fillText('Before', 30, 14);

    histogramCtx.fillStyle = 'rgba(251, 146, 60, 0.8)';
    histogramCtx.fillRect(90, 5, 15, 10);
    histogramCtx.fillStyle = '#94a3b8';
    histogramCtx.fillText('After', 110, 14);
}

// Load image to canvas
function loadImage(img) {
    currentImage = img;

    // Resize canvas to match image (max 800px)
    const maxSize = 800;
    let width = img.width;
    let height = img.height;

    if (width > maxSize || height > maxSize) {
        if (width > height) {
            height = Math.round(height * maxSize / width);
            width = maxSize;
        } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
        }
    }

    originalCanvas.width = width;
    originalCanvas.height = height;
    resultCanvas.width = width;
    resultCanvas.height = height;

    // Draw original image
    originalCtx.drawImage(img, 0, 0, width, height);

    // Copy to result canvas initially
    resultCtx.drawImage(img, 0, 0, width, height);

    applyBtn.disabled = false;
    downloadBtn.disabled = true;
    resultContainer.classList.add('hidden');

    // Apply live preview if enabled
    if (livePreview.checked && parseInt(contrastSlider.value) !== 0) {
        applyFilter();
    }
}

// Generate sample images
function generateSampleImage(type) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    switch (type) {
        case 'lowcontrast':
            // Create a low contrast grayscale image
            ctx.fillStyle = '#808080';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add subtle variations
            for (let y = 0; y < canvas.height; y += 20) {
                for (let x = 0; x < canvas.width; x += 20) {
                    const gray = 100 + Math.random() * 56; // 100-156 range (low contrast)
                    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                    ctx.fillRect(x, y, 20, 20);
                }
            }

            // Add some shapes with low contrast
            for (let i = 0; i < 5; i++) {
                const gray = 90 + Math.random() * 76;
                ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                ctx.beginPath();
                ctx.arc(
                    50 + Math.random() * 300,
                    50 + Math.random() * 200,
                    20 + Math.random() * 30,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
            break;

        case 'photo':
            // Create a simulated photo scene
            // Sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
            sky.addColorStop(0, '#4a90d9');
            sky.addColorStop(1, '#87ceeb');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);

            // Ground
            const ground = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
            ground.addColorStop(0, '#7cba5f');
            ground.addColorStop(1, '#4a8532');
            ctx.fillStyle = ground;
            ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

            // Tree
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(180, canvas.height * 0.4, 40, canvas.height * 0.4);

            ctx.fillStyle = '#2e7d32';
            ctx.beginPath();
            ctx.moveTo(200, canvas.height * 0.1);
            ctx.lineTo(100, canvas.height * 0.45);
            ctx.lineTo(300, canvas.height * 0.45);
            ctx.closePath();
            ctx.fill();

            // House
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(280, canvas.height * 0.45, 100, 80);
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.moveTo(270, canvas.height * 0.45);
            ctx.lineTo(330, canvas.height * 0.3);
            ctx.lineTo(390, canvas.height * 0.45);
            ctx.closePath();
            ctx.fill();

            // Windows
            ctx.fillStyle = '#fff9c4';
            ctx.fillRect(295, canvas.height * 0.5, 25, 25);
            ctx.fillRect(340, canvas.height * 0.5, 25, 25);

            // Sun
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.arc(50, 40, 25, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'text':
            // Create an image with text (document simulation)
            ctx.fillStyle = '#f5f5f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#333333';
            ctx.font = 'bold 24px Georgia';
            ctx.textAlign = 'center';
            ctx.fillText('Sample Document', canvas.width / 2, 40);

            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            const lines = [
                'Lorem ipsum dolor sit amet, consectetur',
                'adipiscing elit. Sed do eiusmod tempor',
                'incididunt ut labore et dolore magna aliqua.',
                '',
                'Ut enim ad minim veniam, quis nostrud',
                'exercitation ullamco laboris nisi ut aliquip',
                'ex ea commodo consequat.',
                '',
                'Duis aute irure dolor in reprehenderit in',
                'voluptate velit esse cillum dolore eu',
                'fugiat nulla pariatur.'
            ];

            lines.forEach((line, i) => {
                ctx.fillText(line, 30, 80 + i * 20);
            });

            // Add a subtle watermark
            ctx.fillStyle = '#dddddd';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.3;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText('DRAFT', 0, 0);
            ctx.restore();
            ctx.globalAlpha = 1;
            break;
    }

    // Convert canvas to image
    const img = new Image();
    img.onload = function() {
        loadImage(img);
    };
    img.src = canvas.toDataURL();
}

// Apply filter
function applyFilter() {
    if (!currentImage) return;

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Processing...';
    resultContainer.classList.add('hidden');

    // Get image data from original canvas
    const imageData = originalCtx.getImageData(
        0, 0,
        originalCanvas.width,
        originalCanvas.height
    );

    // Initialize worker and send data
    initWorker();
    worker.postMessage({
        imageData: imageData,
        width: originalCanvas.width,
        height: originalCanvas.height,
        contrast: parseInt(contrastSlider.value)
    });
}

// Reset
function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    currentImage = null;
    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    contrastSlider.value = 0;
    contrastValue.textContent = '0';
    factorValue.textContent = '1.00';

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    // Clear canvases
    originalCanvas.width = 400;
    originalCanvas.height = 300;
    resultCanvas.width = 400;
    resultCanvas.height = 300;

    originalCtx.fillStyle = '#1a2332';
    originalCtx.fillRect(0, 0, 400, 300);
    originalCtx.fillStyle = '#64748b';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Load an image to begin', 200, 150);

    resultCtx.fillStyle = '#1a2332';
    resultCtx.fillRect(0, 0, 400, 300);
    resultCtx.fillStyle = '#64748b';
    resultCtx.font = '14px sans-serif';
    resultCtx.textAlign = 'center';
    resultCtx.fillText('Result will appear here', 200, 150);

    imageInput.value = '';
}

// Download result
function downloadResult() {
    const link = document.createElement('a');
    link.download = 'contrast-adjusted.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

// Event listeners
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                loadImage(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

contrastSlider.addEventListener('input', function() {
    const contrast = parseInt(this.value);
    contrastValue.textContent = contrast;
    factorValue.textContent = calculateFactor(contrast).toFixed(2);

    if (livePreview.checked && currentImage) {
        // Debounce live preview
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(applyFilter, 100);
    }
});

document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', function() {
        generateSampleImage(this.dataset.sample);
    });
});

applyBtn.addEventListener('click', applyFilter);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadResult);

// Initialize
reset();
