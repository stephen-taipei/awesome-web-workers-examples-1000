/**
 * #631 Actor Model
 */
let actors = new Map();

document.getElementById('create-btn').addEventListener('click', createActors);
document.getElementById('send-btn').addEventListener('click', sendMessages);

function createActors() {
    actors.forEach(a => a.worker.terminate());
    actors.clear();

    ['Counter', 'Printer', 'Accumulator'].forEach((name, i) => {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            log(`${name}: ${e.data.message}`);
            updateActorState(name, e.data.state);
        };
        worker.postMessage({ type: 'init', name });
        actors.set(name, { worker, state: 0 });
    });

    updateActors();
    document.getElementById('send-btn').disabled = false;
}

function sendMessages() {
    actors.get('Counter').worker.postMessage({ type: 'increment' });
    actors.get('Counter').worker.postMessage({ type: 'increment' });
    actors.get('Accumulator').worker.postMessage({ type: 'add', value: 10 });
    actors.get('Printer').worker.postMessage({ type: 'print', text: 'Hello Actor!' });
}

function updateActorState(name, state) {
    const actor = actors.get(name);
    if (actor) {
        actor.state = state;
        updateActors();
    }
}

function updateActors() {
    document.getElementById('actors').innerHTML = Array.from(actors.entries()).map(([name, data]) => `
        <div style="padding:15px;background:var(--bg-secondary);margin:5px 0;border-radius:8px;display:flex;justify-content:space-between;">
            <strong>${name}</strong>
            <span style="color:var(--primary-color);">State: ${data.state}</span>
        </div>
    `).join('');
}

function log(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:5px;border-bottom:1px solid var(--border-color);font-size:0.9rem;';
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    document.getElementById('log').insertBefore(div, document.getElementById('log').firstChild);
}
