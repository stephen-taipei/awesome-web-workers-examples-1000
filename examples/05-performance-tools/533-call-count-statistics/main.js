const runBtn = document.getElementById('runBtn');
const statsChart = document.getElementById('statsChart');

let worker;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'report') {
            renderStats(e.data.counts);
            runBtn.disabled = false;
        }
    };
}

function renderStats(counts) {
    statsChart.innerHTML = '';

    // Convert to array and sort
    const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxVal = items[0][1];

    items.forEach(([name, count]) => {
        const percent = (count / maxVal) * 100;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '0.5rem';

        const label = document.createElement('div');
        label.style.width = '150px';
        label.style.color = '#a7f3d0';
        label.textContent = name;

        const barContainer = document.createElement('div');
        barContainer.style.flex = '1';
        barContainer.style.background = 'rgba(255,255,255,0.1)';
        barContainer.style.borderRadius = '4px';
        barContainer.style.height = '24px';
        barContainer.style.position = 'relative';

        const bar = document.createElement('div');
        bar.style.width = `${percent}%`;
        bar.style.height = '100%';
        bar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
        bar.style.borderRadius = '4px';
        bar.style.transition = 'width 0.5s';

        const text = document.createElement('span');
        text.style.position = 'absolute';
        text.style.right = '5px';
        text.style.top = '2px';
        text.style.color = '#fff';
        text.style.fontSize = '0.85rem';
        text.textContent = count.toLocaleString();

        barContainer.appendChild(bar);
        barContainer.appendChild(text);

        row.appendChild(label);
        row.appendChild(barContainer);

        statsChart.appendChild(row);
    });
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    runBtn.disabled = true;
    worker.postMessage({ action: 'run' });
});

initWorker();
