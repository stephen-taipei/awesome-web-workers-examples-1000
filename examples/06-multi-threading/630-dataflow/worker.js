/**
 * #630 Dataflow Worker
 */
self.onmessage = function(e) {
    const { op, inputs } = e.data;
    let result;
    switch (op) {
        case 'add': result = inputs[0] + inputs[1]; break;
        case 'multiply': result = inputs[0] * inputs[1]; break;
        case 'double': result = inputs[0] * 2; break;
        default: result = inputs[0];
    }
    const start = performance.now();
    while (performance.now() - start < 300) {}
    self.postMessage({ result });
};
