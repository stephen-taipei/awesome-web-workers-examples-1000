/**
 * #516 Worker Benchmark - Worker Thread
 */
self.onmessage = function(e) {
    if (e.data.type === 'ECHO') {
        self.postMessage({ type: 'ECHO', data: e.data.data });
    }
};
