// Invert Color Filter - Main Thread

const imageInput = document.getElementById('imageInput');
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
const throughputEl = document.getElementById('throughput');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker = null;
let currentImage = null;

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
    throughputEl.textContent = `${Number(stats.throughput).toLocaleString()} px/s`;

    downloadBtn.disabled = false;
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

    // Clear result canvas
    resultCtx.fillStyle = '#1a1a2e';
    resultCtx.fillRect(0, 0, width, height);
    resultCtx.fillStyle = '#4a7a5a';
    resultCtx.font = '14px sans-serif';
    resultCtx.textAlign = 'center';
    resultCtx.fillText('Click "Apply Invert Filter"', width / 2, height / 2);

    applyBtn.disabled = false;
    downloadBtn.disabled = true;
    resultContainer.classList.add('hidden');
}

// Generate sample images
function generateSampleImage(type) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    switch (type) {
        case 'gradient':
            // Create colorful gradient
            const gradientH = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradientH.addColorStop(0, '#ff0000');
            gradientH.addColorStop(0.17, '#ff8000');
            gradientH.addColorStop(0.33, '#ffff00');
            gradientH.addColorStop(0.5, '#00ff00');
            gradientH.addColorStop(0.67, '#00ffff');
            gradientH.addColorStop(0.83, '#0000ff');
            gradientH.addColorStop(1, '#ff00ff');
            ctx.fillStyle = gradientH;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add vertical gradient overlay
            const gradientV = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradientV.addColorStop(0, 'rgba(255,255,255,0.5)');
            gradientV.addColorStop(0.5, 'rgba(255,255,255,0)');
            gradientV.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = gradientV;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        case 'pattern':
            // Create checkerboard pattern
            const size = 30;
            for (let y = 0; y < canvas.height; y += size) {
                for (let x = 0; x < canvas.width; x += size) {
                    const isEven = ((x / size) + (y / size)) % 2 === 0;
                    ctx.fillStyle = isEven ? '#e74c3c' : '#3498db';
                    ctx.fillRect(x, y, size, size);
                }
            }
            // Add circles
            for (let i = 0; i < 10; i++) {
                ctx.fillStyle = `hsl(${i * 36}, 70%, 50%)`;
                ctx.beginPath();
                ctx.arc(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    20 + Math.random() * 30,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
            break;

        case 'landscape':
            // Sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
            sky.addColorStop(0, '#1e90ff');
            sky.addColorStop(1, '#87ceeb');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

            // Sun
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(canvas.width * 0.8, canvas.height * 0.2, 40, 0, Math.PI * 2);
            ctx.fill();

            // Mountains
            ctx.fillStyle = '#228b22';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height * 0.6);
            ctx.lineTo(canvas.width * 0.3, canvas.height * 0.3);
            ctx.lineTo(canvas.width * 0.5, canvas.height * 0.5);
            ctx.lineTo(canvas.width * 0.7, canvas.height * 0.25);
            ctx.lineTo(canvas.width, canvas.height * 0.55);
            ctx.lineTo(canvas.width, canvas.height * 0.6);
            ctx.closePath();
            ctx.fill();

            // Ground
            const ground = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
            ground.addColorStop(0, '#228b22');
            ground.addColorStop(1, '#006400');
            ctx.fillStyle = ground;
            ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
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
        height: originalCanvas.height
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

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    // Clear canvases
    originalCanvas.width = 400;
    originalCanvas.height = 300;
    resultCanvas.width = 400;
    resultCanvas.height = 300;

    originalCtx.fillStyle = '#1a1a2e';
    originalCtx.fillRect(0, 0, 400, 300);
    originalCtx.fillStyle = '#4a7a5a';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Load an image to begin', 200, 150);

    resultCtx.fillStyle = '#1a1a2e';
    resultCtx.fillRect(0, 0, 400, 300);
    resultCtx.fillStyle = '#4a7a5a';
    resultCtx.font = '14px sans-serif';
    resultCtx.textAlign = 'center';
    resultCtx.fillText('Result will appear here', 200, 150);

    imageInput.value = '';
}

// Download result
function downloadResult() {
    const link = document.createElement('a');
    link.download = 'inverted-image.png';
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
