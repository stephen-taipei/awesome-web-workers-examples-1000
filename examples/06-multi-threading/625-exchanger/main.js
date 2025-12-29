/**
 * #625 Exchanger Pattern
 */
let workers = [], workerData = [0, 0];
const channel = new MessageChannel();

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    document.getElementById('log').innerHTML = '';

    for (let i = 0; i < 2; i++) {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            if (e.data.type === 'update') {
                workerData[i] = e.data.value;
                updateDisplay();
            } else if (e.data.type === 'exchanged') {
                log(`Worker ${i}: Sent ${e.data.sent}, Received ${e.data.received}`);
            }
        };
        worker.postMessage({ type: 'init', id: i, port: i === 0 ? channel.port1 : channel.port2 }, [i === 0 ? channel.port1 : channel.port2]);
        worker.postMessage({ type: 'start' });
        workers.push(worker);
    }
}

function updateDisplay() {
    document.getElementById('workers').innerHTML = workerData.map((v, i) => `
        <div style="padding:30px;background:var(--bg-secondary);border-radius:8px;text-align:center;min-width:150px;">
            <div style="font-size:0.9rem;color:var(--text-muted);">Worker ${i}</div>
            <div style="font-size:2rem;color:var(--primary-color);font-weight:bold;">${v}</div>
        </div>
    `).join('<div style="font-size:2rem;color:var(--success-color);">⇄</div>');
}

function log(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px;border-bottom:1px solid var(--border-color);';
    div.textContent = msg;
    document.getElementById('log').insertBefore(div, document.getElementById('log').firstChild);
}

updateDisplay();
