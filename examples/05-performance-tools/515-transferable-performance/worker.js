self.onmessage = function(e) {
    // Just receive and acknowledge
    // If transferring back is needed, we would do:
    // self.postMessage(e.data, [e.data]);

    // For this benchmark, we just measure time to send *to* worker and get a simple ack.
    // The cloning/transfer cost happens on the sender side mostly (for transfer setup) and receiver side (for deserialization).
    self.postMessage('done');
};
