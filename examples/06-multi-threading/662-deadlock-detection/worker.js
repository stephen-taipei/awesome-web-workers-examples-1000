/**
 * #662 Deadlock Detection Worker
 * Detect circular waits
 */
self.onmessage = function(e) {
    if (e.data.type === 'start') {
        runDemo();
    }
};

function runDemo() {
    self.postMessage({ type: 'status', status: 'Running', progress: 0 });
    self.postMessage({ type: 'log', message: 'Worker started' });
    
    // Simulate work
    for (let i = 0; i <= 10; i++) {
        const start = performance.now();
        while (performance.now() - start < 100) {} // 100ms work
        
        self.postMessage({ type: 'status', status: 'Processing', progress: i * 10 });
        self.postMessage({ type: 'log', message: 'Step ' + i + ' complete' });
    }
    
    self.postMessage({ type: 'status', status: 'Complete', progress: 100 });
    self.postMessage({ type: 'complete' });
}