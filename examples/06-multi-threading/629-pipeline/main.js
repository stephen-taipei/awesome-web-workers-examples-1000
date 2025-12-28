/**
 * #629 Pipeline Pattern
 */
const stages = ['double', 'square', 'add100', 'half'];
let workers = [];

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    const input = parseInt(document.getElementById('input').value);
    workers.forEach(w => w.terminate());
    workers = [];

    const stagesDiv = document.getElementById('stages');
    stagesDiv.innerHTML = `
        <div style="padding:20px;background:var(--primary-color);color:white;border-radius:8px;">Input<br><strong>${input}</strong></div>
    `;

    stages.forEach((stage, i) => {
        stagesDiv.innerHTML += `
            <div style="font-size:2rem;color:var(--text-muted);">→</div>
            <div id="stage-${i}" style="padding:20px;background:var(--bg-secondary);border-radius:8px;min-width:80px;text-align:center;">
                ${stage}<br><strong>...</strong>
            </div>
        `;
    });

    processPipeline(input, 0);
}

function processPipeline(value, stageIndex) {
    if (stageIndex >= stages.length) return;

    const worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        const el = document.getElementById(`stage-${stageIndex}`);
        el.style.background = 'var(--success-color)';
        el.style.color = 'white';
        el.innerHTML = `${stages[stageIndex]}<br><strong>${e.data.result}</strong>`;

        workers.push(worker);
        processPipeline(e.data.result, stageIndex + 1);
    };
    worker.postMessage({ value, operation: stages[stageIndex] });
}
