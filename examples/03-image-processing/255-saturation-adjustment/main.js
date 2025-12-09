// Saturation Adjustment - Main Thread

const imageInput = document.getElementById('imageInput');
const saturationSlider = document.getElementById('saturationSlider');
const saturationValue = document.getElementById('saturationValue');
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
const saturationAppliedEl = document.getElementById('saturationApplied');
const avgSatBeforeEl = document.getElementById('avgSatBefore');
const avgSatAfterEl = document.getElementById('avgSatAfter');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const colorBarBefore = document.getElementById('colorBarBefore');
const colorBarAfter = document.getElementById('colorBarAfter');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const colorBarBeforeCtx = colorBarBefore.getContext('2d');
const colorBarAfterCtx = colorBarAfter.getContext('2d');

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
    saturationAppliedEl.textContent = `${stats.saturation}% (×${stats.satFactor.toFixed(2)})`;
    avgSatBeforeEl.textContent = `${(stats.avgSatBefore * 100).toFixed(1)}%`;
    avgSatAfterEl.textContent = `${(stats.avgSatAfter * 100).toFixed(1)}%`;

    // Draw color distribution bars
    drawColorBar(colorBarBeforeCtx, stats.hueDistBefore);
    drawColorBar(colorBarAfterCtx, stats.hueDistAfter);

    downloadBtn.disabled = false;
}

