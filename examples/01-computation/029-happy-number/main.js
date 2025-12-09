/**
 * Main Thread: Happy Number Detection
 */

const calcTypeSelect = document.getElementById('calcType');
const singleGroup = document.getElementById('singleGroup');
const numberInput = document.getElementById('numberInput');
const powerInput = document.getElementById('powerInput');
const rangeGroup = document.getElementById('rangeGroup');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const maxSearchGroup = document.getElementById('maxSearchGroup');
const maxSearchInput = document.getElementById('maxSearchInput');
const maxBaseGroup = document.getElementById('maxBaseGroup');
const maxBaseInput = document.getElementById('maxBaseInput');
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
    let html = '<div class="result-happy">';

    switch (data.calculationType) {
        case 'check':
            html += `<h4>Happy Number Check (Power: ${r.power})</h4>`;
            html += `<div class="check-result ${r.isHappy ? 'is-happy' : 'not-happy'}">`;
            html += `<span class="status">${r.isHappy ? 'HAPPY' : 'SAD'}</span>`;
            html += `</div>`;
            html += `<p class="step-count">Steps: ${r.steps}</p>`;
            if (r.cycleStart !== null) {
                html += `<p class="cycle-info">Enters cycle at position ${r.cycleStart} (length: ${r.cycleLength})</p>`;
            }
            html += '<h5>Sequence</h5><div class="sequence">';
            r.path.forEach((val, i) => {
                html += `<span class="seq-item${val === '1' ? ' final' : ''}">${val}</span>`;
                if (i < r.path.length - 1) html += '<span class="arrow">→</span>';
            });
            if (r.pathTruncated) html += '<span class="truncated">...</span>';
            html += '</div>';
            break;

        case 'findInRange':
            html += `<h4>Happy Numbers (Power: ${r.power})</h4>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Total Numbers</td><td>${r.total.toLocaleString()}</td></tr>`;
            html += `<tr><td>Happy Numbers</td><td class="highlight happy">${r.happyCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Sad Numbers</td><td class="sad">${r.unhappyCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Happy Density</td><td>${r.density}%</td></tr>`;
            html += '</tbody></table>';
            html += '<h5>Happy Numbers</h5><div class="happy-list">';
            r.happy.forEach(h => {
                html += `<span class="happy-item" title="Steps: ${h.steps}">${h.number}</span>`;
            });
            html += '</div>';
            break;

        case 'sequence':
            html += `<h4>Sequence for ${r.number} (Power: ${r.power})</h4>`;
            html += `<p class="result-status ${r.isHappy ? 'happy' : 'sad'}">${r.isHappy ? 'Happy Number' : 'Sad Number'}</p>`;
            if (r.cycleStart >= 0) {
                html += `<p class="cycle-info">Cycle starts at step ${r.cycleStart} (length: ${r.cycleLength})</p>`;
            }
            html += '<h5>Step-by-Step</h5>';
            html += '<table class="result-table"><thead><tr><th>Step</th><th>Value</th><th>Calculation</th></tr></thead><tbody>';
            r.sequence.forEach((s, i) => {
                const rowClass = s.cycleBack ? 'cycle-back' : (s.value === '1' ? 'final' : '');
                html += `<tr class="${rowClass}"><td>${i}</td><td class="number-value">${s.value}</td><td class="formula">${s.sum || '-'}</td></tr>`;
            });
            html += '</tbody></table>';
            if (r.truncated) html += '<p class="truncated-note">Sequence truncated at 100 steps</p>';
            break;

        case 'statistics':
            html += '<h4>Happy Number Statistics</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Total</td><td>${r.total.toLocaleString()}</td></tr>`;
            html += `<tr><td>Happy</td><td class="highlight">${r.happyCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Sad</td><td>${r.unhappyCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Density</td><td>${r.happyDensity}%</td></tr>`;
            html += `<tr><td>Max Steps</td><td>${r.maxSteps} (${r.maxStepsNumber})</td></tr>`;
            html += '</tbody></table>';
            html += '<h5>Steps Distribution</h5><div class="distribution">';
            const maxCount = Math.max(...r.stepDistribution.map(d => d.count));
            r.stepDistribution.forEach(d => {
                const pct = (d.count / maxCount) * 100;
                html += `<div class="dist-bar"><span class="label">${d.steps}</span>`;
                html += `<div class="bar" style="width:${pct}%"></div>`;
                html += `<span class="value">${d.count.toLocaleString()}</span></div>`;
            });
            html += '</div>';
            break;

        case 'cycles':
            html += `<h4>Unhappy Number Cycles (Power: ${r.power})</h4>`;
            html += `<p class="total-count">Found ${r.cycleCount} unique cycle(s) in 1-${r.searchRange}</p>`;
            r.cycles.forEach((c, i) => {
                html += `<div class="cycle-box"><h5>Cycle ${i + 1} (Length: ${c.length})</h5>`;
                html += '<div class="cycle-sequence">';
                c.cycle.forEach((val, j) => {
                    html += `<span class="cycle-item">${val}</span>`;
                    if (j < c.cycle.length - 1) html += '<span class="arrow">→</span>';
                });
                html += '<span class="arrow">→</span><span class="cycle-item back">' + c.cycle[0] + '</span>';
                html += '</div>';
                html += `<p class="cycle-examples">Examples: ${c.examples.join(', ')}</p></div>`;
            });
            break;

        case 'happyBases':
            html += `<h4>Happy in Different Bases: ${r.number}</h4>`;
            html += `<p class="happy-count">Happy in ${r.happyCount}/${r.maxBase - 1} bases</p>`;
            html += '<table class="result-table"><thead><tr><th>Base</th><th>Representation</th><th>Happy?</th><th>Steps</th></tr></thead><tbody>';
            r.results.forEach(res => {
                const status = res.isHappy ? '<span class="yes">Yes</span>' : '<span class="no">No</span>';
                html += `<tr class="${res.isHappy ? 'happy-row' : ''}"><td>${res.base}</td><td class="number-value">${res.representation}</td><td>${status}</td><td>${res.steps}</td></tr>`;
            });
            html += '</tbody></table>';
            if (r.happyBases.length > 0) {
                html += `<p class="summary">Happy in bases: ${r.happyBases.join(', ')}</p>`;
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
    singleGroup.classList.toggle('hidden', type === 'findInRange' || type === 'statistics');
    rangeGroup.classList.toggle('hidden', type !== 'findInRange' && type !== 'statistics');
    maxSearchGroup.classList.toggle('hidden', type !== 'cycles');
    maxBaseGroup.classList.toggle('hidden', type !== 'happyBases');
    powerInput.parentElement.classList.toggle('hidden', type === 'happyBases');
}

function startCalculation() {
    const type = calcTypeSelect.value;
    const power = parseInt(powerInput.value) || 2;
    setCalculatingUI();
    initWorker();

    switch (type) {
        case 'check':
            const num = numberInput.value.trim();
            if (!num || !/^\d+$/.test(num)) { displayError('Enter a valid positive integer'); return; }
            worker.postMessage({ type: 'check', number: num, power });
            break;

        case 'findInRange':
            const start = startInput.value.trim();
            const end = endInput.value.trim();
            if (!start || !end) { displayError('Enter valid range'); return; }
            if (BigInt(end) - BigInt(start) > 1000000n) { displayError('Range too large (max 1M)'); return; }
            worker.postMessage({ type: 'findInRange', start, end, power });
            break;

        case 'sequence':
            const numS = numberInput.value.trim();
            if (!numS || !/^\d+$/.test(numS)) { displayError('Enter a valid positive integer'); return; }
            worker.postMessage({ type: 'sequence', number: numS, power });
            break;

        case 'statistics':
            const startSt = startInput.value.trim();
            const endSt = endInput.value.trim();
            if (!startSt || !endSt) { displayError('Enter valid range'); return; }
            if (BigInt(endSt) - BigInt(startSt) > 1000000n) { displayError('Range too large (max 1M)'); return; }
            worker.postMessage({ type: 'statistics', start: startSt, end: endSt });
            break;

        case 'cycles':
            const maxSearch = parseInt(maxSearchInput.value) || 1000;
            worker.postMessage({ type: 'cycles', power, maxSearch });
            break;

        case 'happyBases':
            const numB = numberInput.value.trim();
            if (!numB || !/^\d+$/.test(numB)) { displayError('Enter a valid positive integer'); return; }
            const maxBase = parseInt(maxBaseInput.value) || 16;
            worker.postMessage({ type: 'happyBases', number: numB, maxBase });
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
