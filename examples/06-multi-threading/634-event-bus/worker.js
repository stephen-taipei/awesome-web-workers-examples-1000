/**
 * #634 Event Bus Worker
 */
let id;

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        id = e.data.id;
    } else if (e.data.type === 'event') {
        self.postMessage({ type: 'log', message: `Received "${e.data.event}" from ${e.data.from}` });
    }
};
