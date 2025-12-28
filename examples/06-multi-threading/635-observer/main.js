/**
 * #635 Observer Pattern
 */
let observers = [], subjectState = 0;

document.getElementById('init-btn').addEventListener('click', init);
document.getElementById('update-btn').addEventListener('click', updateSubject);

function init() {
    observers.forEach(o => o.worker.terminate());
    observers = [];

    for (let i = 0; i < 4; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            observers[i].lastValue = e.data.value;
            observers[i].updates = (observers[i].updates || 0) + 1;
            updateDisplay();
        };
        worker.postMessage({ type: 'init', id: i });
        observers.push({ id: i, worker, lastValue: null, updates: 0 });
    }

    document.getElementById('update-btn').disabled = false;
    updateDisplay();
}

function updateSubject() {
    subjectState = Math.floor(Math.random() * 100);
    document.getElementById('subject').textContent = subjectState;

    // Notify all observers
    observers.forEach(o => {
        o.worker.postMessage({ type: 'notify', value: subjectState });
    });
}

function updateDisplay() {
    document.getElementById('observers').innerHTML = observers.map(o => `
        <div style="padding:15px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;display:flex;justify-content:space-between;">
            <span>Observer ${o.id}</span>
            <span>Value: <strong style="color:var(--primary-color);">${o.lastValue !== null ? o.lastValue : '-'}</strong></span>
            <span style="color:var(--text-muted);">Updates: ${o.updates}</span>
        </div>
    `).join('');
}
