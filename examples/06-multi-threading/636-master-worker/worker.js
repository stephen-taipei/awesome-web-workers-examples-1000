/**
 * #636 Master-Worker Worker
 */
let id;

self.onmessage = function(e) {
    if (e.data.type === 'init') {
        id = e.data.id;
    } else if (e.data.type === 'task') {
        const result = processTask(e.data.task);
        self.postMessage({ taskId: e.data.task.id, result });
    }
};

function processTask(task) {
    const start = performance.now();
    while (performance.now() - start < 100 + Math.random() * 200) {}
    return task.data * 2;
}
