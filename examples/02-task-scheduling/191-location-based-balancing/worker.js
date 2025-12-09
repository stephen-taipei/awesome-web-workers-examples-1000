// Location Based Balancing Worker

// Simplified world map: 800x500 coordinates
// Data Centers (DCs)
const dataCenters = [
    { id: 'na-east', name: 'US East (Virginia)', x: 220, y: 160, color: '#e74c3c', requests: 0 },
    { id: 'na-west', name: 'US West (California)', x: 130, y: 170, color: '#e67e22', requests: 0 },
    { id: 'eu-west', name: 'Europe West (London)', x: 410, y: 130, color: '#3498db', requests: 0 },
    { id: 'asia-east', name: 'Asia East (Tokyo)', x: 680, y: 170, color: '#9b59b6', requests: 0 },
    { id: 'asia-se', name: 'Asia SE (Singapore)', x: 620, y: 260, color: '#2ecc71', requests: 0 },
    { id: 'sa-east', name: 'SA East (São Paulo)', x: 280, y: 350, color: '#f1c40f', requests: 0 },
    { id: 'au-se', name: 'Australia SE (Sydney)', x: 720, y: 380, color: '#1abc9c', requests: 0 }
];

let requests = []; // { x, y, dcId, timestamp }
let isAutoMode = false;
let autoInterval = null;

// Helper: Calculate Euclidean distance
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Find nearest Data Center
function findNearestDC(x, y) {
    let minDist = Infinity;
    let nearestDC = null;

    for (const dc of dataCenters) {
        const dist = getDistance(x, y, dc.x, dc.y);
        if (dist < minDist) {
            minDist = dist;
            nearestDC = dc;
        }
    }
    return { dc: nearestDC, distance: minDist };
}

function processRequest(x, y) {
    const { dc, distance } = findNearestDC(x, y);

    // Simulate latency based on distance (1px approx 10km, speed of light + overhead)
    // Simplified: latency (ms) = distance / 2
    const latency = Math.round(distance / 2);

    // Update DC stats
    const targetDC = dataCenters.find(d => d.id === dc.id);
    targetDC.requests++;

    const request = {
        x,
        y,
        dcId: dc.id,
        timestamp: Date.now(),
        latency
    };

    requests.push(request);

    // Limit stored requests
    if (requests.length > 200) requests.shift();

    self.postMessage({
        type: 'requestProcessed',
        payload: {
            request,
            dcName: dc.name
        }
    });

    sendState();
}

function sendState() {
    self.postMessage({
        type: 'update',
        payload: {
            dataCenters,
            requests
        }
    });
}

function autoGenerate() {
    // Generate random coordinates (biased towards land masses roughly)
    // Simple random for now
    const x = Math.random() * 800;
    const y = Math.random() * 500;
    processRequest(x, y);
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            sendState();
            break;

        case 'newRequest':
            processRequest(payload.x, payload.y);
            break;

        case 'setAutoMode':
            isAutoMode = payload;
            if (isAutoMode) {
                if (!autoInterval) autoInterval = setInterval(autoGenerate, 500);
            } else {
                if (autoInterval) {
                    clearInterval(autoInterval);
                    autoInterval = null;
                }
            }
            break;

        case 'reset':
            requests = [];
            dataCenters.forEach(dc => dc.requests = 0);
            sendState();
            self.postMessage({ type: 'log', payload: '已重置所有請求統計' });
            break;
    }
};
