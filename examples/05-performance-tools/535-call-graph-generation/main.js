const runBtn = document.getElementById('runBtn');
const graphContainer = document.getElementById('graphContainer');

let worker;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        if (e.data.type === 'graph') {
            renderGraph(e.data.root);
            runBtn.disabled = false;
        }
    };
}

function renderGraph(node, container = graphContainer) {
    if (container === graphContainer) container.innerHTML = '';

    const nodeEl = document.createElement('div');
    nodeEl.innerHTML = `<span class="node">${node.name} (${node.count} calls)</span>`;
    container.appendChild(nodeEl);

    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'edge';
        container.appendChild(childrenContainer);

        node.children.forEach(child => renderGraph(child, childrenContainer));
    }
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    runBtn.disabled = true;
    worker.postMessage({ action: 'run' });
});

initWorker();
