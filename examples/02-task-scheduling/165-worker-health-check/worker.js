/* worker.js */
self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'ping') {
        // Respond to heartbeat
        self.postMessage({ type: 'pong', timestamp: Date.now() });
    } else if (type === 'simulate_freeze') {
        // Simulate a frozen worker (infinite loop or long task)
        const duration = payload.duration || 5000;
        const start = Date.now();
        while (Date.now() - start < duration) {
            // Busy wait to block the event loop
        }
        self.postMessage({ type: 'unfrozen', message: 'I am back!' });
    } else if (type === 'simulate_crash') {
        // Simulate a crash (throw error)
        throw new Error("Simulated crash!");
    }
};
