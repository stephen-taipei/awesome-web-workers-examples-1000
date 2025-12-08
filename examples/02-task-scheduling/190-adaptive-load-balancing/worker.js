// Adaptive Load Balancing Worker

const SERVER_COUNT = 4;
let servers = [];
let config = {
    algorithm: 'roundRobin',
    requestRate: 50 // requests per second (approx)
};
let isRunning = false;
let requestInterval = null;
let simulationInterval = null;

// Metrics
let totalRequests = 0;
let totalLatency = 0;
let completedRequests = 0;
let errorCount = 0;

// Algorithm State
let rrIndex = 0; // For Round Robin

function initServers() {
    servers = [];
    for (let i = 0; i < SERVER_COUNT; i++) {
        servers.push({
            id: i,
            name: `Server ${i+1}`,
            activeRequests: 0,
            baseLatency: 100 + Math.random() * 50, // Base latency ms
            addedLatency: 0, // Artificial latency added by user
            isDown: false,
            // Stats for adaptive algorithm
            avgResponseTime: 100, // EMA
            successRate: 1.0
        });
    }
}

// EMA Alpha for response time smoothing
const ALPHA = 0.2;

// --- Load Balancing Algorithms ---

function getRoundRobinServer() {
    let attempts = 0;
    while (attempts < SERVER_COUNT) {
        const server = servers[rrIndex];
        rrIndex = (rrIndex + 1) % SERVER_COUNT;
        if (!server.isDown) return server;
        attempts++;
    }
    return null; // All down
}

function getRandomServer() {
    const available = servers.filter(s => !s.isDown);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

function getLeastConnectionsServer() {
    const available = servers.filter(s => !s.isDown);
    if (available.length === 0) return null;

    // Sort by active requests
    return available.reduce((min, curr) =>
        curr.activeRequests < min.activeRequests ? curr : min
    , available[0]);
}

function getAdaptiveServer() {
    const available = servers.filter(s => !s.isDown);
    if (available.length === 0) return null;

    // Score based on estimated response time and active connections
    // Lower score is better.
    // Score = Predicted Latency * (1 + Active Requests) (Simple penalty)
    // Or just pick minimal estimated response time?
    // Let's use: Score = AvgResponseTime * (1 + ActiveRequests / CapacityFactor)

    return available.reduce((best, curr) => {
        const currScore = curr.avgResponseTime * (1 + curr.activeRequests * 0.1);
        const bestScore = best.avgResponseTime * (1 + best.activeRequests * 0.1);
        return currScore < bestScore ? curr : best;
    }, available[0]);
}

function selectServer() {
    switch (config.algorithm) {
        case 'roundRobin': return getRoundRobinServer();
        case 'random': return getRandomServer();
        case 'leastConnections': return getLeastConnectionsServer();
        case 'adaptive': return getAdaptiveServer();
        default: return getRoundRobinServer();
    }
}

// --- Simulation Logic ---

function handleRequest() {
    totalRequests++;
    const server = selectServer();

    if (!server) {
        errorCount++;
        return;
    }

    server.activeRequests++;

    // Simulate Network + Processing Delay
    // Latency = Base + Added + Load Penalty (Simulating queueing)
    // Queueing delay approx proportional to active requests
    const loadPenalty = server.activeRequests * 10;
    const latency = server.baseLatency + server.addedLatency + loadPenalty;

    // Simulate async processing
    setTimeout(() => {
        completeRequest(server, latency);
    }, latency);
}

function completeRequest(server, latency) {
    if (server.isDown) {
        // Request failed if server went down during processing
        errorCount++;
        server.activeRequests--;
        return;
    }

    server.activeRequests--;
    completedRequests++;
    totalLatency += latency;

    // Update Adaptive Metrics (Exponential Moving Average)
    server.avgResponseTime = (1 - ALPHA) * server.avgResponseTime + ALPHA * latency;
}

function tick() {
    // Send state update to UI
    const avgLatency = completedRequests > 0 ? totalLatency / completedRequests : 0;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    self.postMessage({
        type: 'update',
        payload: {
            servers: servers.map(s => ({
                id: s.id,
                name: s.name,
                activeRequests: s.activeRequests,
                avgResponseTime: s.avgResponseTime,
                isDown: s.isDown,
                addedLatency: s.addedLatency
            })),
            stats: {
                totalRequests,
                avgLatency,
                errorRate
            }
        }
    });
}

function startRequestGeneration() {
    if (requestInterval) clearInterval(requestInterval);
    const intervalMs = 1000 / config.requestRate;
    requestInterval = setInterval(handleRequest, intervalMs);
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            initServers();
            break;

        case 'start':
            if (!isRunning) {
                config = { ...config, ...payload };
                isRunning = true;
                startRequestGeneration();
                simulationInterval = setInterval(tick, 100); // 10 FPS update
            }
            break;

        case 'stop':
            isRunning = false;
            if (requestInterval) clearInterval(requestInterval);
            if (simulationInterval) clearInterval(simulationInterval);
            break;

        case 'updateConfig':
            config = { ...config, ...payload };
            if (isRunning && payload.requestRate) {
                startRequestGeneration();
            }
            break;

        case 'updateServer':
            // Payload: { id, addedLatency, isDown }
            const server = servers.find(s => s.id === payload.id);
            if (server) {
                if (payload.addedLatency !== undefined) server.addedLatency = payload.addedLatency;
                if (payload.isDown !== undefined) server.isDown = payload.isDown;
            }
            break;

        case 'reset':
            isRunning = false;
            if (requestInterval) clearInterval(requestInterval);
            if (simulationInterval) clearInterval(simulationInterval);
            initServers();
            totalRequests = 0;
            totalLatency = 0;
            completedRequests = 0;
            errorCount = 0;
            tick(); // Send empty state
            break;
    }
};

initServers(); // Initialize on load
