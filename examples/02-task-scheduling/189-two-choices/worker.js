// Two Choices Simulation Worker

const SERVER_COUNT = 50;
let servers = []; // Array of { id, load, tasks: [] }
let isRunning = false;
let config = {
    algorithm: 'random', // 'random' or 'powerOfTwo'
    arrivalRate: 50, // ms between tasks
    taskDuration: 500 // average task duration ms
};
let simulationInterval = null;
let lastTick = 0;

function initServers() {
    servers = [];
    for (let i = 0; i < SERVER_COUNT; i++) {
        servers.push({
            id: i,
            load: 0,
            tasks: [] // Array of remaining durations
        });
    }
}

// Helper: Get random server index
function getRandomServerIndex() {
    return Math.floor(Math.random() * SERVER_COUNT);
}

// Algorithm: Random Choice
function assignTaskRandom(taskDuration) {
    const serverIndex = getRandomServerIndex();
    servers[serverIndex].tasks.push(taskDuration);
    servers[serverIndex].load++;
}

// Algorithm: Power of Two Choices
function assignTaskPowerOfTwo(taskDuration) {
    const idx1 = getRandomServerIndex();
    const idx2 = getRandomServerIndex();

    // Pick the one with lower load
    const server1 = servers[idx1];
    const server2 = servers[idx2];

    if (server1.load <= server2.load) {
        server1.tasks.push(taskDuration);
        server1.load++;
    } else {
        server2.tasks.push(taskDuration);
        server2.load++;
    }
}

function tick() {
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;

    // Process tasks on servers
    servers.forEach(server => {
        if (server.load > 0) {
            // Process tasks
            // Simple simulation: decrement duration of the first task
            // or we could decrement all running tasks if we assume parallelism per server.
            // Let's assume single-threaded servers for simplicity: one task at a time.

            if (server.tasks.length > 0) {
                 server.tasks[0] -= dt;
                 if (server.tasks[0] <= 0) {
                     server.tasks.shift();
                     server.load--;
                 }
            }
        }
    });

    // Send status update
    // We only send basic stats to avoid overhead
    const loads = servers.map(s => s.load);
    const maxLoad = Math.max(...loads);
    const totalLoad = loads.reduce((a, b) => a + b, 0);
    const avgLoad = totalLoad / SERVER_COUNT;

    // Variance
    const variance = loads.reduce((sum, val) => sum + Math.pow(val - avgLoad, 2), 0) / SERVER_COUNT;

    self.postMessage({
        type: 'update',
        payload: {
            loads,
            maxLoad,
            avgLoad,
            variance
        }
    });
}

function generateTaskLoop() {
    if (!isRunning) return;

    // Generate a task
    // Duration varies slightly (+- 20%)
    const variance = config.taskDuration * 0.2;
    const duration = config.taskDuration + (Math.random() * variance * 2 - variance);

    if (config.algorithm === 'random') {
        assignTaskRandom(duration);
    } else {
        assignTaskPowerOfTwo(duration);
    }

    // Schedule next task
    // Poisson process approximation: exponential distribution for inter-arrival time?
    // For simplicity, we use fixed rate with slight jitter
    const nextTaskDelay = config.arrivalRate * (0.5 + Math.random());
    setTimeout(generateTaskLoop, nextTaskDelay);
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'start':
            if (!isRunning) {
                config = { ...config, ...payload };
                initServers();
                isRunning = true;
                lastTick = performance.now();

                // Start simulation loop (server processing)
                if (simulationInterval) clearInterval(simulationInterval);
                simulationInterval = setInterval(tick, 50); // 20 FPS update rate

                // Start task generation
                generateTaskLoop();
            }
            break;

        case 'stop':
            isRunning = false;
            if (simulationInterval) clearInterval(simulationInterval);
            break;

        case 'updateConfig':
            config = { ...config, ...payload };
            break;

        case 'reset':
             isRunning = false;
             if (simulationInterval) clearInterval(simulationInterval);
             initServers();
             self.postMessage({
                type: 'update',
                payload: {
                    loads: new Array(SERVER_COUNT).fill(0),
                    maxLoad: 0,
                    avgLoad: 0,
                    variance: 0
                }
            });
            break;
    }
};
