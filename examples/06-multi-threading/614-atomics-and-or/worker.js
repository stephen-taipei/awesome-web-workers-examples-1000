/**
 * #614 Atomics AND/OR Worker
 * Worker performing atomic bitwise operations
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

        case 'and':
            Atomics.and(sharedArray, 0, data.mask);
            self.postMessage({ type: 'and-done' });
            break;

        case 'or':
            Atomics.or(sharedArray, 0, data.mask);
            self.postMessage({ type: 'or-done' });
            break;

        case 'xor':
            Atomics.xor(sharedArray, 0, data.mask);
            self.postMessage({ type: 'xor-done' });
            break;
    }
};
