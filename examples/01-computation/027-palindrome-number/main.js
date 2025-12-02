/**
 * Main Thread: Palindrome Number Detection
 */

const calcTypeSelect = document.getElementById('calcType');
const singleGroup = document.getElementById('singleGroup');
const numberInput = document.getElementById('numberInput');
const baseSelect = document.getElementById('baseSelect');
const rangeGroup = document.getElementById('rangeGroup');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const multiBaseGroup = document.getElementById('multiBaseGroup');
const basesInput = document.getElementById('basesInput');
const digitsGroup = document.getElementById('digitsGroup');
const maxDigitsInput = document.getElementById('maxDigitsInput');
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const executionTime = document.getElementById('executionTime');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'progress') updateProgress(data.current, data.total, data.percentage);
        else if (data.type === 'result') displayResult(data);
        else if (data.type === 'error') displayError(data.message);
    };
    worker.onerror = (err) => { displayError(err.message); resetUI(); };
}

function updateProgress(current, total, pct) {
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `Processing: ${current.toLocaleString()}/${total.toLocaleString()} (${pct}%)`;
}

function displayResult(data) {
    hideError();
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    executionTime.textContent = `${data.executionTime} ms`;

    const r = data.result;
    let html = '<div class="result-palindrome">';

    switch (data.calculationType) {
        case 'single':
            html += `<h4>Palindrome Check (Base ${r.base})</h4>`;
            html += `<div class="check-result ${r.isPalindrome ? 'is-palindrome' : 'not-palindrome'}">`;
            html += `<span class="status">${r.isPalindrome ? 'YES' : 'NO'}</span>`;
            html += `</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Number</td><td class="number-value">${r.number}</td></tr>`;
            html += `<tr><td>Base-${r.base}</td><td class="number-value">${r.representation}</td></tr>`;
            html += `<tr><td>Reversed</td><td class="number-value">${r.reversed}</td></tr>`;
            html += `<tr><td>Digits</td><td>${r.digits}</td></tr>`;
            html += '</tbody></table>';
            break;

        case 'range':
            html += `<h4>Palindromes in Range (Base ${r.base})</h4>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Total Numbers</td><td>${r.total.toLocaleString()}</td></tr>`;
            html += `<tr><td>Palindromes Found</td><td class="highlight">${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Density</td><td>${r.density}%</td></tr>`;
            html += '</tbody></table>';
            html += '<h5>Palindromes</h5><div class="palindrome-list">';
            r.palindromes.forEach(p => {
                html += `<span class="palindrome-item" title="Base-${r.base}: ${p.representation}">${p.decimal}</span>`;
            });
            html += '</div>';
            break;

        case 'multiBase':
            html += `<h4>Multi-Base Analysis: ${r.number}</h4>`;
            html += '<table class="result-table"><thead><tr><th>Base</th><th>Representation</th><th>Palindrome?</th></tr></thead><tbody>';
            r.results.forEach(res => {
                const status = res.isPalindrome ? '<span class="yes">Yes</span>' : '<span class="no">No</span>';
                html += `<tr><td>${res.base}</td><td class="number-value">${res.representation}</td><td>${status}</td></tr>`;
            });
            html += '</tbody></table>';
            if (r.palindromeBases.length > 0) {
                html += `<p class="summary">Palindrome in bases: ${r.palindromeBases.join(', ')}</p>`;
            }
            break;

        case 'statistics':
            html += '<h4>Palindrome Statistics</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Total Numbers</td><td>${r.total.toLocaleString()}</td></tr>`;
            html += `<tr><td>Palindromes</td><td class="highlight">${r.palindromeCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Density</td><td>${r.density}%</td></tr>`;
            html += '</tbody></table>';
            html += '<h5>Distribution by Digits</h5>';
            html += '<div class="distribution">';
            r.distribution.forEach(d => {
                const pct = Math.min((d.count / r.palindromeCount) * 100, 100);
                html += `<div class="dist-bar"><span class="label">${d.digits}d</span>`;
                html += `<div class="bar" style="width:${pct}%"></div>`;
                html += `<span class="value">${d.count.toLocaleString()}</span></div>`;
            });
            html += '</div>';
            break;

        case 'special':
            html += '<h4>Special Palindromes</h4>';

            if (r.primePalindromes.length > 0) {
                html += '<h5>Prime Palindromes</h5><div class="palindrome-list">';
                r.primePalindromes.forEach(p => {
                    html += `<span class="palindrome-item prime">${p}</span>`;
                });
                html += '</div>';
            }

            if (r.squarePalindromes.length > 0) {
                html += '<h5>Square Palindromes</h5><div class="palindrome-list">';
                r.squarePalindromes.forEach(p => {
                    html += `<span class="palindrome-item square" title="${p.root}²">${p.number}</span>`;
                });
                html += '</div>';
            }

            if (r.multiBasePalindromes.length > 0) {
                html += '<h5>Binary & Decimal Palindromes</h5>';
                html += '<table class="result-table"><thead><tr><th>Decimal</th><th>Binary</th></tr></thead><tbody>';
                r.multiBasePalindromes.forEach(p => {
                    html += `<tr><td class="number-value">${p.decimal}</td><td class="number-value">${p.binary}</td></tr>`;
                });
                html += '</tbody></table>';
            }
            break;
    }

    html += '</div>';
    resultContent.innerHTML = html;
    resetUI();
}

