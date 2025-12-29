/**
 * 晶格化效果 - 主程式
 * 使用 Voronoi 圖創建晶格效果
 */

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const cellSizeInput = document.getElementById('cellSize');
const cellSizeValue = document.getElementById('cellSizeValue');
const seedCountInput = document.getElementById('seedCount');
const seedCountValue = document.getElementById('seedCountValue');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker = null;

// 事件監聽
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) loadImage(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
cellSizeInput.addEventListener('input', () => cellSizeValue.textContent = cellSizeInput.value);
seedCountInput.addEventListener('input', () => seedCountValue.textContent = seedCountInput.value);
processBtn.addEventListener('click', processImage);

function loadImage(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            const maxSize = 600;
            if (w > maxSize || h > maxSize) {
                if (w > h) { h = h * maxSize / w; w = maxSize; }
                else { w = w * maxSize / h; h = maxSize; }
            }
            originalCanvas.width = resultCanvas.width = Math.floor(w);
            originalCanvas.height = resultCanvas.height = Math.floor(h);
            originalCtx.drawImage(img, 0, 0, originalCanvas.width, originalCanvas.height);
            resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    processBtn.disabled = true;
    progressSection.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const w = originalCanvas.width, h = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, w, h);

    worker.postMessage({
        imageData: imageData,
        cellSize: parseInt(cellSizeInput.value),
        seedCount: parseInt(seedCountInput.value)
    });

    worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
            const percent = Math.round(e.data.progress * 100);
            progressBar.style.width = percent + '%';
            progressBar.textContent = percent + '%';
        } else if (e.data.type === 'result') {
            resultCtx.putImageData(e.data.imageData, 0, 0);
            processBtn.disabled = false;
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
    };

    worker.onerror = (err) => {
        console.error('Worker error:', err);
        processBtn.disabled = false;
    };
}
