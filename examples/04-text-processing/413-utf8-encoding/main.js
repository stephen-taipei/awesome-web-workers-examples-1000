const input = document.getElementById('input');
const output = document.getElementById('output');
const processTime = document.getElementById('processTime');
const modeRadios = document.querySelectorAll('input[name="mode"]');

let worker;
let lastInput = '';
let currentMode = 'encode';

function initWorker() {
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { result, time, error } = e.data;

        if (error) {
            output.textContent = `Error: ${error}`;
            output.style.color = '#f87171';
        } else {
            output.textContent = result;
            output.style.color = '#a7f3d0';
        }

        processTime.textContent = `${time.toFixed(2)}ms`;
    };
}

function update() {
    const text = input.value;
    lastInput = text;

    if (!worker) initWorker();
    worker.postMessage({ text: text, mode: currentMode });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

input.addEventListener('input', debounce(update, 300));
modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        // 清空輸入或提供預設範例
        if (currentMode === 'decode') {
            input.placeholder = "輸入 Hex 字串 (例如: e4 bd a0 e5 a5 bd)";
        } else {
            input.placeholder = "輸入文本";
        }
        update();
    });
});

initWorker();

input.value = "你好 World 🌍";
update();
