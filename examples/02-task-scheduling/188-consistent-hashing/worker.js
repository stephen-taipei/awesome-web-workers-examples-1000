// Consistent Hashing Worker

// A simple implementation of FNV-1a hash function
function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // Ensure unsigned 32-bit integer
}

const MAX_HASH = 4294967296; // 2^32

// State
let virtualNodesPerNode = 5;
let nodes = new Map(); // id -> { id, name, color }
let ring = []; // Array of { hash, nodeId, isVirtual }
let keys = new Map(); // keyId -> { id, name, assignedNodeId }

// Colors for nodes
const COLORS = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#33FFF5',
    '#FFC300', '#DAF7A6', '#C70039', '#900C3F', '#581845'
];

function getNextColor() {
    return COLORS[nodes.size % COLORS.length];
}

function rebuildRing() {
    ring = [];
    for (const [nodeId, node] of nodes) {
        for (let i = 0; i < virtualNodesPerNode; i++) {
            const virtualNodeId = `${nodeId}-v${i}`;
            const hash = hashString(virtualNodeId);
            ring.push({
                hash: hash,
                nodeId: nodeId,
                isVirtual: true,
                virtualId: virtualNodeId
            });
        }
    }
    ring.sort((a, b) => a.hash - b.hash);
}

function findNodeForKey(keyHash) {
    if (ring.length === 0) return null;

    // Find the first node with hash >= keyHash
    const index = ring.findIndex(item => item.hash >= keyHash);

    if (index === -1) {
        // Wrap around to the first node
        return ring[0].nodeId;
    }

    return ring[index].nodeId;
}

function rebalanceKeys() {
    for (const [keyId, key] of keys) {
        const hash = hashString(keyId);
        const assignedNodeId = findNodeForKey(hash);
        keys.set(keyId, { ...key, assignedNodeId });
    }
}

function sendState() {
    self.postMessage({
        type: 'stateUpdate',
        payload: {
            nodes: Array.from(nodes.values()),
            ring: ring,
            keys: Array.from(keys.values()),
            virtualNodesPerNode
        }
    });
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'setVirtualNodes':
            virtualNodesPerNode = payload;
            rebuildRing();
            rebalanceKeys();
            sendState();
            break;

        case 'addNode':
            const nodeId = payload.name; // Use name as ID for simplicity
            if (!nodes.has(nodeId)) {
                nodes.set(nodeId, {
                    id: nodeId,
                    name: payload.name,
                    color: getNextColor()
                });
                rebuildRing();
                rebalanceKeys();
                sendState();
                self.postMessage({ type: 'log', payload: `Added node: ${payload.name}` });
            }
            break;

        case 'removeNode':
            if (nodes.has(payload.id)) {
                nodes.delete(payload.id);
                rebuildRing();
                rebalanceKeys();
                sendState();
                self.postMessage({ type: 'log', payload: `Removed node: ${payload.id}` });
            }
            break;

        case 'addKey':
            const keyName = payload.name;
            const keyHash = hashString(keyName);
            const assignedNodeId = findNodeForKey(keyHash);

            keys.set(keyName, {
                id: keyName,
                name: keyName,
                hash: keyHash,
                assignedNodeId
            });

            sendState();
            self.postMessage({
                type: 'log',
                payload: `Added key: ${keyName} -> Node: ${assignedNodeId || 'None'}`
            });
            break;

        case 'clearKeys':
            keys.clear();
            sendState();
            self.postMessage({ type: 'log', payload: 'Cleared all keys' });
            break;
    }
};
