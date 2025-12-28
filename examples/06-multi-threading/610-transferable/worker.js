/**
 * #610 Transferable Objects Worker
 * Processes transferred and cloned data
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const receiveTime = performance.now();

    switch (type) {
        case 'process-clone':
            processData(data, receiveTime, 'clone-result');
            break;

        case 'process-transfer':
            processData(data, receiveTime, 'transfer-result');
            break;
    }
};

function processData(data, receiveTime, resultType) {
    const transferTime = receiveTime - data.sendTime;
    const processStart = performance.now();

    // Simulate some processing on the data
    const view = new Uint8Array(data.buffer);
    let checksum = 0;
    const step = Math.max(1, Math.floor(view.length / 10000));

    for (let i = 0; i < view.length; i += step) {
        checksum += view[i];
    }

    const processEnd = performance.now();

    self.postMessage({
        type: resultType,
        data: {
            size: data.buffer.byteLength,
            transferTime,
            processTime: processEnd - processStart,
            checksum
        }
    });

    self.postMessage({ type: 'ready' });
}
