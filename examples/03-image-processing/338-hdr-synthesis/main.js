const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileList = document.getElementById('fileList');
const hdrBtn = document.getElementById('hdrBtn');
const clearBtn = document.getElementById('clearBtn');
const previewPanel = document.getElementById('previewPanel');
const resultCanvas = document.getElementById('resultCanvas');

let images = [];
let worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#10b981';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(16,185,129,0.5)';
    handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

clearBtn.addEventListener('click', () => {
    images = [];
    fileList.textContent = '';
    hdrBtn.disabled = true;
    previewPanel.innerHTML = '';
    const ctx = resultCanvas.getContext('2d');
    ctx.clearRect(0,0,resultCanvas.width, resultCanvas.height);
});

hdrBtn.addEventListener('click', () => {
    if (images.length === 0) return;

    hdrBtn.disabled = true;
    hdrBtn.textContent = 'Processing...';

    const imageDatas = images.map(img => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.getContext('2d').getImageData(0, 0, img.width, img.height);
    });

    worker.postMessage({ images: imageDatas });
});

worker.onmessage = (e) => {
    const { imageData } = e.data;
    resultCanvas.width = imageData.width;
    resultCanvas.height = imageData.height;
    resultCanvas.getContext('2d').putImageData(imageData, 0, 0);

    hdrBtn.textContent = 'Create HDR';
    hdrBtn.disabled = false;
};

function handleFiles(files) {
    if (!files.length) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                if (img.width > 800) {
                    const s = 800/img.width;
                    img.width = 800;
                    img.height *= s;
                }
                images.push(img);
                fileList.textContent = `${images.length} images loaded`;

                const thumb = document.createElement('canvas');
                thumb.width = img.width;
                thumb.height = img.height;
                thumb.getContext('2d').drawImage(img, 0, 0);
                thumb.style.maxWidth = '100px';
                thumb.style.margin = '5px';
                previewPanel.appendChild(thumb);

                if (images.length >= 2) hdrBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
