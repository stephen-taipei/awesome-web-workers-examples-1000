const startBtn = document.getElementById('startBtn');
const resultsList = document.getElementById('resultsList');
const finalScoreArea = document.getElementById('finalScoreArea');
const finalScoreEl = document.getElementById('finalScore');

let worker;

const tests = [
    { id: 'integer', name: '整數運算 (Integer Math)' },
    { id: 'float', name: '浮點運算 (Floating Point)' },
    { id: 'memory', name: '記憶體讀寫 (Memory Access)' },
    { id: 'json', name: 'JSON 序列化 (JSON Processing)' }
];

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, testId, result, score } = e.data;

        if (type === 'testComplete') {
            updateTestResult(testId, result, score);
        } else if (type === 'allComplete') {
            const { totalScore } = e.data;
            showFinalScore(totalScore);
            startBtn.disabled = false;
            startBtn.textContent = '再次測試';
        }
    };
}

function updateTestResult(testId, resultText, score) {
    const el = document.getElementById(`test-${testId}`);
    if (el) {
        const status = el.querySelector('.test-status');
        const scoreEl = el.querySelector('.test-score');
        status.textContent = resultText;
        status.style.color = '#fff';
        scoreEl.textContent = score.toFixed(0);

        // simple progress bar effect
        el.style.background = 'linear-gradient(90deg, rgba(16,185,129,0.2) 100%, rgba(0,0,0,0) 100%)';
    }
}

function showFinalScore(score) {
    finalScoreArea.style.display = 'block';

    // Counter animation
    let current = 0;
    const increment = Math.ceil(score / 50);
    const timer = setInterval(() => {
        current += increment;
        if (current >= score) {
            current = score;
            clearInterval(timer);
        }
        finalScoreEl.textContent = current;
    }, 20);
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    startBtn.disabled = true;
    startBtn.textContent = '測試中...';
    finalScoreArea.style.display = 'none';

    // Reset UI
    resultsList.innerHTML = '';
    tests.forEach(test => {
        const div = document.createElement('div');
        div.id = `test-${test.id}`;
        div.className = 'result-item';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.background = 'rgba(0,0,0,0.3)';
        div.style.marginBottom = '0.5rem';
        div.style.transition = 'background 0.5s';

        div.innerHTML = `
            <div>
                <div style="font-weight:bold; color:#a7f3d0;">${test.name}</div>
                <div class="test-status" style="font-size:0.85rem; color:#666;">等待中...</div>
            </div>
            <div class="test-score" style="font-size:1.5rem; font-weight:bold; color:#fbbf24;">-</div>
        `;
        resultsList.appendChild(div);
    });

    worker.postMessage({ action: 'start' });
});

initWorker();
