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
    // if (text === lastInput) return; // Allow mode change to trigger update even if text same
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
        update();
    });
});

initWorker();
// 預設示範
input.value = "Hello World! 你好，世界！\nWeb Workers make things fast.";
update();
