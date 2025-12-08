self.onmessage = function(e) {
    const { id, priority, duration } = e.data;
    const start = performance.now();

    // Simulate work
    while (performance.now() - start < duration) {
        Math.random();
    }

    self.postMessage({ id, priority, status: 'completed', duration });
};
