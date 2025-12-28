/**
 * #619 Read-Write Lock Worker
 * Worker with read/write lock capability
 */

let workerId = null;
let workerType = null;
let sharedArray = null;

const READER_COUNT = 0;
const WRITER_FLAG = 1;
const SHARED_VALUE = 2;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            workerType = data.workerType;
            sharedArray = new Int32Array(data.buffer);
            break;

        case 'start':
            if (workerType === 'reader') {
                performRead();
            } else {
                performWrite();
            }
            break;
    }
};

function acquireReadLock() {
    while (true) {
        // Wait while there's a writer
        while (Atomics.load(sharedArray, WRITER_FLAG) !== 0) {
            // Spin wait
        }

        // Increment reader count
        Atomics.add(sharedArray, READER_COUNT, 1);

        // Check if a writer came in
        if (Atomics.load(sharedArray, WRITER_FLAG) === 0) {
            // Successfully acquired read lock
            return;
        }

        // Writer came in, back off
        Atomics.sub(sharedArray, READER_COUNT, 1);
    }
}

function releaseReadLock() {
    Atomics.sub(sharedArray, READER_COUNT, 1);
}

function acquireWriteLock() {
    // First, set writer flag (spin until we can)
    while (Atomics.compareExchange(sharedArray, WRITER_FLAG, 0, 1) !== 0) {
        // Spin wait for other writers
    }

    // Now wait for all readers to finish
    while (Atomics.load(sharedArray, READER_COUNT) !== 0) {
        // Spin wait for readers
    }
}

function releaseWriteLock() {
    Atomics.store(sharedArray, WRITER_FLAG, 0);
}

function performRead() {
    self.postMessage({ type: 'waiting' });

    acquireReadLock();

    // Read the value
    const value = Atomics.load(sharedArray, SHARED_VALUE);
    self.postMessage({ type: 'reading', data: { value } });

    // Simulate reading time
    const readTime = 200 + Math.random() * 500;
    const start = performance.now();
    while (performance.now() - start < readTime) {}

    releaseReadLock();
    self.postMessage({ type: 'done' });
}

function performWrite() {
    self.postMessage({ type: 'waiting' });

    acquireWriteLock();

    // Write a new value
    const newValue = Atomics.add(sharedArray, SHARED_VALUE, 1) + 1;
    self.postMessage({ type: 'writing', data: { value: newValue } });

    // Simulate writing time (longer than read)
    const writeTime = 500 + Math.random() * 1000;
    const start = performance.now();
    while (performance.now() - start < writeTime) {}

    releaseWriteLock();
    self.postMessage({ type: 'done' });
}
