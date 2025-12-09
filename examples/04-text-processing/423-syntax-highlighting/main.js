const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const highlightBtn = document.getElementById('highlightBtn');
const clearBtn = document.getElementById('clearBtn');
const langSelect = document.getElementById('langSelect');
const inputStats = document.getElementById('inputStats');
const timeStats = document.getElementById('timeStats');
const loading = document.getElementById('loading');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, html, time, error } = e.data;

        loading.style.display = 'none';

        if (type === 'result') {
            outputArea.innerHTML = html;
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
        text: text,
        lang: langSelect.value
    });
}

inputArea.addEventListener('input', () => {
    inputStats.textContent = `${inputArea.value.length} 字元`;
});

highlightBtn.addEventListener('click', processText);

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.innerHTML = '';
    inputStats.textContent = '0 字元';
    timeStats.textContent = '';
});

// Set default example
inputArea.value = `// JavaScript Example
function hello(name) {
    const greeting = "Hello, " + name;
    console.log(greeting);
    return true;
}`;
inputStats.textContent = `${inputArea.value.length} 字元`;
