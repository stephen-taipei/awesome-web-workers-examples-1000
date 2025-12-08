self.onmessage = function(e) {
    const { id, duration } = e.data;
    const start = performance.now();

    // Simulate heavy work
    while (performance.now() - start < duration) {
        // Busy wait
        Math.random();
    }

    self.postMessage({ id, status: 'completed', duration });
};
