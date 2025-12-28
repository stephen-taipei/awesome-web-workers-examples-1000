/**
 * #628 Scatter-Gather Worker
 */
self.onmessage = function(e) {
    const { data } = e.data;
    const sum = data.reduce((a, b) => a + b, 0);
    const max = Math.max(...data);
    // Simulate processing time
    const start = performance.now();
    while (performance.now() - start < 200 + Math.random() * 300) {}
    self.postMessage({ sum, max });
};
