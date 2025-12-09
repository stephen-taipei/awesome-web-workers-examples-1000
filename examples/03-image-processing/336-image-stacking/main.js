const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileList = document.getElementById('fileList');
const stackBtn = document.getElementById('stackBtn');
const clearBtn = document.getElementById('clearBtn');
const refCanvas = document.getElementById('refCanvas');
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
    stackBtn.disabled = true;
    const ctx1 = refCanvas.getContext('2d');
    const ctx2 = resultCanvas.getContext('2d');
    ctx1.clearRect(0,0,refCanvas.width, refCanvas.height);
    ctx2.clearRect(0,0,resultCanvas.width, resultCanvas.height);
});

stackBtn.addEventListener('click', () => {
    if (images.length === 0) return;

    stackBtn.disabled = true;
    stackBtn.textContent = 'Stacking...';

    // Convert to ImageDatas
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

    stackBtn.textContent = 'Stack Images (Average)';
    stackBtn.disabled = false;
};

function handleFiles(files) {
    if (!files.length) return;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                images.push(img);
                fileList.textContent = `${images.length} images loaded`;

                // Show first image as ref
                if (images.length === 1) {
                    refCanvas.width = img.width;
                    refCanvas.height = img.height;
                    refCanvas.getContext('2d').drawImage(img, 0, 0);
                }

                if (images.length >= 2) stackBtn.disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
