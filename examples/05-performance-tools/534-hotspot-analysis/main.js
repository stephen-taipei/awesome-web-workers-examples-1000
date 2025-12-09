const runBtn = document.getElementById('runBtn');
const hotspotChart = document.getElementById('hotspotChart');

let worker;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'report') {
            renderHotspots(e.data.hotspots);
            runBtn.disabled = false;
        }
    };
}

function renderHotspots(hotspots) {
    hotspotChart.innerHTML = '';

    // hotspots is array of { name, selfTime }
    const totalTime = hotspots.reduce((acc, cur) => acc + cur.selfTime, 0);

    hotspots.sort((a, b) => b.selfTime - a.selfTime);

    hotspots.forEach(item => {
        const percent = (item.selfTime / totalTime) * 100;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '0.5rem';

        const label = document.createElement('div');
        label.style.width = '150px';
        label.style.color = '#a7f3d0';
        label.textContent = item.name;

        const barContainer = document.createElement('div');
        barContainer.style.flex = '1';
        barContainer.style.background = 'rgba(255,255,255,0.1)';
        barContainer.style.borderRadius = '4px';
        barContainer.style.height = '24px';
        barContainer.style.position = 'relative';

        const bar = document.createElement('div');
        bar.style.width = `${percent}%`;
        bar.style.height = '100%';
        bar.style.background = percent > 50 ? '#f87171' : (percent > 20 ? '#fbbf24' : '#3b82f6');
        bar.style.borderRadius = '4px';

        const text = document.createElement('span');
        text.style.position = 'absolute';
        text.style.right = '5px';
        text.style.top = '2px';
        text.style.color = '#fff';
        text.style.fontSize = '0.85rem';
        text.textContent = `${item.selfTime.toFixed(1)}ms (${percent.toFixed(1)}%)`;

        barContainer.appendChild(bar);
        barContainer.appendChild(text);

        row.appendChild(label);
        row.appendChild(barContainer);

        hotspotChart.appendChild(row);
    });
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    runBtn.disabled = true;
    hotspotChart.innerHTML = '<p style="text-align:center; color:#666;">分析中...</p>';
    worker.postMessage({ action: 'run' });
});

initWorker();
