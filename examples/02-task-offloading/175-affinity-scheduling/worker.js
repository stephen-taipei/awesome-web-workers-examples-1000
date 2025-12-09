// Worker Thread

self.onmessage = async function(e) {
    const { taskId, dataset, loadTime, processTime } = e.data;

    // Simulate Loading Data (Cache Miss penalty)
    if (loadTime > 0) {
        await sleep(loadTime);
    }

    // Notify main thread we are processing now
    self.postMessage({ type: 'processing', taskId });

    // Simulate Processing
    await sleep(processTime);

    self.postMessage({ type: 'complete', taskId });
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
