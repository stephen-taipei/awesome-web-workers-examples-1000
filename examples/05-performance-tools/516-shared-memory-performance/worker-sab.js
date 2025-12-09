self.onmessage = function(e) {
    const { iterations, sab } = e.data;
    const view = new Int32Array(sab);

    // With SharedArrayBuffer, we can use Atomics to safely increment.
    // This allows the main thread to read the value *while* we are working (polling).
    // This is much faster than postMessage if we needed shared state.

    for (let i = 0; i < iterations; i++) {
        // Atomics.add is slower than local ++, but faster than postMessage roundtrip.
        // It ensures thread safety.
        Atomics.add(view, 0, 1);
    }

    self.postMessage('done');
};
