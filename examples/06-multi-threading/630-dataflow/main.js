/**
 * #630 Dataflow Pattern
 */
const nodes = {
    A: { deps: [], op: 'input', value: 10 },
    B: { deps: [], op: 'input', value: 5 },
    C: { deps: ['A', 'B'], op: 'add' },
    D: { deps: ['A'], op: 'double' },
    E: { deps: ['C', 'D'], op: 'multiply' }
};

let results = {}, workers = [];

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    workers.forEach(w => w.terminate());
    workers = [];
    results = {};

    renderGraph();
    Object.keys(nodes).forEach(id => {
        if (nodes[id].deps.length === 0) {
            results[id] = nodes[id].value;
            updateNode(id, nodes[id].value);
            checkDependents(id);
        }
    });
}

function checkDependents(completedId) {
    Object.entries(nodes).forEach(([id, node]) => {
        if (results[id] !== undefined) return;
        const ready = node.deps.every(dep => results[dep] !== undefined);
        if (ready) executeNode(id, node);
    });
}

function executeNode(id, node) {
    const inputs = node.deps.map(d => results[d]);
    const worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        results[id] = e.data.result;
        updateNode(id, e.data.result);
        checkDependents(id);
    };
    worker.postMessage({ op: node.op, inputs });
    workers.push(worker);
}

function renderGraph() {
    document.getElementById('graph').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:20px;">
            <div style="display:flex;gap:40px;">
                <div id="node-A" class="node">A: 10</div>
                <div id="node-B" class="node">B: 5</div>
            </div>
            <div style="display:flex;gap:40px;">
                <div id="node-C" class="node">C: ?</div>
                <div id="node-D" class="node">D: ?</div>
            </div>
            <div id="node-E" class="node">E: ?</div>
        </div>
        <style>.node{padding:20px 30px;background:var(--bg-secondary);border-radius:8px;text-align:center;min-width:80px;}</style>
    `;
}

function updateNode(id, value) {
    const el = document.getElementById(`node-${id}`);
    el.innerHTML = `${id}: ${value}`;
    el.style.background = 'var(--success-color)';
    el.style.color = 'white';
}
