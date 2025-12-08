// Atomics Operations - Worker Thread

let sharedArray = null;
let workerId = -1;

self.onmessage = function(e) {
    const { type, sharedBuffer } = e.data;

    if (type === 'start') {
        workerId = e.data.workerId;

        // Create typed array view on shared buffer
        sharedArray = new Int32Array(sharedBuffer);

        runTests(e.data.incrementCount, e.data.operationType);
    }
};

function runTests(incrementCount, operationType) {
    const startTime = performance.now();

    if (operationType === 'regular' || operationType === 'both') {
        runRegularTest(incrementCount);
    }

    if (operationType === 'atomic' || operationType === 'both') {
        runAtomicTest(incrementCount);
    }
}

function runRegularTest(incrementCount) {
    const startTime = performance.now();
    let operations = 0;

    for (let i = 0; i < incrementCount; i++) {
        // Regular (non-atomic) increment - prone to race conditions
        // This is a read-modify-write operation that can be interrupted
        const current = sharedArray[0];
        sharedArray[0] = current + 1;
        operations++;

        // Report event periodically (sampled to reduce overhead)
        if (i % 1000 === 0) {
            self.postMessage({
                type: 'event',
                workerId,
                testType: 'regular',
                eventTime: performance.now() - startTime,
                value: sharedArray[0]
            });
        }

        // Progress update
        if (i % 5000 === 0) {
            self.postMessage({
                type: 'progress',
                workerId,
                testType: 'regular',
                currentCount: i
            });
        }
    }

    self.postMessage({
        type: 'complete',
        workerId,
        testType: 'regular',
        time: performance.now() - startTime,
        operations
    });
}

function runAtomicTest(incrementCount) {
    const startTime = performance.now();
    let operations = 0;

    for (let i = 0; i < incrementCount; i++) {
        // Atomic increment - thread-safe, no race conditions
        // Atomics.add returns the old value and atomically adds
        Atomics.add(sharedArray, 1, 1);
        operations++;

        // Report event periodically
        if (i % 1000 === 0) {
            self.postMessage({
                type: 'event',
                workerId,
                testType: 'atomic',
                eventTime: performance.now() - startTime,
                value: Atomics.load(sharedArray, 1)
            });
        }

        // Progress update
        if (i % 5000 === 0) {
            self.postMessage({
                type: 'progress',
                workerId,
                testType: 'atomic',
                currentCount: i
            });
        }
    }

    self.postMessage({
        type: 'complete',
        workerId,
        testType: 'atomic',
        time: performance.now() - startTime,
        operations
    });
}

// Demonstration of other Atomics operations
function demonstrateAtomicsOperations() {
    // These are examples of other Atomics operations

    // Atomics.load - Read value atomically
    const value = Atomics.load(sharedArray, 0);

    // Atomics.store - Write value atomically
    Atomics.store(sharedArray, 0, 100);

    // Atomics.add - Add and return old value
    const oldVal = Atomics.add(sharedArray, 0, 10); // oldVal = 100, array[0] = 110

    // Atomics.sub - Subtract and return old value
    const oldVal2 = Atomics.sub(sharedArray, 0, 5); // oldVal2 = 110, array[0] = 105

    // Atomics.and - Bitwise AND
    Atomics.and(sharedArray, 0, 0xFF); // array[0] &= 255

    // Atomics.or - Bitwise OR
    Atomics.or(sharedArray, 0, 0x100); // array[0] |= 256

    // Atomics.xor - Bitwise XOR
    Atomics.xor(sharedArray, 0, 0x55); // array[0] ^= 85

    // Atomics.exchange - Set new value, return old
    const exchanged = Atomics.exchange(sharedArray, 0, 999);

    // Atomics.compareExchange - CAS operation
    // Only sets if current value equals expected
    const result = Atomics.compareExchange(sharedArray, 0, 999, 1000);
    // If array[0] was 999, it becomes 1000; returns the value that was there
}

// Example: Implementing a simple spinlock using Atomics
function spinlockAcquire(lockArray, lockIndex) {
    // Keep trying until we successfully set 0 -> 1
    while (Atomics.compareExchange(lockArray, lockIndex, 0, 1) !== 0) {
        // Spin - in real code you might add a delay or use Atomics.wait
    }
}

function spinlockRelease(lockArray, lockIndex) {
    Atomics.store(lockArray, lockIndex, 0);
}

// Example: Using wait/notify for synchronization
function waitForSignal(signalArray, signalIndex) {
    // Block until the value at signalIndex is not 0
    const result = Atomics.wait(signalArray, signalIndex, 0);
    // result can be 'ok', 'not-equal', or 'timed-out'
    return result;
}

function sendSignal(signalArray, signalIndex) {
    // Set the signal
    Atomics.store(signalArray, signalIndex, 1);
    // Wake up one waiting thread
    Atomics.notify(signalArray, signalIndex, 1);
}
