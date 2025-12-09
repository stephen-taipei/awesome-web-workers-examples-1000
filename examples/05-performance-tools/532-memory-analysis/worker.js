let timerId;
let memoryHog = [];

self.onmessage = function(e) {
    const { action } = e.data;

    if (action === 'start') {
        startMonitoring();
    } else if (action === 'stop') {
        stopMonitoring();
    } else if (action === 'alloc') {
        allocateMemory();
    } else if (action === 'clear') {
        clearMemory();
    }
};

function startMonitoring() {
    stopMonitoring();
    timerId = setInterval(() => {
        let usedMB = 0;

        if (self.performance && self.performance.memory) {
            usedMB = self.performance.memory.usedJSHeapSize / (1024 * 1024);
        } else {
            // Fallback simulation for non-Chrome browsers
            usedMB = 10 + memoryHog.length * 5; // Rough estimate
        }

        self.postMessage({ type: 'tick', usedMB });
    }, 500);
}

function stopMonitoring() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}

function allocateMemory() {
    // Allocate ~50MB (5M * 8 bytes roughly, but objects overhead varies)
    // Int32Array is compact: 12.5M ints = 50MB
    const chunk = new Int32Array(12.5 * 1024 * 1024);
    // Fill to prevent lazy allocation optimization
    for(let i=0; i<chunk.length; i+=1000) chunk[i] = i;
    memoryHog.push(chunk);
}

function clearMemory() {
    memoryHog = [];
}
