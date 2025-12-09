const refInput = document.getElementById('refInput');
const targetInput = document.getElementById('targetInput');
const refUpload = document.getElementById('refUpload');
const targetUpload = document.getElementById('targetUpload');
const alignBtn = document.getElementById('alignBtn');
const resultCanvas = document.getElementById('resultCanvas');
const infoDiv = document.getElementById('info');

let refImg = null;
let targetImg = null;
let worker = new Worker('worker.js');

function setupUpload(area, input, callback) {
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const img = new Image();
            img.onload = () => {
                if (img.width > 800) {
                   const s = 800/img.width;
                   img.width = 800;
                   img.height *= s;
                }
                callback(img);
                area.style.borderColor = '#10b981';
                area.querySelector('p').textContent = `Loaded: ${e.target.files[0].name}`;
                checkReady();
            };
            img.src = URL.createObjectURL(e.target.files[0]);
        }
    });
}

setupUpload(refUpload, refInput, (img) => refImg = img);
setupUpload(targetUpload, targetInput, (img) => targetImg = img);

function checkReady() {
    if (refImg && targetImg) alignBtn.disabled = false;
}

alignBtn.addEventListener('click', () => {
    alignBtn.disabled = true;
    alignBtn.textContent = 'Aligning...';
    infoDiv.textContent = 'Searching for optimal translation...';

    // Draw ref to get data
    const c1 = document.createElement('canvas');
    c1.width = refImg.width;
    c1.height = refImg.height;
    c1.getContext('2d').drawImage(refImg, 0, 0);
    const refData = c1.getContext('2d').getImageData(0, 0, c1.width, c1.height);

    const c2 = document.createElement('canvas');
    c2.width = targetImg.width;
    c2.height = targetImg.height;
    c2.getContext('2d').drawImage(targetImg, 0, 0);
    const targetData = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height);

    worker.postMessage({
        ref: refData,
        target: targetData
    });
});

worker.onmessage = (e) => {
    const { x, y } = e.data;

    infoDiv.textContent = `Offset Found: X=${x}, Y=${y}. (Red/Blue overlay shows alignment)`;
    alignBtn.textContent = 'Align Images';
    alignBtn.disabled = false;

    // Draw composite to show alignment
    // Ref in Red channel, Aligned Target in Cyan (G+B)
    resultCanvas.width = refImg.width;
    resultCanvas.height = refImg.height;
    const ctx = resultCanvas.getContext('2d');

    // Draw Ref
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(refImg, 0, 0);

    // Draw Target with 50% opacity
    ctx.globalAlpha = 0.5;
    ctx.drawImage(targetImg, x, y);
    ctx.globalAlpha = 1.0;
};
