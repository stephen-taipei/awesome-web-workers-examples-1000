const inputText = document.getElementById('inputText');
const nValue = document.getElementById('nValue');
const nVal = document.getElementById('nVal');
const gramType = document.getElementById('gramType');
const extractBtn = document.getElementById('extractBtn');
const resultContainer = document.getElementById('resultContainer');
const uniqueCount = document.getElementById('uniqueCount');
const processingTime = document.getElementById('processingTime');
const resultTableBody = document.getElementById('resultTableBody');

let worker;

nValue.addEventListener('input', (e) => {
    nVal.textContent = e.target.value;
});

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { ngrams, time } = data;

            uniqueCount.textContent = ngrams.length;
            processingTime.textContent = `${time.toFixed(2)} ms`;

            resultTableBody.innerHTML = '';

            // Show top 20
            ngrams.slice(0, 20).forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 8px; color: #ddd;">"${item.gram}"</td>
                    <td style="padding: 8px; color: #6ee7b7;">${item.count}</td>
                `;
                resultTableBody.appendChild(tr);
            });

            resultContainer.classList.remove('hidden');
            extractBtn.disabled = false;
        }
    };
}

extractBtn.addEventListener('click', () => {
    const text = inputText.value;
    const n = parseInt(nValue.value);
    const type = gramType.value;

    if (!text) return;

    extractBtn.disabled = true;
    resultContainer.classList.add('hidden');

    worker.postMessage({ text, n, type });
});
