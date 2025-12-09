// Instagram Filter - Main Thread

const imageInput = document.getElementById('imageInput');
const filterSelect = document.getElementById('filterSelect');
const intensityInput = document.getElementById('intensity');
const intensityValue = document.getElementById('intensityValue');
const vignetteInput = document.getElementById('vignette');
const vignetteValue = document.getElementById('vignetteValue');
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
const filterParamsEl = document.getElementById('filterParams');
const filterNameEl = document.getElementById('filterName');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker = null;
let originalImageData = null;

// Filter presets - Instagram-style filters
const filterPresets = {
    clarendon: {
        name: 'Clarendon',
        contrast: 1.2,
        brightness: 10,
        saturation: 1.35,
        tint: { r: 0, g: 0, b: 15 },
        shadows: { r: 0, g: -5, b: 10 },
        highlights: { r: 5, g: 5, b: -5 }
    },
    gingham: {
        name: 'Gingham',
        contrast: 0.95,
        brightness: 15,
        saturation: 0.8,
        tint: { r: 10, g: 10, b: 5 },
        shadows: { r: 5, g: 5, b: 0 },
        highlights: { r: 15, g: 10, b: 5 }
    },
    juno: {
        name: 'Juno',
        contrast: 1.1,
        brightness: 5,
        saturation: 1.25,
        tint: { r: 15, g: 5, b: -10 },
        shadows: { r: 5, g: 0, b: 0 },
        highlights: { r: 10, g: 10, b: -5 }
    },
    lark: {
        name: 'Lark',
        contrast: 0.9,
        brightness: 20,
        saturation: 0.85,
        tint: { r: 5, g: 10, b: 5 },
        shadows: { r: -5, g: 0, b: 5 },
        highlights: { r: 20, g: 15, b: 10 }
    },
    reyes: {
        name: 'Reyes',
        contrast: 0.85,
        brightness: 10,
        saturation: 0.75,
        tint: { r: 20, g: 15, b: 10 },
        shadows: { r: 10, g: 5, b: 0 },
        highlights: { r: 15, g: 10, b: 5 }
    },
    slumber: {
        name: 'Slumber',
        contrast: 1.05,
        brightness: -5,
        saturation: 0.65,
        tint: { r: 10, g: 5, b: 20 },
        shadows: { r: 5, g: 0, b: 15 },
        highlights: { r: 5, g: 5, b: 10 }
    },
    crema: {
        name: 'Crema',
        contrast: 0.9,
        brightness: 15,
        saturation: 0.9,
        tint: { r: 15, g: 12, b: 8 },
        shadows: { r: 5, g: 3, b: 0 },
        highlights: { r: 20, g: 15, b: 10 }
    },
    ludwig: {
        name: 'Ludwig',
        contrast: 1.05,
        brightness: 5,
        saturation: 0.95,
        tint: { r: 10, g: 5, b: 0 },
        shadows: { r: 0, g: 0, b: 5 },
        highlights: { r: 15, g: 10, b: 5 }
    },
    aden: {
        name: 'Aden',
        contrast: 0.9,
        brightness: 20,
        saturation: 0.85,
        tint: { r: 20, g: 15, b: 25 },
        shadows: { r: 10, g: 5, b: 15 },
        highlights: { r: 15, g: 10, b: 20 }
    },
    perpetua: {
        name: 'Perpetua',
        contrast: 1.0,
        brightness: 10,
        saturation: 1.1,
        tint: { r: -10, g: 10, b: 20 },
        shadows: { r: -5, g: 5, b: 15 },
        highlights: { r: 0, g: 10, b: 10 }
    }
};

// Update displays
intensityInput.addEventListener('input', function() {
    intensityValue.textContent = this.value + '%';
});

vignetteInput.addEventListener('input', function() {
    vignetteValue.textContent = this.value + '%';
});

filterSelect.addEventListener('change', function() {
    const preset = filterPresets[this.value];
    filterNameEl.textContent = preset.name + ' Result';
});

