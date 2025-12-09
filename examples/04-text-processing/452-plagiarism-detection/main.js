const text1Input = document.getElementById('text1');
const text2Input = document.getElementById('text2');
const ngramInput = document.getElementById('ngramSize');
const ngramVal = document.getElementById('ngramVal');
const processBtn = document.getElementById('processBtn');
const similarityScore = document.getElementById('similarityScore');
const processTimeDisplay = document.getElementById('processTime');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, score, duration } = e.data;

        if (type === 'result') {
            const percentage = (score * 100).toFixed(2);
            similarityScore.textContent = `${percentage}%`;
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;

            // Color code the result
            if (score > 0.7) similarityScore.style.color = '#ef4444'; // High risk
            else if (score > 0.4) similarityScore.style.color = '#f59e0b'; // Medium
            else similarityScore.style.color = '#10b981'; // Low

            processBtn.disabled = false;
            processBtn.textContent = '開始檢測';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('檢測過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '開始檢測';
    };
}

ngramInput.addEventListener('input', (e) => {
    ngramVal.textContent = e.target.value;
});

processBtn.addEventListener('click', () => {
    const text1 = text1Input.value.trim();
    const text2 = text2Input.value.trim();
    const n = parseInt(ngramInput.value);

    if (!text1 || !text2) return;

    processBtn.disabled = true;
    processBtn.textContent = '檢測中...';
    similarityScore.textContent = '-';
    similarityScore.style.color = '#a7f3d0';

    initWorker();

    worker.postMessage({ text1, text2, n });
});
