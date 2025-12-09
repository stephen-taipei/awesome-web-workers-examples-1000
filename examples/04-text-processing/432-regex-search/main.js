const inputText = document.getElementById('inputText');
const regexPattern = document.getElementById('regexPattern');
const flagGlobal = document.getElementById('flagGlobal');
const flagIgnoreCase = document.getElementById('flagIgnoreCase');
const flagMultiline = document.getElementById('flagMultiline');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const matchCount = document.getElementById('matchCount');
const processingTime = document.getElementById('processingTime');
const matchList = document.getElementById('matchList');

let worker;

if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const { matches, time } = data;

            matchCount.textContent = matches.length;
            processingTime.textContent = `${time.toFixed(2)} ms`;

            matchList.innerHTML = '';
            matches.forEach(match => {
                const item = document.createElement('div');
                item.style.marginBottom = '5px';
                item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                item.innerHTML = `
                    <span style="color: #10b981; font-weight: bold;">"${match.text}"</span>
                    <span style="color: #6ee7b7; font-size: 0.8em;">(Index: ${match.index})</span>
                `;
                matchList.appendChild(item);
            });

            resultContainer.classList.remove('hidden');
            searchBtn.disabled = false;
        } else if (type === 'error') {
            alert('Error: ' + data.message);
            searchBtn.disabled = false;
        }
    };
}

searchBtn.addEventListener('click', () => {
    const text = inputText.value;
    const pattern = regexPattern.value;

    let flags = '';
    if (flagGlobal.checked) flags += 'g';
    if (flagIgnoreCase.checked) flags += 'i';
    if (flagMultiline.checked) flags += 'm';

    if (!pattern) return;

    searchBtn.disabled = true;
    resultContainer.classList.add('hidden');

    worker.postMessage({ text, pattern, flags });
});
