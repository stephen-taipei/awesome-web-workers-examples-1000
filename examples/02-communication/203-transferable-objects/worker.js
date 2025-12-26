/**
 * Transferable Objects Worker
 * Demonstrates zero-copy transfer vs structured clone
 */

self.onmessage = function(e) {
    const { type, payload, transferList } = e.data;

    switch (type) {
        case 'COPY_TEST':
            handleCopyTest(payload);
            break;

        case 'TRANSFER_TEST':
            handleTransferTest(payload);
            break;

        case 'RECEIVE_BUFFER':
            handleReceiveBuffer(payload);
            break;

        case 'PROCESS_AND_RETURN':
            handleProcessAndReturn(payload);
            break;
    }
};

function handleCopyTest(data) {
    const startTime = performance.now();

    // Simulate some processing on the copied data
    const buffer = data.buffer;
    const view = new Uint8Array(buffer);

    // Simple processing: sum of bytes
    let sum = 0;
    for (let i = 0; i < Math.min(view.length, 10000); i++) {
        sum += view[i];
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'COPY_RESULT',
        payload: {
            time: endTime - startTime,
            byteLength: buffer.byteLength,
            checksum: sum
        }
    });
}

function handleTransferTest(buffer) {
    const startTime = performance.now();

    // Same processing on transferred data
    const view = new Uint8Array(buffer);

    let sum = 0;
    for (let i = 0; i < Math.min(view.length, 10000); i++) {
        sum += view[i];
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'TRANSFER_RESULT',
        payload: {
            time: endTime - startTime,
            byteLength: buffer.byteLength,
            checksum: sum
        }
    });
}

function handleReceiveBuffer(buffer) {
    const view = new Uint8Array(buffer);

    self.postMessage({
        type: 'BUFFER_RECEIVED',
        payload: {
            byteLength: buffer.byteLength,
            firstBytes: Array.from(view.slice(0, 10)),
            isDetached: buffer.byteLength === 0
        }
    });
}

function handleProcessAndReturn(buffer) {
    const view = new Uint8Array(buffer);

    // Process: double each byte value (with wrap-around)
    for (let i = 0; i < view.length; i++) {
        view[i] = (view[i] * 2) % 256;
    }

    // Transfer back to main thread
    self.postMessage({
        type: 'PROCESSED_BUFFER',
        payload: buffer
    }, [buffer]);
}

// Notify ready
self.postMessage({ type: 'WORKER_READY' });
