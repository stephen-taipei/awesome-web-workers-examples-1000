// Brightness Adjustment - Main Thread

const imageInput = document.getElementById('imageInput');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
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
const brightnessAppliedEl = document.getElementById('brightnessApplied');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const histogramCtx = histogramCanvas.getContext('2d');

let worker = null;
let currentImage = null;
let previewTimeout = null;

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
    brightnessAppliedEl.textContent = stats.brightness > 0 ? `+${stats.brightness}` : stats.brightness;

    // Draw histogram
    drawHistogram(stats.histogramBefore, stats.histogramAfter);

    downloadBtn.disabled = false;
}

// Draw histogram comparison
function drawHistogram(before, after) {
    const w = histogramCanvas.width;
    const h = histogramCanvas.height;

    histogramCtx.fillStyle = '#1a1a2e';
    histogramCtx.fillRect(0, 0, w, h);

    // Find max value for scaling
    const maxVal = Math.max(...before, ...after);

    // Draw before histogram (blue)
    histogramCtx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    for (let i = 0; i < 256; i++) {
        const barHeight = (before[i] / maxVal) * (h - 20);
        histogramCtx.fillRect(i * 2, h - 10 - barHeight, 2, barHeight);
    }

    // Draw after histogram (yellow)
    histogramCtx.fillStyle = 'rgba(250, 204, 21, 0.7)';
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
    histogramCtx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    histogramCtx.fillRect(10, 5, 15, 10);
    histogramCtx.fillStyle = '#94a3b8';
    histogramCtx.textAlign = 'left';
    histogramCtx.fillText('Before', 30, 14);

    histogramCtx.fillStyle = 'rgba(250, 204, 21, 0.8)';
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
    if (livePreview.checked && parseInt(brightnessSlider.value) !== 0) {
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
        case 'gradient':
            // Create grayscale gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(1, '#ffffff');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add color bars
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const barHeight = 40;
            colors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(0, canvas.height - barHeight * (i + 1), canvas.width, barHeight);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = gradient;
                ctx.fillRect(0, canvas.height - barHeight * (i + 1), canvas.width, barHeight);
                ctx.globalAlpha = 1;
            });
            break;

        case 'portrait':
            // Create a simple face portrait
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Face
            ctx.fillStyle = '#f5deb3';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2, 80, 100, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#4a3728';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height / 2 - 60, 90, 50, 0, Math.PI, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2 - 30, canvas.height / 2 - 10, 15, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(canvas.width / 2 + 30, canvas.height / 2 - 10, 15, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(canvas.width / 2 - 30, canvas.height / 2 - 10, 6, 0, Math.PI * 2);
            ctx.arc(canvas.width / 2 + 30, canvas.height / 2 - 10, 6, 0, Math.PI * 2);
            ctx.fill();

            // Nose
            ctx.strokeStyle = '#d4a574';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            ctx.lineTo(canvas.width / 2 - 5, canvas.height / 2 + 20);
            ctx.stroke();

            // Mouth
            ctx.strokeStyle = '#c9836c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2 + 30, 20, 0.2, Math.PI - 0.2);
            ctx.stroke();
            break;

        case 'night':
            // Create night scene (dark image)
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Stars
            for (let i = 0; i < 100; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height * 0.6;
                const size = Math.random() * 2;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Moon
            ctx.fillStyle = '#f5f5dc';
            ctx.beginPath();
            ctx.arc(canvas.width * 0.8, canvas.height * 0.2, 30, 0, Math.PI * 2);
            ctx.fill();

            // Silhouette buildings
            ctx.fillStyle = '#1a1a2e';
            for (let i = 0; i < 8; i++) {
                const bw = 40 + Math.random() * 40;
                const bh = 80 + Math.random() * 120;
                const bx = i * 55;
                ctx.fillRect(bx, canvas.height - bh, bw, bh);

                // Windows
                ctx.fillStyle = 'rgba(255, 200, 100, 0.6)';
                for (let wy = canvas.height - bh + 10; wy < canvas.height - 10; wy += 20) {
                    for (let wx = bx + 5; wx < bx + bw - 10; wx += 15) {
                        if (Math.random() > 0.3) {
                            ctx.fillRect(wx, wy, 8, 12);
                        }
                    }
                }
                ctx.fillStyle = '#1a1a2e';
            }
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
        brightness: parseInt(brightnessSlider.value)
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
    brightnessSlider.value = 0;
    brightnessValue.textContent = '0';

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    // Clear canvases
    originalCanvas.width = 400;
    originalCanvas.height = 300;
    resultCanvas.width = 400;
    resultCanvas.height = 300;

    originalCtx.fillStyle = '#1a1a2e';
    originalCtx.fillRect(0, 0, 400, 300);
    originalCtx.fillStyle = '#64748b';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Load an image to begin', 200, 150);

    resultCtx.fillStyle = '#1a1a2e';
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
    link.download = 'brightness-adjusted.png';
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

brightnessSlider.addEventListener('input', function() {
    brightnessValue.textContent = this.value;

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
