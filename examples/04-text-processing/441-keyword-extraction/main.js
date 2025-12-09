const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const resultTableBody = document.querySelector('#resultTable tbody');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, results, time } = e.data;
        if (type === 'result') {
            renderTable(results);
            timeTaken.textContent = `(耗時: ${time.toFixed(2)}ms)`;
            processBtn.disabled = false;
            processBtn.textContent = '提取關鍵詞';
        }
    };
}

function process() {
    const text = inputText.value;
    if (!text.trim()) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';

    if (!worker) initWorker();
    worker.postMessage({ text });
}

function renderTable(results) {
    resultTableBody.innerHTML = '';
    results.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td class="highlight">${item.word}</td>
            <td>${item.score.toFixed(2)}</td>
        `;
        resultTableBody.appendChild(row);
    });
}

processBtn.addEventListener('click', process);

loadSampleBtn.addEventListener('click', () => {
    inputText.value = `Compatibility of systems of linear constraints over the set of natural numbers. Criteria of compatibility of a system of linear Diophantine equations, strict inequations, and nonstrict inequations are considered. Upper bounds for components of a minimal set of solutions and algorithms of construction of minimal generating sets of solutions for all types of systems are given. These criteria and the corresponding algorithms for constructing a minimal supporting set of solutions can be used in solving all the considered types of systems and systems of mixed types.`;
});

initWorker();
