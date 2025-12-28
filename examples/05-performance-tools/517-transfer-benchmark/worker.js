/**
 * #517 Transfer Benchmark - Worker Thread
 */
self.onmessage = function(e) {
    // Just acknowledge receipt
    self.postMessage({ type: 'DONE', size: e.data.buffer ? e.data.buffer.byteLength : 0 });
};