function displayError(msg) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = msg;
    resetUI();
}

function hideError() { errorContainer.classList.add('hidden'); }

function resetUI() {
    calculateBtn.disabled = false;
    cancelBtn.classList.add('hidden');
    document.querySelectorAll('input, select').forEach(el => el.disabled = false);
}

function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    document.querySelectorAll('input, select').forEach(el => el.disabled = true);
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
}

function updateInputUI() {
    const type = calcTypeSelect.value;
    singleGroup.classList.toggle('hidden', type === 'range' || type === 'statistics');
    rangeGroup.classList.toggle('hidden', type !== 'range' && type !== 'statistics');
    multiBaseGroup.classList.toggle('hidden', type !== 'multiBase');
    digitsGroup.classList.toggle('hidden', type !== 'special');
    baseSelect.parentElement.classList.toggle('hidden', type === 'multiBase' || type === 'statistics' || type === 'special');
}

function startCalculation() {
    const type = calcTypeSelect.value;
    setCalculatingUI();
    initWorker();

    switch (type) {
        case 'single':
            const num = numberInput.value.trim();
            if (!num || !/^\d+$/.test(num)) { displayError('Enter a valid positive integer'); return; }
            worker.postMessage({ type: 'single', number: num, base: parseInt(baseSelect.value) });
            break;

        case 'range':
            const start = startInput.value.trim();
            const end = endInput.value.trim();
            if (!start || !end) { displayError('Enter valid range'); return; }
            if (BigInt(end) - BigInt(start) > 10000000n) { displayError('Range too large (max 10M)'); return; }
            worker.postMessage({ type: 'range', start, end, base: parseInt(baseSelect.value) });
            break;

        case 'multiBase':
            const numMB = numberInput.value.trim();
            if (!numMB || !/^\d+$/.test(numMB)) { displayError('Enter a valid positive integer'); return; }
            const bases = basesInput.value.split(',').map(b => parseInt(b.trim())).filter(b => b >= 2 && b <= 36);
            if (bases.length === 0) { displayError('Enter valid bases (2-36)'); return; }
            worker.postMessage({ type: 'multiBase', number: numMB, bases });
            break;

        case 'statistics':
            const startS = startInput.value.trim();
            const endS = endInput.value.trim();
            if (!startS || !endS) { displayError('Enter valid range'); return; }
            if (BigInt(endS) - BigInt(startS) > 10000000n) { displayError('Range too large (max 10M)'); return; }
            worker.postMessage({ type: 'statistics', start: startS, end: endS });
            break;

        case 'special':
            const maxDigits = parseInt(maxDigitsInput.value) || 6;
            if (maxDigits > 8) { displayError('Max 8 digits for special search'); return; }
            worker.postMessage({ type: 'special', maxDigits });
            break;
    }
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
calcTypeSelect.addEventListener('change', updateInputUI);
document.addEventListener('DOMContentLoaded', updateInputUI);
