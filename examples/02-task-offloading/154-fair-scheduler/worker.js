self.onmessage = function(e) {
    const { id, userId, duration } = e.data;
    const start = performance.now();

    // Simulate work
    while (performance.now() - start < duration) {
        Math.random();
    }

    self.postMessage({ id, userId, status: 'completed', duration });
};
