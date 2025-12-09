const text1Input = document.getElementById('text1');
const text2Input = document.getElementById('text2');
const processBtn = document.getElementById('processBtn');
const jaccardVal = document.getElementById('jaccardVal');
const cosineVal = document.getElementById('cosineVal');
const processTimeDisplay = document.getElementById('processTime');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, jaccard, cosine, duration } = e.data;

        if (type === 'result') {
            jaccardVal.textContent = (jaccard * 100).toFixed(2) + '%';
            cosineVal.textContent = (cosine * 100).toFixed(2) + '%';
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            processBtn.disabled = false;
            processBtn.textContent = '計算相似度';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('計算過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '計算相似度';
    };
}

processBtn.addEventListener('click', () => {
    const text1 = text1Input.value.trim();
    const text2 = text2Input.value.trim();

    if (!text1 || !text2) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';
    jaccardVal.textContent = '-';
    cosineVal.textContent = '-';

    initWorker();

    worker.postMessage({ text1, text2 });
});
