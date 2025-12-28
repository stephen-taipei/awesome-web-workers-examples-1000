/**
 * #639 Data Parallelism Worker
 */
self.onmessage = function(e) {
    const start = performance.now();
    const sum = e.data.data.reduce((a, b) => a + Math.sqrt(b), 0);
    self.postMessage({ sum, time: (performance.now() - start).toFixed(0) });
};
