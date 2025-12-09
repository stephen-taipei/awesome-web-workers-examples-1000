// Condition Variable - Web Worker

// SharedArrayBuffer layout:
// [0]: mutex (0=unlocked, 1=locked)
// [1]: notEmpty condition (for consumers to wait)
// [2]: notFull condition (for producers to wait)
// [3]: count (items in buffer)
// [4]: head (read index)
// [5]: tail (write index)
// [6]: total produced
// [7]: total consumed
// [8+]: buffer data
const MUTEX = 0;
const NOT_EMPTY = 1;
const NOT_FULL = 2;
const COUNT = 3;
const HEAD = 4;
const TAIL = 5;
const TOTAL_PRODUCED = 6;
const TOTAL_CONSUMED = 7;
const BUFFER_START = 8;

let sharedArray = null;
let bufferSize = 0;
let workerId = '';
let producersDone = false;
let totalItemsToConsume = 0;

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'producersDone') {
        producersDone = true;
        totalItemsToConsume = data.totalItems;
        return;
    }

    sharedArray = new Int32Array(data.buffer);
    bufferSize = data.bufferSize;
    workerId = data.workerId;

    if (data.type === 'producer') {
        runProducer(data.items, data.delay, data.producerId);
    } else if (data.type === 'consumer') {
        runConsumer(data.delay, data.consumerId);
    }
};

function runProducer(items, delay, producerId) {
    let produced = 0;

    for (let i = 0; i < items; i++) {
        const waitStart = performance.now();

        // Acquire mutex
        acquireMutex();

        // Wait while buffer is full
        while (Atomics.load(sharedArray, COUNT) >= bufferSize) {
            releaseMutex();

            self.postMessage({
                type: 'log',
                message: 'Buffer full, waiting...',
                state: 'waiting'
            });
            self.postMessage({ type: 'bufferFull' });

            // Wait on NOT_FULL condition
            Atomics.wait(sharedArray, NOT_FULL, 0);

            acquireMutex();
        }

        const waitTime = performance.now() - waitStart;

        self.postMessage({
            type: 'log',
            message: 'Producing...',
            state: 'producing'
        });

        // Produce item
        const tail = Atomics.load(sharedArray, TAIL);
        const item = producerId * 1000 + i + 1; // Unique item ID
        Atomics.store(sharedArray, BUFFER_START + tail, item);

        // Update tail and count
        Atomics.store(sharedArray, TAIL, (tail + 1) % bufferSize);
        Atomics.add(sharedArray, COUNT, 1);
        Atomics.add(sharedArray, TOTAL_PRODUCED, 1);

        const count = Atomics.load(sharedArray, COUNT);

        self.postMessage({
            type: 'bufferState',
            count
        });

        // Signal consumers (buffer not empty)
        Atomics.store(sharedArray, NOT_EMPTY, 1);
        Atomics.notify(sharedArray, NOT_EMPTY);

        releaseMutex();

        self.postMessage({
            type: 'log',
            message: `Produced item ${item} (buffer: ${count}/${bufferSize})`,
            state: 'idle'
        });

        self.postMessage({
            type: 'produced',
            item,
            waitTime
        });

        produced++;

        // Simulate production delay
        busyWait(delay + Math.random() * delay * 0.5);
    }

    self.postMessage({
        type: 'complete',
        operations: produced
    });
}

function runConsumer(delay, consumerId) {
    let consumed = 0;

    while (true) {
        const waitStart = performance.now();

        // Acquire mutex
        acquireMutex();

        // Wait while buffer is empty
        while (Atomics.load(sharedArray, COUNT) === 0) {
            // Check if all items have been consumed
            const totalConsumed = Atomics.load(sharedArray, TOTAL_CONSUMED);
            const totalProduced = Atomics.load(sharedArray, TOTAL_PRODUCED);

            if (producersDone && totalConsumed >= totalItemsToConsume) {
                releaseMutex();
                self.postMessage({
                    type: 'complete',
                    operations: consumed
                });
                return;
            }

            if (producersDone && totalProduced === totalConsumed && Atomics.load(sharedArray, COUNT) === 0) {
                releaseMutex();
                self.postMessage({
                    type: 'complete',
                    operations: consumed
                });
                return;
            }

            releaseMutex();

            self.postMessage({
                type: 'log',
                message: 'Buffer empty, waiting...',
                state: 'waiting'
            });
            self.postMessage({ type: 'bufferEmpty' });

            // Wait on NOT_EMPTY condition with timeout
            const result = Atomics.wait(sharedArray, NOT_EMPTY, 0, 500);

            acquireMutex();

            // Check again after wait
            if (producersDone && Atomics.load(sharedArray, COUNT) === 0) {
                releaseMutex();
                self.postMessage({
                    type: 'complete',
                    operations: consumed
                });
                return;
            }
        }

        const waitTime = performance.now() - waitStart;

        self.postMessage({
            type: 'log',
            message: 'Consuming...',
            state: 'consuming'
        });

        // Consume item
        const head = Atomics.load(sharedArray, HEAD);
        const item = Atomics.load(sharedArray, BUFFER_START + head);
        Atomics.store(sharedArray, BUFFER_START + head, 0);

        // Update head and count
        Atomics.store(sharedArray, HEAD, (head + 1) % bufferSize);
        Atomics.sub(sharedArray, COUNT, 1);
        Atomics.add(sharedArray, TOTAL_CONSUMED, 1);

        const count = Atomics.load(sharedArray, COUNT);

        self.postMessage({
            type: 'bufferState',
            count
        });

        // Signal producers (buffer not full)
        Atomics.store(sharedArray, NOT_FULL, 1);
        Atomics.notify(sharedArray, NOT_FULL);

        releaseMutex();

        self.postMessage({
            type: 'log',
            message: `Consumed item ${item} (buffer: ${count}/${bufferSize})`,
            state: 'idle'
        });

        self.postMessage({
            type: 'consumed',
            item,
            waitTime
        });

        consumed++;

        // Simulate consumption delay
        busyWait(delay + Math.random() * delay * 0.5);
    }
}

function acquireMutex() {
    while (true) {
        const old = Atomics.compareExchange(sharedArray, MUTEX, 0, 1);
        if (old === 0) {
            return; // Acquired
        }
        // Spin wait
        Atomics.wait(sharedArray, MUTEX, 1, 1);
    }
}

function releaseMutex() {
    Atomics.store(sharedArray, MUTEX, 0);
    Atomics.notify(sharedArray, MUTEX);
}

function busyWait(ms) {
    const start = performance.now();
    while (performance.now() - start < ms) {
        // Busy wait
    }
}
