self.onmessage = function(e) {
    const { failureRate } = e.data;

    // Simulate processing time
    const start = Date.now();
    while (Date.now() - start < 500) {}

    // Random failure
    if (Math.random() < failureRate) {
        // We can simulate failure by sending an error message or throwing an error
        // Throwing error might be caught by onerror in main thread
        throw new Error("Random processing failure occurred!");
    } else {
        self.postMessage({ status: 'completed', result: "Task completed successfully!" });
    }
};
