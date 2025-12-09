self.onmessage = function(e) {
    const { command, duration } = e.data;

    if (command === 'start') {
        const startTime = performance.now();
        let count = 0;
        let num = 2;
        let shouldStop = false;

        // Listen for stop during execution?
        // JS is single threaded event loop. We can't listen while in a while loop.
        // We have to batch processing or just check time.

        // We'll check time every N iterations to stay responsive to stop message?
        // Actually, if we loop for 'duration', we can't receive 'stop' message until done.
        // So we should loop in chunks.

        // However, for CPU benchmark, we want max utilization.
        // Checking time performance.now() is somewhat expensive if done too often.

        function runBatch() {
            const batchStart = performance.now();
            while (performance.now() - batchStart < 15) { // 15ms block
                if (isPrime(num)) count++;
                num++;
            }

            if (performance.now() - startTime < duration) {
                // Continue
                // Check for pending messages? We can't explicitly peek.
                // We use setTimeout 0 to yield to event loop to process 'stop' message?
                // But setTimeout(0) adds overhead and reduces CPU load measurement accuracy (idle time).

                // For a pure CPU benchmark, we usually lock the thread.
                // But user wants "Stop" button to work.
                // Compromise: postMessage updates?

                // Let's just lock the thread for the duration for max performance,
                // but that freezes the worker's message queue.
                // The 'stop' message won't be processed until the loop finishes.

                // If we want it interruptible, we must use `setTimeout` or `Promise` yielding.
                setTimeout(runBatch, 0);
            } else {
                self.postMessage({ count });
            }
        }

        // Alternative: Synchronous loop for X ms, checking time.
        // If we want to support 'stop' message immediately, we can't.
        // But the main thread handles the 'stop' button by just ignoring result or terminating worker.
        // Terminating worker is the best way to stop a CPU intensive task from main thread.
        // So we don't need to yield.

        const end = startTime + duration;
        while (performance.now() < end) {
            if (isPrime(num)) count++;
            num++;
        }
        self.postMessage({ count });
    }
};

function isPrime(n) {
    for (let i = 2, s = Math.sqrt(n); i <= s; i++)
        if (n % i === 0) return false;
    return n > 1;
}
