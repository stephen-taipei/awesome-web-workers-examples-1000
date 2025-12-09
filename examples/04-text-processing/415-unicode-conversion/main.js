const input = document.getElementById('input');
const output = document.getElementById('output');
const processTime = document.getElementById('processTime');

let worker;
let lastInput = '';

function initWorker() {
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { result, time, error } = e.data;

        if (error) {
            output.textContent = `Error: ${error}`;
            output.style.color = '#f87171';
        } else {
            renderTable(result);
            processTime.textContent = `${time.toFixed(2)}ms`;
        }
    };
}

function renderTable(data) {
    if (data.length === 0) {
        output.innerHTML = '無數據';
        return;
    }

    let html = `
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
            <tr style="border-bottom: 1px solid #10b981;">
                <th style="padding: 8px;">Char</th>
                <th style="padding: 8px;">Code Point</th>
                <th style="padding: 8px;">UTF-16 (Hex)</th>
                <th style="padding: 8px;">HTML Entity</th>
                <th style="padding: 8px;">JS Escape</th>
            </tr>
        </thead>
        <tbody>
    `;

    data.forEach(row => {
        html += `
        <tr style="border-bottom: 1px solid rgba(16,185,129,0.1);">
            <td style="padding: 8px; color: #fff; font-size: 1.2em;">${row.char}</td>
            <td style="padding: 8px;">${row.codePoint}</td>
            <td style="padding: 8px;">${row.utf16}</td>
            <td style="padding: 8px;">${row.html}</td>
            <td style="padding: 8px;">${row.js}</td>
        </tr>
        `;
    });

    html += '</tbody></table>';
    output.innerHTML = html;
}

function update() {
    const text = input.value;
    if (text === lastInput) return;
    lastInput = text;

    if (!worker) initWorker();
    worker.postMessage({ text: text });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

input.addEventListener('input', debounce(update, 300));

initWorker();
update();