// Draw color distribution bar
function drawColorBar(ctx, hueDist) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Find max for scaling
    const maxVal = Math.max(...hueDist, 1);

    // Draw hue distribution
    for (let i = 0; i < 360; i++) {
        const x = (i / 360) * w;
        const barWidth = w / 360 + 1;
        const barHeight = (hueDist[i] / maxVal) * h;

        // Use HSL color for the bar
        ctx.fillStyle = `hsl(${i}, 80%, 50%)`;
        ctx.fillRect(x, h - barHeight, barWidth, barHeight);
    }
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

    // Apply live preview if enabled and saturation is not 100
    if (livePreview.checked && parseInt(saturationSlider.value) !== 100) {
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
        case 'colorful':
            // Create a colorful abstract image
            const colors = [
                '#ff0000', '#ff8000', '#ffff00', '#80ff00',
                '#00ff00', '#00ff80', '#00ffff', '#0080ff',
                '#0000ff', '#8000ff', '#ff00ff', '#ff0080'
            ];

            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, '#1a1a2e');
            grad.addColorStop(1, '#2d1b4e');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add colorful circles
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = colors[i % colors.length];
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    20 + Math.random() * 50,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Add some stripes
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = colors[(i * 2) % colors.length];
                ctx.fillRect(0, i * 50, canvas.width, 25);
                ctx.globalAlpha = 0.5;
            }
            ctx.globalAlpha = 1;
            break;

        case 'nature':
            // Create a nature scene
            // Sky
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
            sky.addColorStop(0, '#87ceeb');
            sky.addColorStop(1, '#e0f7fa');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

            // Sun with glow
            const sunGrad = ctx.createRadialGradient(320, 50, 0, 320, 50, 80);
            sunGrad.addColorStop(0, '#fff9c4');
            sunGrad.addColorStop(0.3, '#ffeb3b');
            sunGrad.addColorStop(1, 'rgba(255,235,59,0)');
            ctx.fillStyle = sunGrad;
            ctx.fillRect(240, 0, 160, 130);

            // Mountains
            ctx.fillStyle = '#5d8a66';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height * 0.5);
            ctx.lineTo(100, canvas.height * 0.3);
            ctx.lineTo(200, canvas.height * 0.5);
            ctx.lineTo(0, canvas.height * 0.5);
            ctx.fill();

            ctx.fillStyle = '#7cb086';
            ctx.beginPath();
            ctx.moveTo(150, canvas.height * 0.5);
            ctx.lineTo(280, canvas.height * 0.25);
            ctx.lineTo(400, canvas.height * 0.5);
            ctx.lineTo(150, canvas.height * 0.5);
            ctx.fill();

            // Green field
            const field = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
            field.addColorStop(0, '#8bc34a');
            field.addColorStop(0.5, '#7cb342');
            field.addColorStop(1, '#558b2f');
            ctx.fillStyle = field;
            ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

            // Flowers
            const flowerColors = ['#f44336', '#e91e63', '#9c27b0', '#ffeb3b', '#ff9800'];
            for (let i = 0; i < 30; i++) {
                const fx = Math.random() * canvas.width;
                const fy = canvas.height * 0.6 + Math.random() * canvas.height * 0.35;
                ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                ctx.beginPath();
                ctx.arc(fx, fy, 3 + Math.random() * 4, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 'portrait':
            // Create a portrait-style image
            // Background
            const bgGrad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, 300
            );
            bgGrad.addColorStop(0, '#4a6fa5');
            bgGrad.addColorStop(1, '#2c3e50');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Body/Shoulders
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height + 50, 150, 150, 0, Math.PI, 0);
            ctx.fill();

            // Neck
            ctx.fillStyle = '#e8beac';
            ctx.fillRect(canvas.width / 2 - 25, canvas.height * 0.55, 50, 60);

            // Face
            ctx.fillStyle = '#f5d0c5';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height * 0.4, 70, 90, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#5d4037';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height * 0.28, 80, 60, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(canvas.width / 2 - 80, canvas.height * 0.28, 30, 100);
            ctx.fillRect(canvas.width / 2 + 50, canvas.height * 0.28, 30, 100);

            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2 - 25, canvas.height * 0.38, 12, 8, 0, 0, Math.PI * 2);
            ctx.ellipse(canvas.width / 2 + 25, canvas.height * 0.38, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#4a6fa5';
            ctx.beginPath();
            ctx.arc(canvas.width / 2 - 25, canvas.height * 0.38, 5, 0, Math.PI * 2);
            ctx.arc(canvas.width / 2 + 25, canvas.height * 0.38, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(canvas.width / 2 - 25, canvas.height * 0.38, 2, 0, Math.PI * 2);
            ctx.arc(canvas.width / 2 + 25, canvas.height * 0.38, 2, 0, Math.PI * 2);
            ctx.fill();

            // Eyebrows
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 38, canvas.height * 0.34);
            ctx.quadraticCurveTo(canvas.width / 2 - 25, canvas.height * 0.32, canvas.width / 2 - 12, canvas.height * 0.34);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 + 12, canvas.height * 0.34);
            ctx.quadraticCurveTo(canvas.width / 2 + 25, canvas.height * 0.32, canvas.width / 2 + 38, canvas.height * 0.34);
            ctx.stroke();

            // Nose
            ctx.strokeStyle = '#d4a389';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height * 0.4);
            ctx.lineTo(canvas.width / 2 - 5, canvas.height * 0.48);
            ctx.stroke();

            // Mouth
            ctx.fillStyle = '#e57373';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2, canvas.height * 0.54, 20, 8, 0, 0, Math.PI);
            ctx.fill();

            // Cheeks (blush)
            ctx.fillStyle = 'rgba(244, 143, 177, 0.3)';
            ctx.beginPath();
            ctx.ellipse(canvas.width / 2 - 45, canvas.height * 0.45, 15, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(canvas.width / 2 + 45, canvas.height * 0.45, 15, 10, 0, 0, Math.PI * 2);
            ctx.fill();
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
        saturation: parseInt(saturationSlider.value)
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
    saturationSlider.value = 100;
    saturationValue.textContent = '100';

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
    link.download = 'saturation-adjusted.png';
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

saturationSlider.addEventListener('input', function() {
    saturationValue.textContent = this.value;

    if (livePreview.checked && currentImage) {
        // Debounce live preview
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(applyFilter, 150);
    }
});

document.querySelectorAll('.btn-sample').forEach(btn => {
    btn.addEventListener('click', function() {
        generateSampleImage(this.dataset.sample);
    });
});

document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', function() {
        const value = parseInt(this.dataset.value);
        saturationSlider.value = value;
        saturationValue.textContent = value;

        if (currentImage) {
            applyFilter();
        }
    });
});

applyBtn.addEventListener('click', applyFilter);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadResult);

// Initialize
reset();
