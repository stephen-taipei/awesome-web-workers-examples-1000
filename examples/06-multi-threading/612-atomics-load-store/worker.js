/**
 * #612 Atomics Load/Store Worker
 * Worker using Atomics for thread-safe operations
 */

let workerId = null;
let sharedArray = null;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            sharedArray = new Int32Array(data.buffer);
            self.postMessage({ type: 'ready' });
            break;

        case 'load':
            if (sharedArray) {
                const value = Atomics.load(sharedArray, 0);
                self.postMessage({
                    type: 'loaded',
                    data: { value }
                });
            }
            break;

        case 'store':
            if (sharedArray) {
                Atomics.store(sharedArray, 0, data.value);
                self.postMessage({
                    type: 'stored',
                    data: { value: data.value }
                });
            }
            break;

        case 'increment-many':
            if (sharedArray) {
                // Use Atomics.add for thread-safe increment
                for (let i = 0; i < data.count; i++) {
                    Atomics.add(sharedArray, 0, 1);
                }
                self.postMessage({
                    type: 'increment-done',
                    data: { count: data.count }
                });
            }
            break;
    }
};
