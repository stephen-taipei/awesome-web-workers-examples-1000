// Main thread script

const worker = new Worker('worker.js');
const ringCanvas = document.getElementById('ringCanvas');
const ctx = ringCanvas.getContext('2d');
const logContainer = document.getElementById('log');
const nodeList = document.getElementById('nodeList');
const statsDiv = document.getElementById('stats');

let currentState = {
    nodes: [],
    ring: [],
    keys: [],
    virtualNodesPerNode: 5
};

let selectedNodeId = null;

// Helper to log messages
function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-timestamp">[${time}]</span>${message}`;
    logContainer.prepend(entry);
}

// Draw the Consistent Hashing Ring
function draw() {
    ctx.clearRect(0, 0, ringCanvas.width, ringCanvas.height);

    const centerX = ringCanvas.width / 2;
    const centerY = ringCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 50;

    // Draw ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Draw virtual nodes
    currentState.ring.forEach(item => {
        const angle = (item.hash / 4294967296) * 2 * Math.PI - (Math.PI / 2); // Map 32-bit hash to angle
        const node = currentState.nodes.find(n => n.id === item.nodeId);

        if (node) {
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });

    // Draw keys and connection lines
    currentState.keys.forEach(key => {
        const angle = (key.hash / 4294967296) * 2 * Math.PI - (Math.PI / 2);

        const keyX = centerX + Math.cos(angle) * (radius - 30);
        const keyY = centerY + Math.sin(angle) * (radius - 30);

        // Draw connection to assigned node
        const assignedNode = currentState.nodes.find(n => n.id === key.assignedNodeId);
        if (assignedNode) {
             // Find the specific virtual node on the ring that is responsible for this key
             // It's the first virtual node with hash >= key.hash
             let targetVirtualNode = currentState.ring.find(item => item.hash >= key.hash);
             if (!targetVirtualNode && currentState.ring.length > 0) {
                 targetVirtualNode = currentState.ring[0];
             }

             if (targetVirtualNode) {
                 const targetAngle = (targetVirtualNode.hash / 4294967296) * 2 * Math.PI - (Math.PI / 2);
                 const targetX = centerX + Math.cos(targetAngle) * radius;
                 const targetY = centerY + Math.sin(targetAngle) * radius;

                 ctx.beginPath();
                 ctx.moveTo(keyX, keyY);
                 ctx.lineTo(targetX, targetY);
                 ctx.strokeStyle = assignedNode.color;
                 ctx.lineWidth = 1;
                 ctx.setLineDash([2, 2]);
                 ctx.stroke();
                 ctx.setLineDash([]);
             }
        }

        // Draw key point
        ctx.beginPath();
        ctx.arc(keyX, keyY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();

        // Label for key (optional, might clutter)
        // ctx.fillStyle = '#000';
        // ctx.fillText(key.name, keyX + 10, keyY);
    });
}

function updateUI() {
    // Update Node List
    nodeList.innerHTML = '';
    currentState.nodes.forEach(node => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="color-box" style="background-color: ${node.color}"></span>
                ${node.name}
            </div>
            <span>${node.id}</span>
        `;
        if (selectedNodeId === node.id) {
            li.classList.add('selected');
        }
        li.onclick = () => {
            selectedNodeId = node.id;
            updateUI();
        };
        nodeList.appendChild(li);
    });

    // Update Stats
    const counts = {};
    currentState.nodes.forEach(n => counts[n.id] = 0);
    currentState.keys.forEach(k => {
        if (counts[k.assignedNodeId] !== undefined) {
            counts[k.assignedNodeId]++;
        }
    });

    let statsHtml = '';
    let totalKeys = currentState.keys.length;

    currentState.nodes.forEach(node => {
        const count = counts[node.id];
        const percent = totalKeys > 0 ? ((count / totalKeys) * 100).toFixed(1) : 0;
        statsHtml += `
            <div style="margin-bottom: 5px;">
                <span style="color: ${node.color}; font-weight: bold;">${node.name}</span>:
                ${count} keys (${percent}%)
            </div>
        `;
    });
    statsDiv.innerHTML = statsHtml;

    draw();
}

// Worker Communication
worker.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'stateUpdate') {
        currentState = payload;
        updateUI();
    } else if (type === 'log') {
        log(payload);
    }
};

// Event Listeners
document.getElementById('updateSettings').addEventListener('click', () => {
    const vNodes = parseInt(document.getElementById('virtualNodes').value);
    if (vNodes > 0 && vNodes <= 50) {
        worker.postMessage({ type: 'setVirtualNodes', payload: vNodes });
    } else {
        alert('請輸入 1 到 50 之間的數字');
    }
});

document.getElementById('addNode').addEventListener('click', () => {
    const name = document.getElementById('nodeName').value.trim();
    if (name) {
        worker.postMessage({ type: 'addNode', payload: { name } });
        document.getElementById('nodeName').value = '';
    }
});

document.getElementById('removeNode').addEventListener('click', () => {
    if (selectedNodeId) {
        worker.postMessage({ type: 'removeNode', payload: { id: selectedNodeId } });
        selectedNodeId = null;
    } else {
        alert('請先選擇一個節點');
    }
});

document.getElementById('addKey').addEventListener('click', () => {
    const name = document.getElementById('keyName').value.trim();
    if (name) {
        worker.postMessage({ type: 'addKey', payload: { name } });
        document.getElementById('keyName').value = '';
    }
});

document.getElementById('clearKeys').addEventListener('click', () => {
    worker.postMessage({ type: 'clearKeys' });
});

// Initialize with some data
worker.postMessage({ type: 'addNode', payload: { name: 'Server A' } });
worker.postMessage({ type: 'addNode', payload: { name: 'Server B' } });
worker.postMessage({ type: 'addNode', payload: { name: 'Server C' } });

// Add some random keys
setTimeout(() => {
    for (let i = 1; i <= 20; i++) {
        worker.postMessage({ type: 'addKey', payload: { name: `data_${i}` } });
    }
}, 500);
