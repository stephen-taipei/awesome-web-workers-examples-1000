self.onmessage = function(e) {
    const { type, data, id } = e.data;

    if (type === 'individual') {
        // Process single item
        const result = processItem(data);
        self.postMessage({ id, result });
    } else if (type === 'batch') {
        // Process batch of items
        const results = data.map(item => ({
            id: item.id,
            result: processItem(item.data)
        }));
        self.postMessage({ type: 'batchResult', results });
    }
};

function processItem(n) {
    // Simulate some work (e.g., calculating square root with some delay)
    const start = performance.now();
    while (performance.now() - start < 0.1) {
        // Busy wait to simulate CPU load
    }
    return Math.sqrt(n);
}
