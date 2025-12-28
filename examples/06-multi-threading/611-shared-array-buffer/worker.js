/**
 * #611 SharedArrayBuffer Worker
 * Worker with shared memory access
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

        case 'write':
            if (sharedArray) {
                sharedArray[data.index] = data.value;
                self.postMessage({
                    type: 'wrote',
                    data: { index: data.index, value: data.value }
                });
            }
            break;

        case 'read':
            if (sharedArray) {
                let sum = 0;
                for (let i = 0; i < sharedArray.length; i++) {
                    sum += sharedArray[i];
                }
                self.postMessage({
                    type: 'read',
                    data: { sum }
                });
            }
            break;
    }
};
