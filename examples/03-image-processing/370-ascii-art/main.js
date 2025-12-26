const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const asciiOutput = document.getElementById('asciiOutput');
const sourcePreview = document.getElementById('sourcePreview');

const charsetSelect = document.getElementById('charset');
const widthSlider = document.getElementById('width');
const invertCheck = document.getElementById('invert');
const copyBtn = document.getElementById('copyBtn');
const widthVal = document.getElementById('widthVal');

let worker;
let originalImage = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'result') {
            asciiOutput.textContent = e.data.text;
            document.getElementById('targetInfo').textContent = `轉換完成 (${e.data.time}ms) - 字元數: ${e.data.text.length}`;
        }
    };
}

function processImage() {
    if (!originalImage) return;

    const targetWidth = parseInt(widthSlider.value);
    // Aspect ratio correction: Characters are usually ~2x taller than wide.
    // So if image is 1:1, ascii grid should be 2:1 (height:width) in counts?
    // No, if char is tall (8x16), to represent a square pixel, we need 2 chars horizontally?
    // Or we just resize image such that h = w * aspect * (fontW/fontH).
    // Courier New is roughly 0.6 aspect ratio (width/height).
    // To keep image aspect ratio:
    // gridH / gridW = (imgH / imgW) * (fontW / fontH)
    // fontW/fontH approx 0.6.

    const aspectRatio = originalImage.height / originalImage.width;
    // Char aspect ratio correction factor (approx 0.5 to 0.6)
    const fontRatio = 0.55;
    const targetHeight = Math.floor(targetWidth * aspectRatio * fontRatio);

    // Resize image to target resolution
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    const params = {
        charset: charsetSelect.value,
        invert: invertCheck.checked
    };

    document.getElementById('targetInfo').textContent = '處理中...';

    worker.postMessage({
        imageData: imageData,
        params: params
    });
}

function updateVal(slider, display) {
    display.textContent = slider.value;
}

charsetSelect.onchange = processImage;
invertCheck.onchange = processImage;
widthSlider.oninput = () => { updateVal(widthSlider, widthVal); processImage(); };

copyBtn.onclick = () => {
    navigator.clipboard.writeText(asciiOutput.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '已複製!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
};

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
             originalImage = img;
             sourcePreview.src = e.target.result;
             sourcePreview.style.display = 'block';
             document.getElementById('sourceInfo').textContent = `原始尺寸: ${img.width}x${img.height}`;

             initWorker();
             processImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

initWorker();
