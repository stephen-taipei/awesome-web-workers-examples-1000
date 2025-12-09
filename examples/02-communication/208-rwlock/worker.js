// Read-Write Lock (RWLock) - Web Worker

// SharedArrayBuffer layout:
// [0]: lock state (0=unlocked, >0=reader count, -1=writer)
// [1]: waiting writers count
// [2]: shared data value
// [3]: sequence counter
const LOCK_STATE = 0;
const WAITING_WRITERS = 1;
const SHARED_DATA = 2;
const SEQUENCE = 3;

let sharedArray = null;
let workerId = '';
let workerType = '';

self.onmessage = function(e) {
    const { type, workerId: id, buffer, operations, delay } = e.data;

    sharedArray = new Int32Array(buffer);
    workerId = id;
    workerType = type;

    if (type === 'reader') {
        runReader(operations, delay);
    } else if (type === 'writer') {
        runWriter(operations, delay);
    }
};

function runReader(operations, delay) {
    let completed = 0;

    for (let i = 0; i < operations; i++) {
        const waitStart = performance.now();

        // Acquire read lock
        postState('waiting');
        acquireReadLock();
        const waitTime = performance.now() - waitStart;

        postState('reading');
        self.postMessage({
            type: 'log',
            workerType: 'reader',
            message: `Acquired read lock`,
            state: 'reading'
        });

        // Read shared data
        const value = Atomics.load(sharedArray, SHARED_DATA);

        // Simulate read operation with delay
        busyWait(delay);

        // Report lock state
        const currentReaders = Atomics.load(sharedArray, LOCK_STATE);
        self.postMessage({
            type: 'lockState',
            state: 'reading',
            readers: currentReaders
        });

        // Release read lock
        releaseReadLock();

        postState('idle');
        self.postMessage({
            type: 'log',
            workerType: 'reader',
            message: `Read value: ${value}`,
            state: 'idle'
        });

        self.postMessage({
            type: 'read',
            value,
            waitTime
        });

        completed++;

        // Small delay between operations
        busyWait(Math.random() * 5);
    }

    self.postMessage({
        type: 'complete',
        workerType: 'reader',
        operations: completed
    });
}

function runWriter(operations, delay) {
    let completed = 0;

    for (let i = 0; i < operations; i++) {
        const waitStart = performance.now();

        // Acquire write lock
        postState('waiting');
        acquireWriteLock();
        const waitTime = performance.now() - waitStart;

        postState('writing');
        self.postMessage({
            type: 'log',
            workerType: 'writer',
            message: `Acquired write lock`,
            state: 'writing'
        });

        // Read current value
        const oldValue = Atomics.load(sharedArray, SHARED_DATA);

        // Simulate write operation with delay
        busyWait(delay);

        // Write new value (increment by random amount)
        const increment = Math.floor(Math.random() * 10) + 1;
        const newValue = oldValue + increment;
        Atomics.store(sharedArray, SHARED_DATA, newValue);

        // Update sequence counter
        Atomics.add(sharedArray, SEQUENCE, 1);

        // Report lock state
        self.postMessage({
            type: 'lockState',
            state: 'writing',
            readers: 0
        });

        // Release write lock
        releaseWriteLock();

        postState('idle');
        self.postMessage({
            type: 'log',
            workerType: 'writer',
            message: `Wrote value: ${oldValue} -> ${newValue}`,
            state: 'idle'
        });

        self.postMessage({
            type: 'write',
            oldValue,
            newValue,
            waitTime
        });

        completed++;

        // Longer delay between write operations
        busyWait(Math.random() * 20 + 10);
    }

    self.postMessage({
        type: 'complete',
        workerType: 'writer',
        operations: completed
    });
}

function acquireReadLock() {
    while (true) {
        // Wait if there's a writer or waiting writers (writer priority)
        let state = Atomics.load(sharedArray, LOCK_STATE);
        const waitingWriters = Atomics.load(sharedArray, WAITING_WRITERS);

        // If writer has lock or writers are waiting, wait
        if (state === -1 || waitingWriters > 0) {
            Atomics.wait(sharedArray, LOCK_STATE, state);
            continue;
        }

        // Try to increment reader count
        const oldState = Atomics.compareExchange(sharedArray, LOCK_STATE, state, state + 1);

        if (oldState === state) {
            // Successfully acquired read lock
            return;
        }
        // CAS failed, retry
    }
}

function releaseReadLock() {
    const newState = Atomics.sub(sharedArray, LOCK_STATE, 1);

    // If we were the last reader, notify waiting writers
    if (newState === 1) {
        Atomics.notify(sharedArray, LOCK_STATE);
    }
}

function acquireWriteLock() {
    // Indicate we're waiting
    Atomics.add(sharedArray, WAITING_WRITERS, 1);

    while (true) {
        // Try to acquire when state is 0 (unlocked)
        const oldState = Atomics.compareExchange(sharedArray, LOCK_STATE, 0, -1);

        if (oldState === 0) {
            // Successfully acquired write lock
            Atomics.sub(sharedArray, WAITING_WRITERS, 1);
            return;
        }

        // Wait for state to become 0
        Atomics.wait(sharedArray, LOCK_STATE, oldState);
    }
}

function releaseWriteLock() {
    // Release by setting state to 0
    Atomics.store(sharedArray, LOCK_STATE, 0);

    // Notify all waiting threads
    Atomics.notify(sharedArray, LOCK_STATE);
}

function postState(state) {
    self.postMessage({
        type: 'log',
        workerType: workerType,
        message: state === 'waiting' ? 'Waiting for lock...' :
                 state === 'reading' ? 'Reading...' :
                 state === 'writing' ? 'Writing...' : 'Idle',
        state: state
    });
}

function busyWait(ms) {
    const start = performance.now();
    while (performance.now() - start < ms) {
        // Busy wait
    }
}
