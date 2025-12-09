self.onmessage = function(e) {
    const { id, duration, originWorkerId } = e.data;
    const start = performance.now();

    // Simulate work
    while (performance.now() - start < duration) {
        Math.random();
    }

    self.postMessage({ id, status: 'completed', originWorkerId });
};
