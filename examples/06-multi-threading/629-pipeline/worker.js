/**
 * #629 Pipeline Worker
 */
self.onmessage = function(e) {
    const { value, operation } = e.data;
    let result;
    switch (operation) {
        case 'double': result = value * 2; break;
        case 'square': result = value * value; break;
        case 'add100': result = value + 100; break;
        case 'half': result = value / 2; break;
        default: result = value;
    }
    // Simulate processing
    const start = performance.now();
    while (performance.now() - start < 300) {}
    self.postMessage({ result });
};
