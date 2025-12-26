const file1Input = document.getElementById('file1');
const file2Input = document.getElementById('file2');
const upload1 = document.getElementById('upload1');
const upload2 = document.getElementById('upload2');
const preview1 = document.getElementById('preview1');
const preview2 = document.getElementById('preview2');

const targetCanvas = document.getElementById('targetCanvas');
const targetCtx = targetCanvas.getContext('2d');

const blendModeSelect = document.getElementById('blendMode');
const opacitySlider = document.getElementById('opacity');
const opacityVal = document.getElementById('opacityVal');

let worker;
let img1Data = null;
let img2Data = null;
let img1 = null;
let img2 = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'result') {
            targetCtx.putImageData(e.data.imageData, 0, 0);
            document.getElementById('targetInfo').textContent = `處理完成 (${e.data.time}ms)`;
        }
    };
}

function processImages() {
    if (!img1 || !img2) return;
    if (!worker) initWorker();

    // Prepare data
    // We resize both to match the first image or a fixed size?
    // Usually double exposure uses the size of the base image.

    // We need to draw images to get ImageData.
    // Create an OffscreenCanvas or temp canvas
    const w = img1.width;
    const h = img1.height;

    targetCanvas.width = w;
    targetCanvas.height = h;

    // Draw img1
    const c1 = new OffscreenCanvas(w, h);
    const ctx1 = c1.getContext('2d');
    ctx1.drawImage(img1, 0, 0, w, h);
    const data1 = ctx1.getImageData(0, 0, w, h);

    // Draw img2 (scale to fit/fill w,h)
    const c2 = new OffscreenCanvas(w, h);
    const ctx2 = c2.getContext('2d');

    // Object-fit: cover
    const r1 = w / h;
    const r2 = img2.width / img2.height;

    let drawW, drawH, drawX, drawY;
    if (r2 > r1) {
        // img2 is wider
        drawH = h;
        drawW = h * r2;
        drawX = (w - drawW) / 2;
        drawY = 0;
    } else {
        // img2 is taller
        drawW = w;
        drawH = w / r2;
        drawX = 0;
        drawY = (h - drawH) / 2;
    }

    ctx2.drawImage(img2, drawX, drawY, drawW, drawH);
    const data2 = ctx2.getImageData(0, 0, w, h);

    const params = {
        mode: blendModeSelect.value,
        opacity: parseInt(opacitySlider.value) / 100
    };

    document.getElementById('targetInfo').textContent = '處理中...';

    worker.postMessage({
        base: data1,
        overlay: data2,
        params: params
    });
}

function handleUpload(file, imgObj, previewParams) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const i = new Image();
        i.onload = () => {
            // Resize check
             let w = i.width;
             let h = i.height;
             const MAX_SIZE = 1200;
             if (w > MAX_SIZE || h > MAX_SIZE) {
                 const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                 w = Math.floor(w * ratio);
                 h = Math.floor(h * ratio);
             }
             // Create a resized version for processing
             createImageBitmap(i, { resizeWidth: w, resizeHeight: h }).then(bitmap => {
                 // Convert bitmap back to image or just keep bitmap?
                 // Simpler to stick to Image element logic for now, or just use offscreen canvas in processImages.
                 // Actually `i` is full size. Let's just store `i` and let processImages handle resizing via canvas.
                 // But for large images, we want to downscale `i` first.

                 const canvas = document.createElement('canvas');
                 canvas.width = w;
                 canvas.height = h;
                 canvas.getContext('2d').drawImage(i, 0, 0, w, h);

                 const newImg = new Image();
                 newImg.onload = () => {
                     if (previewParams.id === 1) img1 = newImg;
                     else img2 = newImg;
                     processImages();
                 };
                 newImg.src = canvas.toDataURL();
             });
        };
        i.src = e.target.result;

        previewParams.el.src = e.target.result;
        previewParams.el.style.display = 'block';
        previewParams.wrapper.classList.add('active');
    };
    reader.readAsDataURL(file);
}

upload1.onclick = () => file1Input.click();
upload2.onclick = () => file2Input.click();

file1Input.onchange = (e) => handleUpload(e.target.files[0], img1, { el: preview1, wrapper: upload1, id: 1 });
file2Input.onchange = (e) => handleUpload(e.target.files[0], img2, { el: preview2, wrapper: upload2, id: 2 });

opacitySlider.oninput = () => {
    opacityVal.textContent = (opacitySlider.value / 100).toFixed(2);
    processImages();
};
blendModeSelect.onchange = processImages;

initWorker();