// Handle image selection
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = function() {
        // Limit size for performance
        const maxSize = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }
        }

        originalCanvas.width = width;
        originalCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        originalCtx.drawImage(img, 0, 0, width, height);
        originalImageData = originalCtx.getImageData(0, 0, width, height);

        // Clear result canvas
        resultCtx.fillStyle = '#0f070a';
        resultCtx.fillRect(0, 0, width, height);

        applyBtn.disabled = false;
        downloadBtn.disabled = true;
        resultContainer.classList.add('hidden');
    };

    img.src = URL.createObjectURL(file);
});

// Apply Instagram filter
applyBtn.addEventListener('click', function() {
    if (!originalImageData) return;

    const selectedFilter = filterSelect.value;
    const preset = filterPresets[selectedFilter];

    applyBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting...';

    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const startTime = performance.now();

    worker.onmessage = function(e) {
        const data = e.data;

        if (data.type === 'progress') {
            progressBar.style.width = data.percent + '%';
            progressText.textContent = `Applying ${preset.name}: ${data.percent}% (${data.processedPixels.toLocaleString()} / ${data.totalPixels.toLocaleString()} pixels)`;
        } else if (data.type === 'result') {
            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Display result
            const resultImageData = new ImageData(
                new Uint8ClampedArray(data.imageData),
                originalImageData.width,
                originalImageData.height
            );
            resultCtx.putImageData(resultImageData, 0, 0);

            // Show statistics
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');

            const width = originalImageData.width;
            const height = originalImageData.height;
            const totalPixels = width * height;

            imageSizeEl.textContent = `${width} x ${height}`;
            totalPixelsEl.textContent = totalPixels.toLocaleString();
            processingTimeEl.textContent = processingTime.toFixed(2) + ' ms';
            throughputEl.textContent = (totalPixels / processingTime * 1000 / 1000000).toFixed(2) + ' MP/s';

            // Display filter parameters
            filterParamsEl.innerHTML = `
                <span>Contrast: ${preset.contrast.toFixed(2)}</span>
                <span>Brightness: ${preset.brightness}</span>
                <span>Saturation: ${preset.saturation.toFixed(2)}</span>
                <span>Tint R: ${preset.tint.r}</span>
                <span>Tint G: ${preset.tint.g}</span>
                <span>Tint B: ${preset.tint.b}</span>
            `;

            applyBtn.disabled = false;
            downloadBtn.disabled = false;
        }
    };

    // Send image data to worker
    const intensity = parseInt(intensityInput.value) / 100;
    const vignetteStrength = parseInt(vignetteInput.value) / 100;

    worker.postMessage({
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        intensity: intensity,
        vignetteStrength: vignetteStrength,
        filter: preset
    }, [originalImageData.data.buffer.slice(0)]);
});

// Reset
resetBtn.addEventListener('click', function() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    imageInput.value = '';
    filterSelect.value = 'clarendon';
    intensityInput.value = 100;
    intensityValue.textContent = '100%';
    vignetteInput.value = 30;
    vignetteValue.textContent = '30%';
    filterNameEl.textContent = 'Clarendon Result';

    originalCanvas.width = 400;
    originalCanvas.height = 300;
    resultCanvas.width = 400;
    resultCanvas.height = 300;

    originalCtx.fillStyle = '#0f070a';
    originalCtx.fillRect(0, 0, 400, 300);
    originalCtx.fillStyle = '#7a3a5a';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Select an image to process', 200, 150);

    resultCtx.fillStyle = '#0f070a';
    resultCtx.fillRect(0, 0, 400, 300);
    resultCtx.fillStyle = '#7a3a5a';
    resultCtx.font = '14px sans-serif';
    resultCtx.textAlign = 'center';
    resultCtx.fillText('Result will appear here', 200, 150);

    originalImageData = null;
    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
});

// Download result
downloadBtn.addEventListener('click', function() {
    const filterName = filterPresets[filterSelect.value].name.toLowerCase();
    const link = document.createElement('a');
    link.download = `instagram-${filterName}-filter-result.png`;
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
});

// Initialize
resetBtn.click();
