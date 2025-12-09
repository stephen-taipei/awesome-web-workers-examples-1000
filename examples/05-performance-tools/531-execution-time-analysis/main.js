const runBtn = document.getElementById('runBtn');
const reportTable = document.getElementById('reportTable');

let worker;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, report } = e.data;
        if (type === 'report') {
            renderReport(report);
            runBtn.disabled = false;
            runBtn.textContent = '再次執行';
        }
    };
}

function renderReport(report) {
    if (Object.keys(report).length === 0) {
        reportTable.innerHTML = '無數據';
        return;
    }

    // Sort by total time desc
    const items = Object.entries(report).sort((a, b) => b[1].total - a[1].total);

    let html = `
    <table style="width:100%; border-collapse: collapse; color: #eee;">
        <thead>
            <tr style="border-bottom: 2px solid #10b981; text-align: left;">
                <th style="padding: 8px;">函數名稱</th>
                <th style="padding: 8px;">呼叫次數</th>
                <th style="padding: 8px;">總時間 (ms)</th>
                <th style="padding: 8px;">平均時間 (ms)</th>
            </tr>
        </thead>
        <tbody>
    `;

    items.forEach(([name, data]) => {
        html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 8px; color: #a7f3d0;">${name}</td>
            <td style="padding: 8px;">${data.calls}</td>
            <td style="padding: 8px;">${data.total.toFixed(3)}</td>
            <td style="padding: 8px;">${(data.total / data.calls).toFixed(3)}</td>
        </tr>
        `;
    });

    html += '</tbody></table>';
    reportTable.innerHTML = html;
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    runBtn.disabled = true;
    runBtn.textContent = '分析中...';
    reportTable.innerHTML = '<p style="text-align:center; color:#a7f3d0;">正在執行並分析任務...</p>';

    worker.postMessage({ action: 'run' });
});

initWorker();
