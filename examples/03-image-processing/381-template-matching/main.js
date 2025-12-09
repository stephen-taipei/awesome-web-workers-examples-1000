const sourceInput = document.getElementById('sourceInput');
const templateInput = document.getElementById('templateInput');
const sourceUpload = document.getElementById('sourceUpload');
const templateUpload = document.getElementById('templateUpload');
const processBtn = document.getElementById('processBtn');
const cropBtn = document.getElementById('cropBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const templateCanvas = document.getElementById('templateCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const templateCtx = templateCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const selectionBox = document.getElementById('selectionBox');
const processTimeDisplay = document.getElementById('processTime');
const matchScoreDisplay = document.getElementById('matchScore');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const thresholdInput = document.getElementById('threshold');

let worker;
let sourceImageData = null;
let templateImageData = null;
let isSelecting = false;
let startX, startY, endX, endY;

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
            processTimeDisplay.textContent = `${executionTime}ms`;

            const { bestMatch, resultMap, width, height } = data;
            matchScoreDisplay.textContent = bestMatch.score.toFixed(4);

            drawResult(bestMatch, resultMap, width, height);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

function drawResult(bestMatch, resultMapData, mapWidth, mapHeight) {
    // 1. Draw Heatmap on Result Canvas
    resultCanvas.width = mapWidth;
    resultCanvas.height = mapHeight;
    const imgData = resultCtx.createImageData(mapWidth, mapHeight);

    // Normalize heatmap for visualization
    let min = 1, max = -1;
    for(let i=0; i<resultMapData.length; i++) {
        if(resultMapData[i] < min) min = resultMapData[i];
        if(resultMapData[i] > max) max = resultMapData[i];
    }

    for (let i = 0; i < resultMapData.length; i++) {
        const val = resultMapData[i];
        // Map -1..1 to 0..255 (or adjust range based on min/max for better contrast)
        // Simple mapping: 0 to 255 based on score 0 to 1 (ignoring negative correlation for viz)
        const norm = Math.max(0, (val - min) / (max - min));

        // Heatmap colors (Blue -> Red)
        // Simple: Red channel = val
        const v = Math.floor(norm * 255);
        imgData.data[i * 4] = v;     // R
        imgData.data[i * 4 + 1] = 0; // G
        imgData.data[i * 4 + 2] = 255 - v; // B
        imgData.data[i * 4 + 3] = 255; // A
    }
    resultCtx.putImageData(imgData, 0, 0);

    // 2. Draw Bounding Box on Source Canvas
    // Restore source
    sourceCtx.putImageData(sourceImageData, 0, 0);

    if (bestMatch.score >= parseFloat(thresholdInput.value) / 100) {
        sourceCtx.strokeStyle = '#0f0';
        sourceCtx.lineWidth = 3;
        sourceCtx.strokeRect(bestMatch.x, bestMatch.y, templateCanvas.width, templateCanvas.height);

        sourceCtx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        sourceCtx.fillRect(bestMatch.x, bestMatch.y, templateCanvas.width, templateCanvas.height);
    }
}

// Selection Logic
sourceCanvas.addEventListener('mousedown', e => {
    const rect = sourceCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isSelecting = true;
    selectionBox.style.display = 'block';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
});

sourceCanvas.addEventListener('mousemove', e => {
    if (!isSelecting) return;
    const rect = sourceCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startX;
    const height = currentY - startY;

    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
    selectionBox.style.left = (width < 0 ? currentX : startX) + 'px';
    selectionBox.style.top = (height < 0 ? currentY : startY) + 'px';

    endX = currentX;
    endY = currentY;
});

sourceCanvas.addEventListener('mouseup', () => {
    isSelecting = false;
    cropBtn.disabled = false;
});

cropBtn.addEventListener('click', () => {
    if (!sourceImageData) return;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w < 2 || h < 2) return;

    const cropped = sourceCtx.getImageData(x, y, w, h);
    templateCanvas.width = w;
    templateCanvas.height = h;
    templateCtx.putImageData(cropped, 0, 0);
    templateImageData = cropped;

    selectionBox.style.display = 'none';
    processBtn.disabled = false;
});

// File Handling
function handleFile(file, isTemplate) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let canvas, ctx;
        if (isTemplate) {
            canvas = templateCanvas;
            ctx = templateCtx;
        } else {
            canvas = sourceCanvas;
            ctx = sourceCtx;
            // Limit source size
            let width = img.width;
            let height = img.height;
            const maxSize = 800;
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
        }

        if (!isTemplate && canvas.width > 0) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resultCanvas.width = canvas.width;
            resultCanvas.height = canvas.height;
            resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        } else if (isTemplate) {
             // Limit template size to avoid too slow matching
            let width = img.width;
            let height = img.height;
            const maxSize = 200;
             if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            templateImageData = ctx.getImageData(0, 0, width, height);
        }

        if (sourceImageData && templateImageData) {
            processBtn.disabled = false;
        }
    };
    img.src = URL.createObjectURL(file);
}

sourceUpload.addEventListener('click', () => sourceInput.click());
sourceInput.addEventListener('change', (e) => handleFile(e.target.files[0], false));
templateUpload.addEventListener('click', () => templateInput.click());
templateInput.addEventListener('change', (e) => handleFile(e.target.files[0], true));

processBtn.addEventListener('click', () => {
    if (!sourceImageData || !templateImageData) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    worker.postMessage({
        sourceImageData: sourceImageData,
        templateImageData: templateImageData
    });
});

initWorker();
