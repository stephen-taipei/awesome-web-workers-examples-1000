const input = document.getElementById('input');
const output = document.getElementById('output');
const processTime = document.getElementById('processTime');
const modeRadios = document.querySelectorAll('input[name="mode"]');
const separatorSelect = document.getElementById('separator');

let worker;
let lastInput = '';
let currentMode = 'toHex';

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
    worker.postMessage({
        text: text,
        mode: currentMode,
        separator: separatorSelect.value
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

input.addEventListener('input', debounce(update, 300));
separatorSelect.addEventListener('change', update);

modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if (currentMode === 'fromHex') {
            input.placeholder = "輸入 Hex (例如: 48 65 6c 6c 6f)";
        } else {
            input.placeholder = "輸入文本";
        }
        update();
    });
});

initWorker();

input.value = "Hello World";
update();
