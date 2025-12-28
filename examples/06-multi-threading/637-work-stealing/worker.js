/**
 * #637 Work Stealing Worker
 */
self.onmessage = function(e) {
    if (e.data.type === 'process') {
        const start = performance.now();
        while (performance.now() - start < 50 + Math.random() * 100) {}
        self.postMessage({ type: 'done', task: e.data.task, stolen: e.data.stolen });
    }
};
