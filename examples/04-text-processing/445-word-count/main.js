const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const timeTaken = document.getElementById('timeTaken');

const els = {
    totalChars: document.getElementById('totalChars'),
    totalCharsNoSpace: document.getElementById('totalCharsNoSpace'),
    totalWords: document.getElementById('totalWords'),
    totalLines: document.getElementById('totalLines'),
    totalParagraphs: document.getElementById('totalParagraphs'),
    cjkChars: document.getElementById('cjkChars'),
    avgWordLen: document.getElementById('avgWordLen')
};

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, stats, time } = e.data;
        if (type === 'result') {
            for (const key in stats) {
                if (els[key]) els[key].textContent = stats[key].toLocaleString();
            }
            timeTaken.textContent = `(耗時: ${time.toFixed(2)}ms)`;
            processBtn.disabled = false;
            processBtn.textContent = '開始統計';
        }
    };
}

function process() {
    const text = inputText.value;
    // Don't check empty here, let worker handle 0 stats

    processBtn.disabled = true;
    processBtn.textContent = '統計中...';

    if (!worker) initWorker();
    worker.postMessage({ text });
}

processBtn.addEventListener('click', process);

// Real-time update? Maybe throttle
let timeout;
inputText.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(process, 500);
});

initWorker();
