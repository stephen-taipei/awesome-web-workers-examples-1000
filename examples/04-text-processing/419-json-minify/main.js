const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const minifyBtn = document.getElementById('minifyBtn');
const clearBtn = document.getElementById('clearBtn');
const inputStats = document.getElementById('inputStats');
const outputStats = document.getElementById('outputStats');
const timeStats = document.getElementById('timeStats');
const compressionRatio = document.getElementById('compressionRatio');
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

            const originalLen = inputArea.value.length;
            if (originalLen > 0) {
                const ratio = ((1 - text.length / originalLen) * 100).toFixed(2);
                compressionRatio.textContent = `節省: ${ratio}%`;
            }
        } else if (type === 'error') {
            alert('JSON 解析錯誤:\n' + error);
        }
    };
}

initWorker();

function processText() {
    const text = inputArea.value;
    if (!text) return;

    loading.style.display = 'flex';
    timeStats.textContent = '';
    compressionRatio.textContent = '';

    worker.postMessage({
        text: text
    });
}

inputArea.addEventListener('input', () => {
    inputStats.textContent = `${inputArea.value.length} 字元`;
});

minifyBtn.addEventListener('click', processText);

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    inputStats.textContent = '0 字元';
    outputStats.textContent = '0 字元';
    timeStats.textContent = '';
    compressionRatio.textContent = '';
});
