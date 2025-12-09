const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const inputStats = document.getElementById('inputStats');
const outputStats = document.getElementById('outputStats');
const timeStats = document.getElementById('timeStats');
const loading = document.getElementById('loading');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, text, time, error } = e.data;

        loading.style.display = 'none';

        if (type === 'result') {
            outputArea.value = text;
            outputStats.textContent = `${text.length} 字元`;
            timeStats.textContent = `耗時: ${time}ms`;
        } else if (type === 'error') {
            alert('處理錯誤:\n' + error);
        }
    };
}

initWorker();

function processText() {
    const text = inputArea.value;
    if (!text) return;

    loading.style.display = 'flex';
    timeStats.textContent = '';

    worker.postMessage({
        text: text
    });
}

inputArea.addEventListener('input', () => {
    inputStats.textContent = `${inputArea.value.length} 字元`;
});

formatBtn.addEventListener('click', processText);

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    inputStats.textContent = '0 字元';
    outputStats.textContent = '0 字元';
    timeStats.textContent = '';
});
