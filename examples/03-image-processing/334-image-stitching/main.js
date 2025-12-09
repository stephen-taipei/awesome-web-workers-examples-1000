const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileList = document.getElementById('fileList');
const stitchBtn = document.getElementById('stitchBtn');
const clearBtn = document.getElementById('clearBtn');
const previewContainer = document.getElementById('previewContainer');
const resultPanel = document.getElementById('resultPanel');
const resultCanvas = document.getElementById('resultCanvas');
const statusDiv = document.getElementById('status');

let images = [];
let worker = new Worker('worker.js');

// Event Listeners
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
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

clearBtn.addEventListener('click', () => {
    images = [];
    previewContainer.innerHTML = '';
    resultPanel.classList.add('hidden');
    stitchBtn.disabled = true;
    fileList.textContent = '';
    fileInput.value = '';
});

stitchBtn.addEventListener('click', () => {
    if (images.length < 2) return;

    stitchBtn.disabled = true;
    statusDiv.textContent = 'Stitching... finding optimal overlap...';
    resultPanel.classList.remove('hidden');

    // Convert images to ImageData
    const imageDatas = images.map(img => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
    });

    worker.postMessage({
        images: imageDatas
    });
});

worker.onmessage = (e) => {
    const { imageData, offset } = e.data;

    resultCanvas.width = imageData.width;
    resultCanvas.height = imageData.height;
    const ctx = resultCanvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    statusDiv.textContent = `Done. Found optimal offset: ${offset}px`;
    stitchBtn.disabled = false;
};

function handleFiles(files) {
    if (!files.length) return;

    // Append new files
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize for performance if needed
                if (img.width > 800) {
                    const scale = 800 / img.width;
                    img.width = 800;
                    img.height = Math.floor(img.height * scale);
                }

                images.push(img);

                // Add to preview
                const panel = document.createElement('div');
                panel.className = 'image-panel';
                panel.innerHTML = `<h3>Image ${images.length}</h3>`;

                // We use a canvas for preview so we can control size
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
                c.style.maxWidth = '200px';

                panel.appendChild(c);
                previewContainer.appendChild(panel);

                if (images.length >= 2) {
                    stitchBtn.disabled = false;
                }

                fileList.textContent = `${images.length} images loaded`;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
