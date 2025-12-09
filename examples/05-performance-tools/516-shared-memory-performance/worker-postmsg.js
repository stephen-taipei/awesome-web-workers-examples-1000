self.onmessage = function(e) {
    const { iterations } = e.data;
    let count = 0;

    // Simulate complex logic where we need to communicate back and forth?
    // Or just simulating the overhead of worker processing?
    // If we just loop here, it's fast.
    // The comparison is usually: Main Thread updates vs Worker updates visible to Main Thread.

    // For postMessage, to share state updates:
    // Worker: update -> postMessage -> Main: receive
    // This is extremely slow for 1M iterations.

    // So usually we batch. But SAB allows instant visibility.
    // Let's simulate a scenario: Worker does calculation, Main thread wants to see it.
    // In postMessage, we can't see it until posted.
    // To measure pure "throughput" of updates mechanism:

    // We will just loop and postMessage periodically?
    // Or simpler: The cost of just doing the work in isolation is the baseline.
    // Let's simulate "Worker needs to notify main thread of progress".

    // A fair comparison is hard because SAB doesn't notify.
    // SAB assumes Main Thread polls or just reads when needed.

    // Let's implement: Worker increments a counter `iterations` times.
    // In SAB case, it does `Atomics.add`.
    // In postMessage case, it does `count++`.
    // AND we send *one* message at the end for both to signal completion.

    // Wait, that just benchmarks `Atomics.add` vs `++`. `Atomics` is slower than raw var but faster than `postMessage`.

    // Let's try to simulate "Sync" overhead.
    // SAB: Worker increments. Main thread *could* read it anytime.
    // PostMsg: Worker increments. Worker *must* send it for Main to see.

    // Scenario: Worker increments counter N times.
    // For SAB, we use Atomics.add (thread-safe).
    // For local var, we use local var (not thread safe if shared, but here isolated).
    // The point is SAB allows sharing without copying.

    for (let i = 0; i < iterations; i++) {
        count++;
        // If we wanted Main thread to know about *every* change, we'd postMessage here.
        // self.postMessage(count); // This would crash browser for 1M.
    }

    self.postMessage('done');
};
